import { deleteSetting, getSetting, setSetting } from '../db/settings.ts'
import { decryptSecret, encryptSecret } from './secretBox.ts'
import {
  deleteMachineApiKey,
  readMachineApiKey,
  writeMachineApiKey,
} from './machineCredentials.ts'

/** Settings key under which the KIE API key is persisted. */
export const KIE_API_KEY_SETTING = 'KIE_API_KEY'

const PLACEHOLDER = 'your_api_key_here'

function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed || trimmed === PLACEHOLDER) return null
  return trimmed
}

/** Decrypt the persisted API key, tolerating legacy plaintext and corruption. */
function readStoredSetting(): string | null {
  const stored = getSetting(KIE_API_KEY_SETTING)
  if (stored === null) return null
  try {
    return decryptSecret(stored)
  } catch {
    // Wrong key or tampered payload: treat as no usable stored key.
    return null
  }
}

/**
 * Resolve the effective KIE API key.
 * Priority: local DB (app_settings) → machine persistent credentials (~/.kiestudio) → KIE_API_KEY env var.
 */
export function getStoredApiKey(): string | null {
  const fromDb = normalize(readStoredSetting())
  if (fromDb) {
    // Ensure machine-level storage is also synchronized for future version updates
    try {
      if (!readMachineApiKey()) {
        writeMachineApiKey(fromDb)
      }
    } catch {
      // Best-effort
    }
    return fromDb
  }

  const fromMachine = normalize(readMachineApiKey())
  if (fromMachine) {
    // Opportunistically cache into current database
    try {
      setSetting(KIE_API_KEY_SETTING, encryptSecret(fromMachine))
    } catch {
      // Best-effort
    }
    return fromMachine
  }

  return normalize(process.env.KIE_API_KEY)
}

/** Persist the API key both locally in SQLite DB and machine-wide for version survival. */
export function setStoredApiKey(key: string): void {
  setSetting(KIE_API_KEY_SETTING, encryptSecret(key))
  writeMachineApiKey(key)
}

/** Delete the API key from both local DB and machine storage. */
export function deleteStoredApiKey(): void {
  deleteSetting(KIE_API_KEY_SETTING)
  deleteMachineApiKey()
}

/** Whether a key is persisted in the store or machine (independent of the env fallback). */
export function hasStoredApiKeyInStore(): boolean {
  return normalize(readStoredSetting()) !== null || normalize(readMachineApiKey()) !== null
}

/** Whether a usable key exists from either the store, machine storage, or environment. */
export function hasUsableApiKey(): boolean {
  return getStoredApiKey() !== null
}

/** Mask a key for display, e.g. `••••1234`. */
export function maskApiKey(key: string): string {
  const tail = key.slice(-4)
  return `${'\u2022'.repeat(4)}${tail}`
}
