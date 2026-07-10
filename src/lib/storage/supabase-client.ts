import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { StravaActivity, ActivityDetailsJson, StravaSegmentEffort, StravaBestEffort } from '../strava'

// Types
export type TimeRange = '30d' | '90d' | '6m' | '1y' | 'all'
export type ActivityType = 'all' | 'Ride' | 'Run' | 'VirtualRide'
export type Gender = 'male' | 'female'

export interface AppSettings {
  birthday: string | null // 'YYYY-MM-DD'
  gender: Gender
  timeRange: TimeRange
  activityType: ActivityType
  maxHR: number | null     // manual override, null = auto-calculate
  restingHR: number | null // manual override, null = auto-calculate
}

export const DEFAULT_SETTINGS: AppSettings = {
  birthday: null,
  gender: 'male',
  timeRange: '90d',
  activityType: 'all',
  maxHR: null,
  restingHR: null,
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
  birthday: string | null
  gender: 'male' | 'female'
  time_range: TimeRange
  activity_type: ActivityType
  created_at: string
  updated_at: string
}

function rowToSettings(row: UserSettingsRow): AppSettings {
  return {
    birthday: row.birthday ?? null,
    gender: row.gender as Gender,
    timeRange: row.time_range as TimeRange,
    activityType: row.activity_type as ActivityType,
    maxHR: row.max_hr || null,
    restingHR: row.resting_hr || null,
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
        birthday: settings.birthday,
        gender: settings.gender,
        time_range: settings.timeRange,
        activity_type: settings.activityType,
        max_hr: settings.maxHR ?? 0,
        resting_hr: settings.restingHR ?? 0,
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

// FTP Entries
export interface FtpEntry {
  id: string
  athleteId: number
  ftp: number
  effectiveDate: string // 'YYYY-MM-DD'
  createdAt: string
}

interface FtpEntryRow {
  id: string
  athlete_id: number
  ftp: number
  effective_date: string
  created_at: string
}

function rowToFtpEntry(row: FtpEntryRow): FtpEntry {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    ftp: row.ftp,
    effectiveDate: row.effective_date,
    createdAt: row.created_at,
  }
}

export async function fetchFtpEntries(athleteId: number): Promise<FtpEntry[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('ftp_entries')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('effective_date', { ascending: false })

    if (error) {
      console.warn('Supabase fetch FTP entries error:', error.message)
      return []
    }

    return (data as FtpEntryRow[]).map(rowToFtpEntry)
  } catch (err) {
    console.warn('Supabase fetch FTP entries error:', err)
    return []
  }
}

export async function addFtpEntry(
  athleteId: number,
  ftp: number,
  effectiveDate: string
): Promise<FtpEntry | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('ftp_entries')
      .upsert(
        {
          athlete_id: athleteId,
          ftp,
          effective_date: effectiveDate,
        },
        { onConflict: 'athlete_id,effective_date' }
      )
      .select()
      .single()

    if (error) {
      console.warn('Supabase add FTP entry error:', error.message)
      return null
    }

    return rowToFtpEntry(data as FtpEntryRow)
  } catch (err) {
    console.warn('Supabase add FTP entry error:', err)
    return null
  }
}

export async function deleteFtpEntry(id: string): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('ftp_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.warn('Supabase delete FTP entry error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('Supabase delete FTP entry error:', err)
    return false
  }
}

