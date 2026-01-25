import type { StorageAdapter, Storage } from './types'
import { localStorageAdapter } from './adapters/local-storage'
import { createAuthRepository } from './repositories/auth'
import { createSettingsRepository } from './repositories/settings'

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

// Factory function to create storage with a given adapter
export function createStorage(adapter: StorageAdapter): Storage {
  return {
    auth: createAuthRepository(adapter),
    settings: createSettingsRepository(adapter),
  }
}

// Default storage instance using localStorage
export const storage = createStorage(localStorageAdapter)
