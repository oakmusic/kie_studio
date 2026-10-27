import { Hono } from 'hono'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface UpdateCheckResult {
  available: boolean
  version?: string
  currentVersion?: string
  downloadUrl?: string
  releaseUrl?: string
  name?: string
  releaseNotes?: string
  publishedAt?: string
  downloaded?: boolean
}

export interface GitHubAsset {
  name?: string
  browser_download_url?: string
}

export interface GitHubReleasePayload {
  tag_name?: string
  name?: string
  html_url?: string
  body?: string
  published_at?: string
  assets?: GitHubAsset[]
}

type UpdateHandler = () => Promise<UpdateCheckResult>

const UPDATE_HANDLER_KEY = Symbol.for('kie.updateHandler')

type GlobalWithHandler = typeof globalThis & {
  [UPDATE_HANDLER_KEY]?: UpdateHandler
}

export function registerUpdateHandler(fn: UpdateHandler) {
  ;(globalThis as GlobalWithHandler)[UPDATE_HANDLER_KEY] = fn
}

export function isUpdateHandlerRegistered(): boolean {
  return typeof (globalThis as GlobalWithHandler)[UPDATE_HANDLER_KEY] === 'function'
}

export function readAppVersion(): string {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
    const raw = readFileSync(join(root, 'package.json'), 'utf8')
    const parsed = JSON.parse(raw) as { version?: string }
    return parsed.version?.trim() || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

/**
 * Compares two semver strings (e.g. "1.0.24" vs "1.0.23", or "v1.0.24" vs "1.0.23").
 * Returns true if latest is strictly newer than current.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string): number[] => {
    const clean = v.replace(/^v/i, '').trim().split('-')[0].split('+')[0]
    return clean.split('.').map((p) => {
      const num = parseInt(p, 10)
      return Number.isNaN(num) ? 0 : num
    })
  }

  const l = parse(latest)
  const c = parse(current)
  const len = Math.max(l.length, c.length)

  for (let i = 0; i < len; i++) {
    const lPart = l[i] ?? 0
    const cPart = c[i] ?? 0
    if (lPart > cPart) return true
    if (lPart < cPart) return false
  }
  return false
}

/**
 * Picks the best installer asset for the current OS.
 */
export function pickPlatformAsset(
  assets: GitHubAsset[],
  platform = process.platform,
): string | undefined {
  if (!Array.isArray(assets) || assets.length === 0) return undefined

  if (platform === 'win32') {
    const setupExe = assets.find(
      (a) =>
        a.name?.toLowerCase().includes('setup') &&
        a.name?.toLowerCase().endsWith('.exe'),
    )
    if (setupExe?.browser_download_url) return setupExe.browser_download_url

    const anyExe = assets.find((a) => a.name?.toLowerCase().endsWith('.exe'))
    if (anyExe?.browser_download_url) return anyExe.browser_download_url

    const zip = assets.find(
      (a) =>
        a.name?.toLowerCase().includes('win') &&
        a.name?.toLowerCase().endsWith('.zip'),
    )
    return zip?.browser_download_url
  }

  if (platform === 'darwin') {
    const dmg = assets.find((a) => a.name?.toLowerCase().endsWith('.dmg'))
    if (dmg?.browser_download_url) return dmg.browser_download_url

    const macZip = assets.find(
      (a) =>
        a.name?.toLowerCase().includes('mac') &&
        a.name?.toLowerCase().endsWith('.zip'),
    )
    return macZip?.browser_download_url
  }

  if (platform === 'linux') {
    const deb = assets.find((a) => a.name?.toLowerCase().endsWith('.deb'))
    if (deb?.browser_download_url) return deb.browser_download_url

    const appImage = assets.find((a) =>
      a.name?.toLowerCase().endsWith('.appimage'),
    )
    if (appImage?.browser_download_url) return appImage.browser_download_url

    const tar = assets.find(
      (a) =>
        a.name?.toLowerCase().includes('linux') &&
        (a.name?.toLowerCase().endsWith('.tar.gz') ||
          a.name?.toLowerCase().endsWith('.tar.zst')),
    )
    return tar?.browser_download_url
  }

  return undefined
}

/**
 * Checks GitHub Releases for new versions of the app.
 */
export async function checkGitHubRelease(
  repo = process.env.STUDIO_UPDATE_REPO || 'oakmusic/kie_studio',
  currentVer?: string,
): Promise<UpdateCheckResult> {
  const current = currentVer || readAppVersion()
  const headers: Record<string, string> = {
    'User-Agent': 'Kie-Studio-Updater',
    Accept: 'application/vnd.github.v3+json',
  }

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const latestUrl = `https://api.github.com/repos/${repo}/releases/latest`
  let release: GitHubReleasePayload | null = null

  try {
    const res = await fetch(latestUrl, { headers })
    if (res.ok) {
      release = (await res.json()) as GitHubReleasePayload
    } else if (res.status === 404) {
      // If /releases/latest is 404, query /releases to check for pre-releases
      const listRes = await fetch(
        `https://api.github.com/repos/${repo}/releases?per_page=1`,
        { headers },
      )
      if (listRes.ok) {
        const list = (await listRes.json()) as GitHubReleasePayload[]
        if (Array.isArray(list) && list.length > 0) {
          release = list[0]
        }
      }
    } else if (res.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.')
    } else {
      throw new Error(
        `Failed to check updates from GitHub (${res.status} ${res.statusText})`,
      )
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('GitHub API')) {
      throw err
    }
    throw new Error(
      err instanceof Error
        ? err.message
        : 'Network error checking for updates',
    )
  }

  if (!release || !release.tag_name) {
    return {
      available: false,
      version: current,
      currentVersion: current,
    }
  }

  const latestTag = release.tag_name
  const available = isNewerVersion(latestTag, current)
  const downloadUrl = pickPlatformAsset(release.assets ?? [])

  return {
    available,
    version: latestTag,
    currentVersion: current,
    downloadUrl,
    releaseUrl: release.html_url,
    name: release.name,
    releaseNotes: release.body,
    publishedAt: release.published_at,
  }
}

export const updateRoutes = new Hono()

updateRoutes.post('/update/check', async (c) => {
  const handler = (globalThis as GlobalWithHandler)[UPDATE_HANDLER_KEY]
  try {
    const result = handler ? await handler() : await checkGitHubRelease()
    return c.json({ data: result })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to check for updates'
    return c.json({ error: message }, 500)
  }
})