// Training-Only Activities (stored in excluded_activities table)
export async function fetchTrainingActivityIds(athleteId: number): Promise<number[]> {
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

export async function addTrainingActivity(
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

export async function removeTrainingActivity(
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

// Activity Cache

interface ActivityRow {
  id: number
  athlete_id: number
  name: string
  type: string
  sport_type: string
  start_date: string
  start_date_local: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  average_speed: number
  max_speed: number
  average_watts: number | null
  max_watts: number | null
  weighted_average_watts: number | null
  average_heartrate: number | null
  max_heartrate: number | null
  average_cadence: number | null
  suffer_score: number | null
  kilojoules: number | null
  details_json: ActivityDetailsJson | null
  details_fetched_at: string | null
}

function rowToActivity(row: ActivityRow): StravaActivity {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    sport_type: row.sport_type,
    start_date: row.start_date,
    start_date_local: row.start_date_local,
    distance: row.distance,
    moving_time: row.moving_time,
    elapsed_time: row.elapsed_time,
    total_elevation_gain: row.total_elevation_gain,
    average_speed: row.average_speed,
    max_speed: row.max_speed,
    average_watts: row.average_watts ?? undefined,
    max_watts: row.max_watts ?? undefined,
    weighted_average_watts: row.weighted_average_watts ?? undefined,
    average_heartrate: row.average_heartrate ?? undefined,
    max_heartrate: row.max_heartrate ?? undefined,
    average_cadence: row.average_cadence ?? undefined,
    suffer_score: row.suffer_score ?? undefined,
    kilojoules: row.kilojoules ?? undefined,
  }
}

// Returns null when the query FAILS, as opposed to an empty array for a
// genuinely empty cache. Callers must treat null as "cache state unknown" and
// avoid writing sync results back — deduplication against a partial view of
// the cache creates permanent duplicate rows.
export async function fetchCachedActivities(athleteId: number): Promise<StravaActivity[] | null> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('start_date', { ascending: false })

    if (error) {
      console.warn('Supabase fetch cached activities error:', error.message)
      return null
    }

    return (data as ActivityRow[]).map(rowToActivity)
  } catch (err) {
    console.warn('Supabase fetch cached activities error:', err)
    return null
  }
}

export async function deleteActivities(athleteId: number, ids: number[]): Promise<boolean> {
  if (!supabase || ids.length === 0) return false

  try {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('athlete_id', athleteId)
      .in('id', ids)

    if (error) {
      console.warn('Supabase delete activities error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase delete activities error:', err)
    return false
  }
}

export async function upsertActivities(
  athleteId: number,
  activities: StravaActivity[]
): Promise<boolean> {
  if (!supabase || activities.length === 0) return false

  try {
    const rows = activities.map((a) => ({
      id: a.id,
      athlete_id: athleteId,
      name: a.name,
      type: a.type,
      sport_type: a.sport_type,
      start_date: a.start_date,
      start_date_local: a.start_date_local,
      distance: a.distance,
      moving_time: a.moving_time,
      elapsed_time: a.elapsed_time,
      total_elevation_gain: a.total_elevation_gain,
      average_speed: a.average_speed,
      max_speed: a.max_speed,
      average_watts: a.average_watts ?? null,
      max_watts: a.max_watts ?? null,
      weighted_average_watts: a.weighted_average_watts ?? null,
      average_heartrate: a.average_heartrate ?? null,
      max_heartrate: a.max_heartrate ?? null,
      average_cadence: a.average_cadence ?? null,
      suffer_score: a.suffer_score ?? null,
      kilojoules: a.kilojoules ?? null,
      updated_at: new Date().toISOString(),
    }))

    // Batch in chunks of 500 to avoid payload limits
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await supabase
        .from('activities')
        .upsert(chunk, { onConflict: 'id' })

      if (error) {
        console.warn('Supabase upsert activities error:', error.message)
        return false
      }
    }

    return true
  } catch (err) {
    console.warn('Supabase upsert activities error:', err)
    return false
  }
}

export async function fetchCachedActivityDetails(
  activityId: number
): Promise<{ activity: StravaActivity; details: ActivityDetailsJson } | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.warn('Supabase fetch activity details error:', error.message)
      return null
    }

    const row = data as ActivityRow
    if (!row.details_json) return null

    return {
      activity: rowToActivity(row),
      details: row.details_json,
    }
  } catch (err) {
    console.warn('Supabase fetch activity details error:', err)
    return null
  }
}

export async function clearCachedActivityDetails(activityId: number): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('activities')
      .update({ details_json: null, details_fetched_at: null })
      .eq('id', activityId)
    if (error) {
      console.warn('Supabase clear activity details error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase clear activity details error:', err)
    return false
  }
}

