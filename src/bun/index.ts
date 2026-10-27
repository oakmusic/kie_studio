import { BrowserWindow, Utils } from 'electrobun/bun'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import seedCatalog from '../../src/data/catalog.json' with { type: 'json' }
import { shouldReseedCatalog } from '../../server/catalog/sync.ts'
import { startRuntimeCatalogSync } from '../../server/catalog/runtime-sync.ts'
import type { Catalog } from '../../src/lib/models/types.ts'
import { ensureInstallWorkingDirectory } from './installCwd.ts'

// Electrobun main process entry (build.bun.entrypoint). Boots the shared Hono
// app inside Bun and points a native webview at the pre-built React UI.

// Windows packaged: bun/index.js runs as a Worker whose cwd is %TEMP%.
// Electrobun then fails to read ../Resources/version.json and userData loses
// identifier/channel. Locate the install bin before touching Utils.paths.
ensureInstallWorkingDirectory()

// Persist the SQLite DB in the writable userData directory. This MUST be set
// before the server modules load, because server/db/open.ts reads
// STUDIO_DB_PATH at module-evaluation time.
const binDir = process.cwd()
const appDir = join(binDir, '..')
const isRepoDev =
  existsSync(join(binDir, 'electrobun.config.ts')) ||
  existsSync(join(binDir, 'package.json'))

const isPortable =
  !isRepoDev &&
  (process.env.STUDIO_PORTABLE === '1' ||
    Boolean(process.env.STUDIO_PORTABLE_DIR) ||
    existsSync(join(appDir, 'portable.flag')) ||
    existsSync(join(binDir, 'portable.flag')))

const portableDataDir = process.env.STUDIO_PORTABLE_DIR
  ? join(process.env.STUDIO_PORTABLE_DIR, 'data')
  : join(appDir, 'data')

let userData = isPortable ? portableDataDir : Utils.paths.userData
try {
  mkdirSync(userData, { recursive: true })
} catch {
  userData = Utils.paths.userData
  mkdirSync(userData, { recursive: true })
}
process.env.STUDIO_DB_PATH = join(userData, 'studio.db')

// Per-boot token for the leftover internal agent HTTP API (loopback).
process.env.STUDIO_AGENT_TOKEN = randomUUID()

// The catalog also lives in writable userData: the bundled source path is
// read-only on packaged builds (notably Linux, where startup sync could not
// persist its result and /api/models returned 503). Seed from the snapshot
// bundled with the app when missing, unreadable, or older than the bundle so
// app updates pick up new models even before a successful network sync.
const catalogPath = join(userData, 'catalog.json')
process.env.STUDIO_CATALOG_PATH = catalogPath
if (shouldReseedCatalog(seedCatalog, readExistingUserCatalog(catalogPath))) {
  try {
    writeFileSync(catalogPath, `${JSON.stringify(seedCatalog, null, 2)}\n`, 'utf8')
  } catch (err) {
    console.warn('[catalog] failed to seed bundled catalog', err)
  }
}

function readExistingUserCatalog(path: string): Catalog | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Catalog
  } catch {
    return null
  }
}

// Import server modules only after STUDIO_DB_PATH is in place.
const { createApp } = await import('../../server/app.ts')
const { getDb, getDbPath } = await import('../../server/db/open.ts')
const { startBackfill } = await import('../../server/media/backfill.ts')
const { registerUpdateHandler } = await import('../../server/routes/update.ts')

const app = createApp()

function startServer() {
  const maxAttempts = 20
  let port = 8787
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return Bun.serve({ fetch: (req) => app.fetch(req), port, hostname: '127.0.0.1' })
    } catch {
      // Most likely EADDRINUSE; try the next port.
      port += 1
    }
  }
  throw new Error('KIE STUDIO: could not bind an API port (8787-8806 in use)')
}

const server = startServer()
process.env.STUDIO_API_BASE = `http://127.0.0.1:${server.port}`
console.log(`KIE STUDIO API listening on http://127.0.0.1:${server.port}`)

let db: ReturnType<typeof getDb> | null = null
try {
  db = getDb()
  console.log(`[history] SQLite ready at ${getDbPath()}`)
} catch (err) {
  console.error('[history] failed to open SQLite', err)
}

// Packaged desktop always rechecks llms.txt (ignore-age) and repeats every 6h
// so installed builds pick up new Market models without an app update.
startRuntimeCatalogSync('desktop')

// Backfill: download media for existing history items that lack localPath.
startBackfill()

// NOTE: Electrobun's native wrapper treats the ENTIRE views:// URL path
// (including ?query and #hash) as a literal file path. No parameters can be
// appended to the URL. The frontend uses the default API port (8787) or
// discovers it via the /api/health probe (see src/lib/api.ts).
new BrowserWindow({
  title: 'KIE STUDIO',
  url: 'views://mainview/index.html',
  frame: { width: 1280, height: 832 },
})

// Non-blocking, best-effort update check querying GitHub releases for oakmusic/kie_studio.
async function checkForUpdatesQuietly() {
  try {
    const { checkGitHubRelease } = await import('../../server/routes/update.ts')
    const info = await checkGitHubRelease()
    if (info?.available) {
      console.log(
        `[updater] New GitHub release available: ${info.version ?? ''} (current: ${info.currentVersion ?? ''})`,
      )
      if (info.downloadUrl) {
        console.log(`[updater] Direct installer download: ${info.downloadUrl}`)
      }
    }
  } catch (err) {
    console.warn('[updater] quiet update check skipped', err)
  }
}

void checkForUpdatesQuietly()

// Register the /api/update/check handler so the frontend SettingsSheet can
// trigger an explicit update check from the UI.
registerUpdateHandler(async () => {
  const { checkGitHubRelease } = await import('../../server/routes/update.ts')
  return await checkGitHubRelease()
})


process.on('exit', () => {
  try {
    db?.close()
  } catch {
    // ignore cleanup errors
  }
})
