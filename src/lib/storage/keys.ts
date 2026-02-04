export const STORAGE_KEYS = {
  // Auth keys (browser-specific, remain in localStorage)
  AUTH_TOKENS: 'strava:auth:tokens',
  AUTH_ATHLETE: 'strava:auth:athlete',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
