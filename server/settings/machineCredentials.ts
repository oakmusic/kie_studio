import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface MachineCredentials {
  kieApiKey?: string
  updatedAt?: number
  [key: string]: unknown
}

/**
 * Machine-level persistent credentials paths.
 * Stored in the user's home / AppData directory so credentials survive
 * app updates, version changes, unzipping new portable releases, and reinstalls.
 */
export function getCredentialPaths(): string[] {
  // Allow test override
  if (process.env.STUDIO_CREDENTIALS_PATH) {
    return [process.env.STUDIO_CREDENTIALS_PATH]
  }

  const paths: string[] = []
  const home = homedir()

  // 1. ~/.kiestudio/credentials.json (Standard cross-platform developer tool path)
  if (home) {
    paths.push(join(home, '.kiestudio', 'credentials.json'))
  }

  // 2. Windows %APPDATA%/KieStudio/credentials.json
  const appData = process.env.APPDATA
  if (appData) {
    paths.push(join(appData, 'KieStudio', 'credentials.json'))
  }

  return paths
}

/** Read the KIE API key from machine-level storage. */
export function readMachineApiKey(): string | null {
  for (const path of getCredentialPaths()) {
    try {
      if (!existsSync(path)) continue
      const raw = readFileSync(path, 'utf8')
      const parsed = JSON.parse(raw) as MachineCredentials
      if (typeof parsed?.kieApiKey === 'string' && parsed.kieApiKey.trim()) {
        return parsed.kieApiKey.trim()
      }
    } catch {
      // Continue to next path if corrupt
    }
  }
  return null
}

/** Read full credentials payload. */
export function readMachineCredentials(): MachineCredentials {
  for (const path of getCredentialPaths()) {
    try {
      if (!existsSync(path)) continue
      const raw = readFileSync(path, 'utf8')
      const parsed = JSON.parse(raw) as MachineCredentials
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    } catch {
      // Ignore
    }
  }
  return {}
}

/** Persist the KIE API key to machine-level storage. */
export function writeMachineApiKey(apiKey: string): void {
  const trimmed = apiKey.trim()
  if (!trimmed) return

  const existing = readMachineCredentials()
  const payload: MachineCredentials = {
    ...existing,
    kieApiKey: trimmed,
    updatedAt: Date.now(),
  }
  const content = JSON.stringify(payload, null, 2) + '\n'

  for (const path of getCredentialPaths()) {
    try {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, content, { encoding: 'utf8', mode: 0o600 })
    } catch (err) {
      console.warn(`[machine-credentials] Failed to write credentials to ${path}:`, err)
    }
  }
}

/** Delete the KIE API key from machine-level storage. */
export function deleteMachineApiKey(): void {
  const existing = readMachineCredentials()
  delete existing.kieApiKey
  existing.updatedAt = Date.now()

  // If empty of secrets, remove files, otherwise write back without kieApiKey
  const remainingKeys = Object.keys(existing).filter((k) => k !== 'updatedAt')

  for (const path of getCredentialPaths()) {
    try {
      if (!existsSync(path)) continue
      if (remainingKeys.length === 0) {
        unlinkSync(path)
      } else {
        writeFileSync(path, JSON.stringify(existing, null, 2) + '\n', {
          encoding: 'utf8',
          mode: 0o600,
        })
      }
    } catch {
      // Ignore
    }
  }
}

