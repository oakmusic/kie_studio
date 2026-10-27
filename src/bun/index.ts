import { BrowserWindow, Utils } from 'electrobun/bun'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import seedCatalog from '../../src/data/catalog.json' with { type: 'json' }
import { shouldReseedCatalog } from '../../server/catalog/sync.ts'
import { startRuntimeCatalogSync } from '../../server/catalog/runtime-sync.ts'
import type { Catalog } from '../../src/lib/models/types.ts'
import { ensureInstallWorkingDirectory } from './installCwd.ts'
import { dlopen, FFIType, ptr } from 'bun:ffi'

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
const mainWindow = new BrowserWindow({
  title: 'KIE STUDIO',
  url: 'views://mainview/index.html',
  frame: { width: 1600, height: 900 },
})
applyWindowsWindowIcon(mainWindow, 'KIE STUDIO')

function applyWindowsWindowIcon(winInstance: BrowserWindow, title: string) {
  if (process.platform !== 'win32') return

  // 1. Explicit AppUserModelID ensures Windows taskbar grouping matches the shortcut
  try {
    const shell32 = dlopen('shell32.dll', {
      SetCurrentProcessExplicitAppUserModelID: {
        args: [FFIType.ptr],
        returns: FFIType.u32,
      },
    })
    const appIdBuf = Buffer.from('ai.kie.studio\0', 'utf16le')
    shell32.symbols.SetCurrentProcessExplicitAppUserModelID(ptr(appIdBuf))
  } catch (err) {
    console.warn('[desktop] SetCurrentProcessExplicitAppUserModelID skipped:', err)
  }

  // 2. Load and set official .ico on HWND title bar and taskbar tab
  try {
    const candidates = [
      join(binDir, '..', 'Resources', 'app.ico'),
      join(binDir, '..', 'app.ico'),
      join(binDir, 'app.ico'),
      join(binDir, 'Resources', 'app.ico'),
      join(binDir, '..', 'assets', 'icon.ico'),
      join(process.cwd(), 'assets', 'icon.ico'),
      join(process.cwd(), 'public', 'favicon.ico'),
    ]
    const iconPath = candidates.find(existsSync)
    if (!iconPath) {
      console.warn('[desktop] no icon file found for Windows window')
      return
    }

    const user32 = dlopen('user32.dll', {
      LoadImageW: {
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.i32, FFIType.i32, FFIType.u32],
        returns: FFIType.ptr,
      },
      SendMessageW: {
        args: [FFIType.ptr, FFIType.u32, FFIType.u64, FFIType.ptr],
        returns: FFIType.ptr,
      },
      SetClassLongPtrW: {
        args: [FFIType.ptr, FFIType.i32, FFIType.ptr],
        returns: FFIType.ptr,
      },
      FindWindowW: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.ptr,
      },
    })

    const iconPathBuf = Buffer.from(iconPath + '\0', 'utf16le')
    const iconPathPtr = ptr(iconPathBuf)
    const hIconSmall = user32.symbols.LoadImageW(null, iconPathPtr, 1, 16, 16, 0x0010)
    const hIconBig = user32.symbols.LoadImageW(null, iconPathPtr, 1, 32, 32, 0x0010)
    const hIconLarge = user32.symbols.LoadImageW(null, iconPathPtr, 1, 256, 256, 0x0010) || hIconBig

    const applyToHwnd = (hwnd: unknown) => {
      if (!hwnd || hwnd === 0) return false
      if (hIconSmall) {
        user32.symbols.SendMessageW(hwnd, 0x0080, 0, hIconSmall)
        user32.symbols.SendMessageW(hwnd, 0x0080, 2, hIconSmall)
        user32.symbols.SetClassLongPtrW(hwnd, -34, hIconSmall)
      }
      if (hIconBig || hIconLarge) {
        const big = hIconBig || hIconLarge
        user32.symbols.SendMessageW(hwnd, 0x0080, 1, big)
        user32.symbols.SetClassLongPtrW(hwnd, -14, big)
      }
      return true
    }

    const titleBuf = Buffer.from(title + '\0', 'utf16le')
    const tryApply = () => {
      let hwnd = winInstance.ptr
      if (!hwnd || hwnd === 0) {
        hwnd = user32.symbols.FindWindowW(null, ptr(titleBuf))
      }
      if (hwnd && hwnd !== 0) {
        applyToHwnd(hwnd)
      }
    }

    tryApply()
    setTimeout(tryApply, 50)
    setTimeout(tryApply, 150)
    setTimeout(tryApply, 500)
    setTimeout(tryApply, 1500)
  } catch (err) {
    console.warn('[desktop] failed to apply Windows icon:', err)
  }
}

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
