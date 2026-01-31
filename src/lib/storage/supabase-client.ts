import { createClient } from '@supabase/supabase-js'
import type { AppSettings, TimeRange, ActivityType, Gender } from './types'
import { DEFAULT_SETTINGS } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if credentials are configured
const supabase =
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

// Database row type (snake_case column names)
interface UserSettingsRow {
  athlete_id: number
  weight: number
  max_hr: number
  resting_hr: number
  age: number
  gender: 'male' | 'female'
  time_range: TimeRange
  activity_type: ActivityType
  excluded_activity_ids: number[]
  created_at: string
  updated_at: string
}

// Map database row to AppSettings
function rowToSettings(row: UserSettingsRow): AppSettings {
  return {
    weight: row.weight,
    maxHR: row.max_hr,
    restingHR: row.resting_hr,
    age: row.age,
    gender: row.gender as Gender,
    timeRange: row.time_range as TimeRange,
    activityType: row.activity_type as ActivityType,
    excludedActivityIds: row.excluded_activity_ids ?? [],
  }
}

// Map AppSettings to database row (partial, for upsert)
function settingsToRow(
  athleteId: number,
  settings: AppSettings
): Omit<UserSettingsRow, 'created_at' | 'updated_at'> {
  return {
    athlete_id: athleteId,
    weight: settings.weight,
    max_hr: settings.maxHR,
    resting_hr: settings.restingHR,
    age: settings.age,
    gender: settings.gender,
    time_range: settings.timeRange,
    activity_type: settings.activityType,
    excluded_activity_ids: settings.excludedActivityIds,
  }
}

export async function fetchUserSettings(athleteId: number): Promise<AppSettings | null> {
  if (!supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('athlete_id', athleteId)
      .single()

    if (error) {
      // PGRST116 = "No rows returned" - not an error, just no data yet
      if (error.code === 'PGRST116') {
        return null
      }
      console.warn('Supabase fetch error:', error.message)
      return null
    }

    return rowToSettings(data as UserSettingsRow)
  } catch (err) {
    console.warn('Supabase fetch error:', err)
    return null
  }
}

export async function upsertUserSettings(
  athleteId: number,
  settings: AppSettings
): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    const { error } = await supabase.from('user_settings').upsert(
      {
        ...settingsToRow(athleteId, settings),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id' }
    )

    if (error) {
      console.warn('Supabase upsert error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('Supabase upsert error:', err)
    return false
  }
}

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}
