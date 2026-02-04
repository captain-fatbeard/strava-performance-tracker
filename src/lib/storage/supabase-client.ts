import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Types
export type TimeRange = '30d' | '90d' | '6m' | '1y' | 'all'
export type ActivityType = 'all' | 'Ride' | 'Run' | 'VirtualRide'
export type Gender = 'male' | 'female'

export interface AppSettings {
  maxHR: number
  restingHR: number
  age: number
  gender: Gender
  timeRange: TimeRange
  activityType: ActivityType
}

export const DEFAULT_SETTINGS: AppSettings = {
  maxHR: 185,
  restingHR: 60,
  age: 35,
  gender: 'male',
  timeRange: '90d',
  activityType: 'all',
}

// Get env vars - try both Vite style and Node style for SSR compatibility
function getEnvVar(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[key]
    if (value) return value
  }
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

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

// Database row types
interface UserSettingsRow {
  athlete_id: number
  max_hr: number
  resting_hr: number
  age: number
  gender: 'male' | 'female'
  time_range: TimeRange
  activity_type: ActivityType
  created_at: string
  updated_at: string
}

function rowToSettings(row: UserSettingsRow): AppSettings {
  return {
    maxHR: row.max_hr,
    restingHR: row.resting_hr,
    age: row.age,
    gender: row.gender as Gender,
    timeRange: row.time_range as TimeRange,
    activityType: row.activity_type as ActivityType,
  }
}

// User Settings
export async function fetchUserSettings(athleteId: number): Promise<AppSettings | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('athlete_id', athleteId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
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
  if (!supabase) return false

  try {
    const { error } = await supabase.from('user_settings').upsert(
      {
        athlete_id: athleteId,
        max_hr: settings.maxHR,
        resting_hr: settings.restingHR,
        age: settings.age,
        gender: settings.gender,
        time_range: settings.timeRange,
        activity_type: settings.activityType,
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

// Weight Entries
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
  if (!supabase) return []

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
  if (!supabase) return null

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
  if (!supabase) return false

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

// Excluded Activities
export async function fetchExcludedActivityIds(athleteId: number): Promise<number[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('excluded_activities')
      .select('activity_id')
      .eq('athlete_id', athleteId)

    if (error) {
      console.warn('Supabase fetch excluded activities error:', error.message)
      return []
    }

    return (data as { activity_id: number }[]).map((row) => row.activity_id)
  } catch (err) {
    console.warn('Supabase fetch excluded activities error:', err)
    return []
  }
}

export async function addExcludedActivity(
  athleteId: number,
  activityId: number
): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase.from('excluded_activities').insert({
      athlete_id: athleteId,
      activity_id: activityId,
    })

    if (error) {
      if (error.code === '23505') return true // Duplicate, already excluded
      console.warn('Supabase add excluded activity error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('Supabase add excluded activity error:', err)
    return false
  }
}

export async function removeExcludedActivity(
  athleteId: number,
  activityId: number
): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('excluded_activities')
      .delete()
      .eq('athlete_id', athleteId)
      .eq('activity_id', activityId)

    if (error) {
      console.warn('Supabase remove excluded activity error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('Supabase remove excluded activity error:', err)
    return false
  }
}