export async function cacheActivityDetails(
  activityId: number,
  details: ActivityDetailsJson
): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('activities')
      .update({
        details_json: details,
        details_fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId)

    if (error) {
      console.warn('Supabase cache activity details error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('Supabase cache activity details error:', err)
    return false
  }
}

// Fetch IDs of Ride/VirtualRide activities that don't have cached details yet
export async function fetchActivityIdsWithoutDetails(athleteId: number): Promise<number[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('id')
      .eq('athlete_id', athleteId)
      .in('type', ['Ride', 'VirtualRide'])
      .is('details_json', null)
      .order('start_date', { ascending: false })

    if (error) {
      console.warn('Supabase fetch uncached activity ids error:', error.message)
      return []
    }

    return (data as { id: number }[]).map((r) => r.id)
  } catch (err) {
    console.warn('Supabase fetch uncached activity ids error:', err)
    return []
  }
}

// Activity Groups
export interface ActivityGroup {
  id: string
  athleteId: number
  name: string
  activityIds: number[]
  createdAt: string
  updatedAt: string
}

interface ActivityGroupRow {
  id: string
  athlete_id: number
  name: string
  activity_ids: number[]
  created_at: string
  updated_at: string
}

function rowToActivityGroup(row: ActivityGroupRow): ActivityGroup {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    name: row.name,
    activityIds: row.activity_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchActivityGroups(athleteId: number): Promise<ActivityGroup[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('activity_groups')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase fetch activity groups error:', error.message)
      return []
    }

    return (data as ActivityGroupRow[]).map(rowToActivityGroup)
  } catch (err) {
    console.warn('Supabase fetch activity groups error:', err)
    return []
  }
}

export async function createActivityGroup(
  athleteId: number,
  name: string,
  activityIds: number[]
): Promise<ActivityGroup | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('activity_groups')
      .insert({
        athlete_id: athleteId,
        name,
        activity_ids: activityIds,
      })
      .select()
      .single()

    if (error) {
      console.warn('Supabase create activity group error:', error.message)
      return null
    }

    return rowToActivityGroup(data as ActivityGroupRow)
  } catch (err) {
    console.warn('Supabase create activity group error:', err)
    return null
  }
}

export async function deleteActivityGroup(groupId: string): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('activity_groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      console.warn('Supabase delete activity group error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('Supabase delete activity group error:', err)
    return false
  }
}

export async function updateActivityGroupName(
  groupId: string,
  name: string
): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('activity_groups')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', groupId)

    if (error) {
      console.warn('Supabase update activity group error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('Supabase update activity group error:', err)
    return false
  }
}

// Segment effort with activity context for time-series charts
export interface SegmentEffortWithActivity extends StravaSegmentEffort {
  activityDate: string
  activityName: string
  activityType: string
}

// Fetch segment effort data from cached activity details for rides with climbing
export async function fetchCachedSegmentData(
  athleteId: number
): Promise<SegmentEffortWithActivity[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('start_date_local, name, type, details_json')
      .eq('athlete_id', athleteId)
      .not('details_json', 'is', null)
      .in('type', ['Ride', 'VirtualRide'])

    if (error) {
      console.warn('Supabase fetch segment data error:', error.message)
      return []
    }

    const segments: SegmentEffortWithActivity[] = []
    for (const row of data as { start_date_local: string; name: string; type: string; details_json: ActivityDetailsJson }[]) {
      const efforts = row.details_json?.segment_efforts
      if (!efforts) continue
      for (const effort of efforts) {
        if (effort.segment && effort.segment.average_grade >= 1) {
          segments.push({
            ...effort,
            activityDate: row.start_date_local,
            activityName: row.name,
            activityType: row.type,
          })
        }
      }
    }

    return segments
  } catch (err) {
    console.warn('Supabase fetch segment data error:', err)
    return []
  }
}

