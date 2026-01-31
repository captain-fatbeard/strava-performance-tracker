import type { StorageAdapter, AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { STORAGE_KEYS } from '../keys'
import { localStorageAdapter } from './local-storage'
import { fetchUserSettings, upsertUserSettings, isSupabaseConfigured } from '../supabase-client'

export interface HybridAdapterConfig {
  getAthleteId: () => number | null
}

// Track if we've synced from Supabase this session
let hasSyncedThisSession = false

// Keys that map to settings (synced to cloud)
const SETTINGS_KEYS = new Set([
  STORAGE_KEYS.USER_WEIGHT,
  STORAGE_KEYS.USER_MAX_HR,
  STORAGE_KEYS.USER_RESTING_HR,
  STORAGE_KEYS.USER_AGE,
  STORAGE_KEYS.USER_GENDER,
  STORAGE_KEYS.FILTER_TIME_RANGE,
  STORAGE_KEYS.FILTER_ACTIVITY_TYPE,
  STORAGE_KEYS.EXCLUDED_ACTIVITIES,
])

function isSettingsKey(key: string): boolean {
  return SETTINGS_KEYS.has(key as (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS])
}

// Helper to load all settings from localStorage
async function loadLocalSettings(): Promise<AppSettings> {
  const [weight, maxHR, restingHR, age, gender, timeRange, activityType, excludedActivityIds] =
    await Promise.all([
      localStorageAdapter.get<number>(STORAGE_KEYS.USER_WEIGHT),
      localStorageAdapter.get<number>(STORAGE_KEYS.USER_MAX_HR),
      localStorageAdapter.get<number>(STORAGE_KEYS.USER_RESTING_HR),
      localStorageAdapter.get<number>(STORAGE_KEYS.USER_AGE),
      localStorageAdapter.get<string>(STORAGE_KEYS.USER_GENDER),
      localStorageAdapter.get<string>(STORAGE_KEYS.FILTER_TIME_RANGE),
      localStorageAdapter.get<string>(STORAGE_KEYS.FILTER_ACTIVITY_TYPE),
      localStorageAdapter.get<number[]>(STORAGE_KEYS.EXCLUDED_ACTIVITIES),
    ])

  return {
    weight: weight ?? DEFAULT_SETTINGS.weight,
    maxHR: maxHR ?? DEFAULT_SETTINGS.maxHR,
    restingHR: restingHR ?? DEFAULT_SETTINGS.restingHR,
    age: age ?? DEFAULT_SETTINGS.age,
    gender: (gender as AppSettings['gender']) ?? DEFAULT_SETTINGS.gender,
    timeRange: (timeRange as AppSettings['timeRange']) ?? DEFAULT_SETTINGS.timeRange,
    activityType: (activityType as AppSettings['activityType']) ?? DEFAULT_SETTINGS.activityType,
    excludedActivityIds: excludedActivityIds ?? DEFAULT_SETTINGS.excludedActivityIds,
  }
}

// Helper to save all settings to localStorage
async function saveLocalSettings(settings: AppSettings): Promise<void> {
  await Promise.all([
    localStorageAdapter.set(STORAGE_KEYS.USER_WEIGHT, settings.weight),
    localStorageAdapter.set(STORAGE_KEYS.USER_MAX_HR, settings.maxHR),
    localStorageAdapter.set(STORAGE_KEYS.USER_RESTING_HR, settings.restingHR),
    localStorageAdapter.set(STORAGE_KEYS.USER_AGE, settings.age),
    localStorageAdapter.set(STORAGE_KEYS.USER_GENDER, settings.gender),
    localStorageAdapter.set(STORAGE_KEYS.FILTER_TIME_RANGE, settings.timeRange),
    localStorageAdapter.set(STORAGE_KEYS.FILTER_ACTIVITY_TYPE, settings.activityType),
    localStorageAdapter.set(STORAGE_KEYS.EXCLUDED_ACTIVITIES, settings.excludedActivityIds),
  ])
}

export function createHybridAdapter(config: HybridAdapterConfig): StorageAdapter {
  // Sync settings from Supabase on first read
  async function syncFromSupabase(): Promise<void> {
    if (hasSyncedThisSession || !isSupabaseConfigured()) {
      return
    }

    const athleteId = config.getAthleteId()
    if (!athleteId) {
      return
    }

    hasSyncedThisSession = true

    try {
      const cloudSettings = await fetchUserSettings(athleteId)
      if (cloudSettings) {
        await saveLocalSettings(cloudSettings)
      }
    } catch (err) {
      // Silently fail - localStorage is the fallback
      console.warn('Failed to sync from Supabase:', err)
    }
  }

  // Sync settings to Supabase (fire-and-forget)
  function syncToSupabase(): void {
    if (!isSupabaseConfigured()) {
      return
    }

    const athleteId = config.getAthleteId()
    if (!athleteId) {
      return
    }

    // Fire-and-forget: don't await, don't block
    loadLocalSettings()
      .then((settings) => upsertUserSettings(athleteId, settings))
      .catch((err) => console.warn('Failed to sync to Supabase:', err))
  }

  return {
    async get<T>(key: string): Promise<T | null> {
      // For settings keys, sync from Supabase first (once per session)
      if (isSettingsKey(key)) {
        await syncFromSupabase()
      }

      // Always read from localStorage (it's the source of truth after sync)
      return localStorageAdapter.get<T>(key)
    },

    async set<T>(key: string, value: T): Promise<void> {
      // Write to localStorage immediately (optimistic)
      await localStorageAdapter.set(key, value)

      // For settings keys, sync to Supabase (fire-and-forget)
      if (isSettingsKey(key)) {
        syncToSupabase()
      }
    },

    async remove(key: string): Promise<void> {
      await localStorageAdapter.remove(key)

      // For settings keys, sync to Supabase (fire-and-forget)
      if (isSettingsKey(key)) {
        syncToSupabase()
      }
    },

    async clear(): Promise<void> {
      await localStorageAdapter.clear()
      // Note: We don't clear cloud data - user might want to keep it
    },
  }
}

// Export a function to reset sync state (useful for testing or logout)
export function resetHybridSyncState(): void {
  hasSyncedThisSession = false
}
