import type { StravaAthlete } from '../strava'

// Re-export for convenience
export type { StravaAthlete }

// Storage Adapter interface - the core abstraction
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

// Repository interfaces
export interface AuthRepository {
  getPassphrase(): Promise<string | null>
  setPassphrase(passphrase: string): Promise<void>
  getAthlete(): Promise<StravaAthlete | null>
  setAthlete(athlete: StravaAthlete): Promise<void>
  clear(): Promise<void>
}
