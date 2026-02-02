import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { AppSettings, TimeRange, ActivityType, Gender } from './types'
import { DEFAULT_SETTINGS } from './types'

// Get env vars - try both Vite style and Node style for SSR compatibility
function getEnvVar(key: string): string | undefined {
  // Try Vite-style first (works in client and during Vite build)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[key]
    if (value) return value
  }
  // Fall back to process.env for SSR/Node
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')

// Only create client if credentials are configured
let supabase: SupabaseClient | null = null
if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

// Database row type (snake_case column names)
interface UserSettingsRow {
  athlete_id: number
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

// Weight entry types
export interface WeightEntry {
  id: string
  athleteId: number
  weight: number
  recordedAt: string
  createdAt: string
}

interface WeightEntryRow {
  id: string
  athlete_id: number
  weight: number
  recorded_at: string
  created_at: string
}

function rowToWeightEntry(row: WeightEntryRow): WeightEntry {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    weight: Number(row.weight),
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  }
}

export async function fetchWeightEntries(athleteId: number): Promise<WeightEntry[]> {
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('recorded_at', { ascending: false })

    if (error) {
      console.warn('Supabase fetch weight entries error:', error.message)
      return []
    }

    return (data as WeightEntryRow[]).map(rowToWeightEntry)
  } catch (err) {
    console.warn('Supabase fetch weight entries error:', err)
    return []
  }
}

export async function addWeightEntry(
  athleteId: number,
  weight: number,
  recordedAt: Date
): Promise<WeightEntry | null> {
  if (!supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('weight_entries')
      .insert({
        athlete_id: athleteId,
        weight,
        recorded_at: recordedAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.warn('Supabase add weight entry error:', error.message)
      return null
    }

    return rowToWeightEntry(data as WeightEntryRow)
  } catch (err) {
    console.warn('Supabase add weight entry error:', err)
    return null
  }
}

export async function deleteWeightEntry(id: string): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    const { error } = await supabase
      .from('weight_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.warn('Supabase delete weight entry error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('Supabase delete weight entry error:', err)
    return false
  }
}
