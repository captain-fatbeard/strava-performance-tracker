import type { StorageAdapter, SettingsRepository, AppSettings, TimeRange, ActivityType, Gender } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { STORAGE_KEYS } from '../keys'

export function createSettingsRepository(adapter: StorageAdapter): SettingsRepository {
  async function loadSettings(): Promise<AppSettings> {
    const [weight, maxHR, restingHR, age, gender, timeRange, activityType, excludedActivityIds] =
      await Promise.all([
        adapter.get<number>(STORAGE_KEYS.USER_WEIGHT),
        adapter.get<number>(STORAGE_KEYS.USER_MAX_HR),
        adapter.get<number>(STORAGE_KEYS.USER_RESTING_HR),
        adapter.get<number>(STORAGE_KEYS.USER_AGE),
        adapter.get<Gender>(STORAGE_KEYS.USER_GENDER),
        adapter.get<TimeRange>(STORAGE_KEYS.FILTER_TIME_RANGE),
        adapter.get<ActivityType>(STORAGE_KEYS.FILTER_ACTIVITY_TYPE),
        adapter.get<number[]>(STORAGE_KEYS.EXCLUDED_ACTIVITIES),
      ])

    return {
      weight: weight ?? DEFAULT_SETTINGS.weight,
      maxHR: maxHR ?? DEFAULT_SETTINGS.maxHR,
      restingHR: restingHR ?? DEFAULT_SETTINGS.restingHR,
      age: age ?? DEFAULT_SETTINGS.age,
      gender: gender ?? DEFAULT_SETTINGS.gender,
      timeRange: timeRange ?? DEFAULT_SETTINGS.timeRange,
      activityType: activityType ?? DEFAULT_SETTINGS.activityType,
      excludedActivityIds: excludedActivityIds ?? DEFAULT_SETTINGS.excludedActivityIds,
    }
  }

  return {
    async get(): Promise<AppSettings> {
      return loadSettings()
    },

    async update(partial: Partial<AppSettings>): Promise<AppSettings> {
      const updates: Promise<void>[] = []

      if (partial.weight !== undefined) {
        updates.push(adapter.set(STORAGE_KEYS.USER_WEIGHT, partial.weight))
      }
      if (partial.maxHR !== undefined) {
        updates.push(adapter.set(STORAGE_KEYS.USER_MAX_HR, partial.maxHR))
      }
      if (partial.restingHR !== undefined) {
        updates.push(adapter.set(STORAGE_KEYS.USER_RESTING_HR, partial.restingHR))
      }
      if (partial.age !== undefined) {
        updates.push(adapter.set(STORAGE_KEYS.USER_AGE, partial.age))
      }
      if (partial.gender !== undefined) {
        updates.push(adapter.set(STORAGE_KEYS.USER_GENDER, partial.gender))
      }
      if (partial.timeRange !== undefined) {
        updates.push(adapter.set(STORAGE_KEYS.FILTER_TIME_RANGE, partial.timeRange))
      }
      if (partial.activityType !== undefined) {
        updates.push(adapter.set(STORAGE_KEYS.FILTER_ACTIVITY_TYPE, partial.activityType))
      }
      if (partial.excludedActivityIds !== undefined) {
        updates.push(adapter.set(STORAGE_KEYS.EXCLUDED_ACTIVITIES, partial.excludedActivityIds))
      }

      await Promise.all(updates)
      return loadSettings()
    },

    async clear(): Promise<void> {
      await Promise.all([
        adapter.remove(STORAGE_KEYS.USER_WEIGHT),
        adapter.remove(STORAGE_KEYS.USER_MAX_HR),
        adapter.remove(STORAGE_KEYS.USER_RESTING_HR),
        adapter.remove(STORAGE_KEYS.USER_AGE),
        adapter.remove(STORAGE_KEYS.USER_GENDER),
        adapter.remove(STORAGE_KEYS.FILTER_TIME_RANGE),
        adapter.remove(STORAGE_KEYS.FILTER_ACTIVITY_TYPE),
        adapter.remove(STORAGE_KEYS.EXCLUDED_ACTIVITIES),
      ])
    },
  }
}
