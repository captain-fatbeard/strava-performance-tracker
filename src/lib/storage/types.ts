import type { StravaTokens, StravaAthlete } from '../strava'

// Re-export for convenience
export type { StravaTokens, StravaAthlete }

// Storage Adapter interface - the core abstraction
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

// Repository interfaces
export interface AuthRepository {
  getTokens(): Promise<StravaTokens | null>
  setTokens(tokens: StravaTokens): Promise<void>
  getAthlete(): Promise<StravaAthlete | null>
  setAthlete(athlete: StravaAthlete): Promise<void>
  clear(): Promise<void>
  isTokenExpired(): Promise<boolean>
}
