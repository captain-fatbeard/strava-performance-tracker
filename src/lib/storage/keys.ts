export const STORAGE_KEYS = {
  // Auth keys
  AUTH_TOKENS: 'strava:auth:tokens',
  AUTH_ATHLETE: 'strava:auth:athlete',

  // User settings keys
  USER_MAX_HR: 'strava:user:maxHR',
  USER_RESTING_HR: 'strava:user:restingHR',
  USER_AGE: 'strava:user:age',
  USER_GENDER: 'strava:user:gender',

  // Filter keys
  FILTER_TIME_RANGE: 'strava:filter:timeRange',
  FILTER_ACTIVITY_TYPE: 'strava:filter:activityType',

  // Activity exclusion
  EXCLUDED_ACTIVITIES: 'strava:excluded:activityIds',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
