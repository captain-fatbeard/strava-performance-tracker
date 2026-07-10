import type { StorageAdapter, AuthRepository, StravaAthlete } from '../types'
import { STORAGE_KEYS } from '../keys'

export function createAuthRepository(adapter: StorageAdapter): AuthRepository {
  return {
    async getPassphrase(): Promise<string | null> {
      return adapter.get<string>(STORAGE_KEYS.AUTH_PASSPHRASE)
    },

    async setPassphrase(passphrase: string): Promise<void> {
      await adapter.set(STORAGE_KEYS.AUTH_PASSPHRASE, passphrase)
    },

    async getAthlete(): Promise<StravaAthlete | null> {
      return adapter.get<StravaAthlete>(STORAGE_KEYS.AUTH_ATHLETE)
    },

    async setAthlete(athlete: StravaAthlete): Promise<void> {
      await adapter.set(STORAGE_KEYS.AUTH_ATHLETE, athlete)
    },

    async clear(): Promise<void> {
      await Promise.all([
        adapter.remove(STORAGE_KEYS.AUTH_PASSPHRASE),
        adapter.remove(STORAGE_KEYS.AUTH_ATHLETE),
        adapter.remove(STORAGE_KEYS.LEGACY_AUTH_TOKENS),
      ])
    },
  }
}
