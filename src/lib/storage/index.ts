import { localStorageAdapter } from './adapters/local-storage'
import { createAuthRepository } from './repositories/auth'

// Re-export types for convenience
export type {
  StorageAdapter,
  AuthRepository,
  StravaTokens,
  StravaAthlete,
} from './types'

export { STORAGE_KEYS } from './keys'

// Storage with auth only - settings are managed via Drizzle server functions
export const storage = {
  auth: createAuthRepository(localStorageAdapter),
}
