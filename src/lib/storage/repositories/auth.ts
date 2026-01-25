import type { StorageAdapter, AuthRepository, StravaTokens, StravaAthlete } from '../types'
import { STORAGE_KEYS } from '../keys'

export function createAuthRepository(adapter: StorageAdapter): AuthRepository {
  return {
    async getTokens(): Promise<StravaTokens | null> {
      return adapter.get<StravaTokens>(STORAGE_KEYS.AUTH_TOKENS)
    },

    async setTokens(tokens: StravaTokens): Promise<void> {
      await adapter.set(STORAGE_KEYS.AUTH_TOKENS, tokens)
    },

    async getAthlete(): Promise<StravaAthlete | null> {
      return adapter.get<StravaAthlete>(STORAGE_KEYS.AUTH_ATHLETE)
    },

    async setAthlete(athlete: StravaAthlete): Promise<void> {
      await adapter.set(STORAGE_KEYS.AUTH_ATHLETE, athlete)
    },

    async clear(): Promise<void> {
      await Promise.all([
        adapter.remove(STORAGE_KEYS.AUTH_TOKENS),
        adapter.remove(STORAGE_KEYS.AUTH_ATHLETE),
      ])
    },

    async isTokenExpired(): Promise<boolean> {
      const tokens = await this.getTokens()
      if (!tokens) return true
      // Add 60 second buffer
      return Date.now() / 1000 > tokens.expires_at - 60
    },
  }
}
