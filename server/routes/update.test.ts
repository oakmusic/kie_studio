// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import {
  checkGitHubRelease,
  isNewerVersion,
  pickPlatformAsset,
  updateRoutes,
} from './update.ts'

describe('isNewerVersion', () => {
  it('detects newer patch, minor, and major versions', () => {
    expect(isNewerVersion('v1.0.23', '1.0.22')).toBe(true)
    expect(isNewerVersion('1.1.0', '1.0.22')).toBe(true)
    expect(isNewerVersion('2.0.0', '1.99.99')).toBe(true)
  })

  it('detects equal or older versions', () => {
    expect(isNewerVersion('v1.0.22', '1.0.22')).toBe(false)
    expect(isNewerVersion('1.0.21', '1.0.22')).toBe(false)
    expect(isNewerVersion('0.9.0', '1.0.0')).toBe(false)
  })

  it('handles prefixes and pre-release tags', () => {
    expect(isNewerVersion('V1.0.23', 'v1.0.22')).toBe(true)
    expect(isNewerVersion('v1.0.23-beta.1', '1.0.22')).toBe(true)
    expect(isNewerVersion('v1.0.22-canary.1', '1.0.22')).toBe(false)
  })
})

describe('pickPlatformAsset', () => {
  const assets = [
    {
      name: 'stable-win-x64-KIESTUDIO-Setup.exe',
      browser_download_url: 'https://github.com/oakmusic/kie_studio/releases/download/v1.0.23/Setup.exe',
    },
    {
      name: 'Kie-Studio-1.0.23.dmg',
      browser_download_url: 'https://github.com/oakmusic/kie_studio/releases/download/v1.0.23/App.dmg',
    },
    {
      name: 'kie-studio_1.0.23_amd64.deb',
      browser_download_url: 'https://github.com/oakmusic/kie_studio/releases/download/v1.0.23/app.deb',
    },
  ]

  it('picks Windows setup executable on win32', () => {
    expect(pickPlatformAsset(assets, 'win32')).toBe(
      'https://github.com/oakmusic/kie_studio/releases/download/v1.0.23/Setup.exe',
    )
  })

  it('picks DMG on darwin', () => {
    expect(pickPlatformAsset(assets, 'darwin')).toBe(
      'https://github.com/oakmusic/kie_studio/releases/download/v1.0.23/App.dmg',
    )
  })

  it('picks deb on linux', () => {
    expect(pickPlatformAsset(assets, 'linux')).toBe(
      'https://github.com/oakmusic/kie_studio/releases/download/v1.0.23/app.deb',
    )
  })

  it('returns undefined if no matching asset found', () => {
    expect(pickPlatformAsset([], 'win32')).toBeUndefined()
  })
})

describe('checkGitHubRelease', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns available: false when repo has no releases (404)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Not Found' }),
    } as unknown as Response)

    const result = await checkGitHubRelease('oakmusic/kie_studio', '1.0.22')
    expect(result.available).toBe(false)
    expect(result.currentVersion).toBe('1.0.22')
  })

  it('returns available: true with downloadUrl when a newer release exists', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tag_name: 'v1.0.23',
        name: 'v1.0.23 Spanish & English Release',
        html_url: 'https://github.com/oakmusic/kie_studio/releases/tag/v1.0.23',
        body: 'Release notes here',
        published_at: '2026-10-27T10:00:00Z',
        assets: [
          {
            name: 'stable-win-x64-KIESTUDIO-Setup.exe',
            browser_download_url: 'https://github.com/oakmusic/kie_studio/releases/download/v1.0.23/Setup.exe',
          },
        ],
      }),
    } as unknown as Response)

    const result = await checkGitHubRelease('oakmusic/kie_studio', '1.0.22')
    expect(result.available).toBe(true)
    expect(result.version).toBe('v1.0.23')
    expect(result.currentVersion).toBe('1.0.22')
    expect(result.releaseUrl).toBe('https://github.com/oakmusic/kie_studio/releases/tag/v1.0.23')
  })

  it('handles rate limits gracefully (403)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ message: 'API rate limit exceeded' }),
    } as unknown as Response)

    await expect(checkGitHubRelease('oakmusic/kie_studio', '1.0.22')).rejects.toThrow(
      'GitHub API rate limit exceeded',
    )
  })
})

describe('POST /api/update/check', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns 200 with update data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Not Found' }),
    } as unknown as Response)

    const app = new Hono()
    app.route('/api', updateRoutes)

    const res = await app.request('/api/update/check', { method: 'POST' })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { available: boolean } }
    expect(json.data.available).toBe(false)
  })
})