// Fetch ALL segment efforts (not just climbing) from cached activity details
export async function fetchAllCachedSegmentData(
  athleteId: number
): Promise<SegmentEffortWithActivity[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('start_date_local, name, type, details_json')
      .eq('athlete_id', athleteId)
      .not('details_json', 'is', null)
      .in('type', ['Ride', 'VirtualRide'])

    if (error) {
      console.warn('Supabase fetch all segment data error:', error.message)
      return []
    }

    const segments: SegmentEffortWithActivity[] = []
    for (const row of data as { start_date_local: string; name: string; type: string; details_json: ActivityDetailsJson }[]) {
      const efforts = row.details_json?.segment_efforts
      if (!efforts) continue
      for (const effort of efforts) {
        if (effort.segment) {
          segments.push({
            ...effort,
            activityDate: row.start_date_local,
            activityName: row.name,
            activityType: row.type,
          })
        }
      }
    }

    return segments
  } catch (err) {
    console.warn('Supabase fetch all segment data error:', err)
    return []
  }
}

// Best effort with activity context
export interface BestEffortWithActivity extends StravaBestEffort {
  activityDate: string
  activityName: string
  activityId: number
}

// Fetch best efforts (5K, 10K, etc.) from cached activity details
export async function fetchCachedBestEfforts(
  athleteId: number
): Promise<BestEffortWithActivity[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('id, start_date_local, name, details_json')
      .eq('athlete_id', athleteId)
      .not('details_json', 'is', null)
      .in('type', ['Run'])

    if (error) {
      console.warn('Supabase fetch best efforts error:', error.message)
      return []
    }

    const efforts: BestEffortWithActivity[] = []
    for (const row of data as { id: number; start_date_local: string; name: string; details_json: ActivityDetailsJson }[]) {
      const bestEfforts = row.details_json?.best_efforts
      if (!bestEfforts) continue
      for (const effort of bestEfforts) {
        efforts.push({
          ...effort,
          activityDate: row.start_date_local,
          activityName: row.name,
          activityId: row.id,
        })
      }
    }

    return efforts
  } catch (err) {
    console.warn('Supabase fetch best efforts error:', err)
    return []
  }
}

// Power-duration curve for a ride, with activity context
export interface PowerCurveWithActivity {
  activityId: number
  activityName: string
  activityDate: string
  distance: number
  movingTime: number
  curve: Record<number, number>
}

// Fetch cached power-duration curves for all rides that have one
export async function fetchCachedPowerCurves(
  athleteId: number
): Promise<PowerCurveWithActivity[]> {
  if (!supabase) return []

  try {
    // Select only the power_curve JSON sub-path — not the whole details_json blob
    // (which holds large segment/lap/split arrays and would time out the query).
    const { data, error } = await supabase
      .from('activities')
      .select('id, start_date_local, name, distance, moving_time, power_curve:details_json->power_curve')
      .eq('athlete_id', athleteId)
      .in('type', ['Ride', 'VirtualRide'])
      .not('details_json->power_curve', 'is', null)

    if (error) {
      console.warn('Supabase fetch power curves error:', error.message)
      return []
    }

    const curves: PowerCurveWithActivity[] = []
    for (const row of data as {
      id: number
      start_date_local: string
      name: string
      distance: number
      moving_time: number
      power_curve: Record<number, number> | null
    }[]) {
      const curve = row.power_curve
      if (!curve || Object.keys(curve).length === 0) continue
      curves.push({
        activityId: row.id,
        activityName: row.name,
        activityDate: row.start_date_local,
        distance: row.distance,
        movingTime: row.moving_time,
        curve,
      })
    }

    return curves
  } catch (err) {
    console.warn('Supabase fetch power curves error:', err)
    return []
  }
}

// Fetch IDs of rides that have details + power data but no cached power_curve yet
// (i.e. detailed before the power-curve feature existed). Used to backfill.
export async function fetchRideIdsWithoutPowerCurve(athleteId: number): Promise<number[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('id')
      .eq('athlete_id', athleteId)
      .in('type', ['Ride', 'VirtualRide'])
      .not('details_json', 'is', null)
      .not('average_watts', 'is', null)
      .is('details_json->power_curve', null)
      .order('start_date', { ascending: false })

    if (error) {
      console.warn('Supabase fetch rides without power curve error:', error.message)
      return []
    }

    return (data as { id: number }[]).map((r) => r.id)
  } catch (err) {
    console.warn('Supabase fetch rides without power curve error:', err)
    return []
  }
}

