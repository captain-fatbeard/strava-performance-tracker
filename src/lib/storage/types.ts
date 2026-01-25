import type { StravaTokens, StravaAthlete } from '../strava'

// Re-export for convenience
export type { StravaTokens, StravaAthlete }

// App Settings types
export type TimeRange = '30d' | '90d' | '6m' | '1y' | 'all'
export type ActivityType = 'all' | 'Ride' | 'Run' | 'VirtualRide'
export type Gender = 'male' | 'female'

export interface AppSettings {
  weight: number
  maxHR: number
  restingHR: number
  age: number
  gender: Gender
  timeRange: TimeRange
  activityType: ActivityType
  excludedActivityIds: number[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  weight: 75,
  maxHR: 185,
  restingHR: 60,
  age: 35,
  gender: 'male',
  timeRange: '90d',
  activityType: 'all',
  excludedActivityIds: [],
}

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

export interface SettingsRepository {
  get(): Promise<AppSettings>
  update(partial: Partial<AppSettings>): Promise<AppSettings>
  clear(): Promise<void>
}

// Storage facade that combines all repositories
export interface Storage {
  auth: AuthRepository
  settings: SettingsRepository
}
