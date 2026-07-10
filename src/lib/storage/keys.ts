export const STORAGE_KEYS = {
  // Auth keys (browser-specific, remain in localStorage)
  AUTH_PASSPHRASE: 'formlab:auth:passphrase',
  AUTH_ATHLETE: 'strava:auth:athlete',
  // Legacy key from the Strava OAuth era — only referenced during cleanup
  LEGACY_AUTH_TOKENS: 'strava:auth:tokens',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
