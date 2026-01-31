import type { StorageAdapter, Storage } from './types'
import { localStorageAdapter } from './adapters/local-storage'
import { createHybridAdapter, resetHybridSyncState } from './adapters/hybrid'
import { createAuthRepository } from './repositories/auth'
import { createSettingsRepository } from './repositories/settings'
import { STORAGE_KEYS } from './keys'

// Re-export types for convenience
export type {
  StorageAdapter,
  Storage,
  AuthRepository,
  SettingsRepository,
  AppSettings,
  TimeRange,
  ActivityType,
  Gender,
  StravaTokens,
  StravaAthlete,
} from './types'

export { DEFAULT_SETTINGS } from './types'
export { STORAGE_KEYS } from './keys'
export { resetHybridSyncState }

// Factory function to create storage with a given adapter
export function createStorage(adapter: StorageAdapter): Storage {
  return {
    auth: createAuthRepository(adapter),
    settings: createSettingsRepository(adapter),
  }
}

// Factory function to create hybrid storage with cloud sync
export function createHybridStorage(config: { getAthleteId: () => number | null }): Storage {
  const hybridAdapter = createHybridAdapter(config)
  return {
    auth: createAuthRepository(localStorageAdapter), // Auth stays local-only
    settings: createSettingsRepository(hybridAdapter), // Settings sync to cloud
  }
}

// Helper to get athlete ID from localStorage
function getAthleteId(): number | null {
  if (typeof window === 'undefined') return null
  const json = localStorage.getItem(STORAGE_KEYS.AUTH_ATHLETE)
  if (!json) return null
  try {
    const athlete = JSON.parse(json)
    return athlete?.id ?? null
  } catch {
    return null
  }
}

// Default storage instance using hybrid adapter (localStorage + Supabase sync)
export const storage = createHybridStorage({ getAthleteId })