// Patch only the power_curve of an already-cached activity's details_json,
// leaving the rest of the cached details intact. Used by the backfill pass.
export async function patchActivityPowerCurve(
  activityId: number,
  curve: Record<number, number>
): Promise<boolean> {
  if (!supabase) return false

  try {
    const existing = await fetchCachedActivityDetails(activityId)
    if (!existing) return false
    return await cacheActivityDetails(activityId, { ...existing.details, power_curve: curve })
  } catch (err) {
    console.warn('Supabase patch power curve error:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Plan week phase overrides. Persists the chosen phase per past week so the
// Plan History view doesn't drift when TSB/ATL recalculate from late syncs.

export type PlanPhaseValue = 'recovery' | 'build'

export interface PlanWeekPhase {
  weekStart: string // YYYY-MM-DD (Monday)
  phase: PlanPhaseValue
}

interface PlanWeekHistoryRow {
  athlete_id: number
  week_start: string
  phase: PlanPhaseValue
}

export async function fetchPlanWeekPhases(athleteId: number): Promise<PlanWeekPhase[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('plan_week_history')
      .select('week_start, phase')
      .eq('athlete_id', athleteId)
      .order('week_start', { ascending: false })

    if (error) {
      console.warn('Supabase fetch plan week phases error:', error.message)
      return []
    }
    return (data as Pick<PlanWeekHistoryRow, 'week_start' | 'phase'>[]).map((r) => ({
      weekStart: r.week_start,
      phase: r.phase,
    }))
  } catch (err) {
    console.warn('Supabase fetch plan week phases error:', err)
    return []
  }
}

export async function upsertPlanWeekPhase(
  athleteId: number,
  weekStart: string,
  phase: PlanPhaseValue,
): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('plan_week_history').upsert(
      {
        athlete_id: athleteId,
        week_start: weekStart,
        phase,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id,week_start' },
    )
    if (error) {
      console.warn('Supabase upsert plan week phase error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase upsert plan week phase error:', err)
    return false
  }
}

export async function deletePlanWeekPhase(
  athleteId: number,
  weekStart: string,
): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('plan_week_history')
      .delete()
      .eq('athlete_id', athleteId)
      .eq('week_start', weekStart)
    if (error) {
      console.warn('Supabase delete plan week phase error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase delete plan week phase error:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Plan day overrides — per-day session-type overrides within a plan week.

export interface PlanDayOverride {
  weekStart: string // YYYY-MM-DD (Monday)
  dayIndex: number // 0..6, Monday = 0
  sessionType: string
}

interface PlanDayOverrideRow {
  week_start: string
  day_index: number
  session_type: string
}

export async function fetchPlanDayOverrides(athleteId: number): Promise<PlanDayOverride[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('plan_day_overrides')
      .select('week_start, day_index, session_type')
      .eq('athlete_id', athleteId)
    if (error) {
      console.warn('Supabase fetch plan day overrides error:', error.message)
      return []
    }
    return (data as PlanDayOverrideRow[]).map((r) => ({
      weekStart: r.week_start,
      dayIndex: r.day_index,
      sessionType: r.session_type,
    }))
  } catch (err) {
    console.warn('Supabase fetch plan day overrides error:', err)
    return []
  }
}

export async function upsertPlanDayOverride(
  athleteId: number,
  weekStart: string,
  dayIndex: number,
  sessionType: string,
): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('plan_day_overrides').upsert(
      {
        athlete_id: athleteId,
        week_start: weekStart,
        day_index: dayIndex,
        session_type: sessionType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id,week_start,day_index' },
    )
    if (error) {
      console.warn('Supabase upsert plan day override error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase upsert plan day override error:', err)
    return false
  }
}

export async function deletePlanDayOverride(
  athleteId: number,
  weekStart: string,
  dayIndex: number,
): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('plan_day_overrides')
      .delete()
      .eq('athlete_id', athleteId)
      .eq('week_start', weekStart)
      .eq('day_index', dayIndex)
    if (error) {
      console.warn('Supabase delete plan day override error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase delete plan day override error:', err)
    return false
  }
}
