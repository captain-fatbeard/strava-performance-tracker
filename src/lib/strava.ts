const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

export interface StravaTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface StravaAthlete {
  id: number
  firstname: string
  lastname: string
  profile: string
  city: string
  country: string
}

export interface StravaActivity {
  id: number
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
  average_watts?: number
  max_watts?: number
  weighted_average_watts?: number
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  suffer_score?: number
  kilojoules?: number
}

export interface StravaBestEffort {
  id: number
  name: string
  elapsed_time: number
  moving_time: number
  start_date: string
  distance: number
  achievements: Array<{ type_id: number; type: string; rank: number }>
}

export interface StravaDetailedActivity extends StravaActivity {
  calories: number
  device_name: string
  device_watts?: boolean
  description: string | null
  workout_type: number | null
  average_temp?: number
  perceived_exertion?: number | null
  achievement_count: number
  kudos_count: number
  comment_count: number
  gear: { id: string; name: string } | null
  segment_efforts: StravaSegmentEffort[]
  splits_metric: StravaSplit[]
  laps: StravaLap[]
  best_efforts: StravaBestEffort[]
  map: {
    id: string
    summary_polyline: string | null
    resource_state: number
  }
  photos: {
    primary: {
      urls: Record<string, string>
    } | null
    count: number
  }
}

export interface StravaSegmentInfo {
  id: number
  name: string
  average_grade: number
  maximum_grade: number
  elevation_high: number
  elevation_low: number
  climb_category: number
  distance: number
}

export interface StravaSegmentEffort {
  id: number
  name: string
  elapsed_time: number
  moving_time: number
  start_date: string
  distance: number
  average_watts?: number
  average_heartrate?: number
  achievements: Array<{ type_id: number; type: string; rank: number }>
  segment?: StravaSegmentInfo
}

export interface StravaSplit {
  distance: number
  elapsed_time: number
  elevation_difference: number
  moving_time: number
  split: number
  average_speed: number
  average_heartrate?: number
  pace_zone: number
}

export interface StravaLap {
  id: number
  name: string
  elapsed_time: number
  moving_time: number
  start_date: string
  distance: number
  average_speed: number
  max_speed: number
  average_watts?: number
  average_heartrate?: number
  max_heartrate?: number
}

export interface ActivityDetailsJson {
  calories: number
  device_name: string
  description: string | null
  workout_type: number | null
  average_temp?: number
  perceived_exertion?: number | null
  achievement_count?: number
  kudos_count?: number
  comment_count?: number
  gear_name: string | null
  segment_efforts: StravaSegmentEffort[]
  splits_metric: StravaSplit[]
  laps: StravaLap[]
  best_efforts: StravaBestEffort[]
  summary_polyline: string | null
  photo_url: string | null
  // True when power values were estimated from speed/gradient physics
  // (no power meter on the ride), like Strava's estimated power.
  power_estimated?: boolean
  estimated_avg_watts?: number
  power_per_km?: number[]
  // Best average power (watts) for each window in POWER_CURVE_DURATIONS, keyed by
  // duration in seconds. Computed from the watts + time streams at sync time.
  power_curve?: Record<number, number>
}

export function getStravaAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read,activity:read_all,profile:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<StravaTokens & { athlete: StravaAthlete }> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Number(clientId),
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.statusText}`)
  }

  return response.json()
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<StravaTokens> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Number(clientId),
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`)
  }

  return response.json()
}

export async function getAthlete(accessToken: string): Promise<StravaAthlete> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to get athlete: ${response.statusText}`)
  }

  return response.json()
}

export async function getActivities(
  accessToken: string,
  options: {
    page?: number
    perPage?: number
    before?: number
    after?: number
  } = {}
): Promise<StravaActivity[]> {
  const params = new URLSearchParams()
  if (options.page) params.set('page', String(options.page))
  if (options.perPage) params.set('per_page', String(options.perPage))
  if (options.before) params.set('before', String(options.before))
  if (options.after) params.set('after', String(options.after))

  const response = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    throw new Error(`Failed to get activities: ${response.statusText}`)
  }

  return response.json()
}

export async function getActivity(
  accessToken: string,
  activityId: number
): Promise<StravaDetailedActivity> {
  const response = await fetch(
    `${STRAVA_API_BASE}/activities/${activityId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    throw new Error(`Failed to get activity: ${response.statusText}`)
  }

  return response.json()
}

export interface StravaStream {
  type: string
  data: number[]
  series_type: string
  original_size: number
  resolution: string
}

export async function getActivityStreams(
  accessToken: string,
  activityId: number,
  keys: string[]
): Promise<Record<string, number[]>> {
  const response = await fetch(
    `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=${keys.join(',')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) return {}

  const json = await response.json()

  // Strava returns an array of stream objects: [{ type: "watts", data: [...] }, ...]
  const result: Record<string, number[]> = {}
  const streams: StravaStream[] = Array.isArray(json) ? json : []
  for (const stream of streams) {
    result[stream.type] = stream.data
  }
  return result
}

// Window durations (seconds) for the power-duration curve / records.
export const POWER_CURVE_DURATIONS = [120, 300, 480, 1200, 1800, 2700] as const

// Best average power (watts) over a rolling window of each target duration,
// computed from the watts + time streams. The time stream is resampled onto a
// 1-second grid (carry-forward) so windows are measured in real elapsed seconds
// regardless of the stream's native resolution. Returns watts keyed by duration.
export function computePowerCurve(
  timeStream: number[],
  wattsStream: number[],
  durations: readonly number[] = POWER_CURVE_DURATIONS
): Record<number, number> {
  const result: Record<number, number> = {}
  if (!timeStream?.length || !wattsStream?.length) return result

  const n = Math.min(timeStream.length, wattsStream.length)
  const t0 = timeStream[0]
  const endSec = timeStream[n - 1] - t0
  if (endSec <= 0) return result

  // Resample watts onto a 1Hz grid, carrying the last sample forward across gaps.
  const grid = new Array<number>(endSec + 1)
  let idx = 0
  for (let s = 0; s <= endSec; s++) {
    while (idx + 1 < n && timeStream[idx + 1] - t0 <= s) idx++
    const w = wattsStream[idx]
    grid[s] = w != null && w > 0 ? w : 0
  }

  // Prefix sums for O(1) window averages.
  const prefix = new Array<number>(grid.length + 1)
  prefix[0] = 0
  for (let i = 0; i < grid.length; i++) prefix[i + 1] = prefix[i] + grid[i]

  for (const d of durations) {
    if (grid.length < d) continue // ride shorter than this window
    let best = 0
    for (let start = 0; start + d <= grid.length; start++) {
      const avg = (prefix[start + d] - prefix[start]) / d
      if (avg > best) best = avg
    }
    result[d] = Math.round(best)
  }
  return result
}

export function computePowerPerKm(
  distanceStream: number[],
  wattsStream: number[]
): number[] {
  if (!distanceStream.length || !wattsStream.length) return []

  const powerPerKm: number[] = []
  let kmBoundary = 1000
  let wattsSum = 0
  let wattsCount = 0

  for (let i = 0; i < distanceStream.length; i++) {
    const dist = distanceStream[i]
    const watts = wattsStream[i]

    if (watts != null && watts > 0) {
      wattsSum += watts
      wattsCount++
    }

    if (dist >= kmBoundary) {
      powerPerKm.push(wattsCount > 0 ? Math.round(wattsSum / wattsCount) : 0)
      wattsSum = 0
      wattsCount = 0
      kmBoundary += 1000
    }
  }

  // Push final partial km if there are remaining samples
  if (wattsCount > 0) {
    powerPerKm.push(Math.round(wattsSum / wattsCount))
  }

  return powerPerKm
}

export async function getAllActivities(
  accessToken: string,
  after?: Date
): Promise<StravaActivity[]> {
  const allActivities: StravaActivity[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const activities = await getActivities(accessToken, {
      page,
      perPage,
      after: after ? Math.floor(after.getTime() / 1000) : undefined,
    })

    allActivities.push(...activities)

    if (activities.length < perPage) break
    page++
  }

  return allActivities
}

// Helper functions for metrics calculations
export function metersToKm(meters: number): number {
  return meters / 1000
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344
}

export function secondsToHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function calculatePace(distanceMeters: number, timeSeconds: number): number {
  // Returns pace in seconds per km
  if (distanceMeters === 0) return 0
  return (timeSeconds / distanceMeters) * 1000
}

export function formatPace(paceSecondsPerKm: number): string {
  const minutes = Math.floor(paceSecondsPerKm / 60)
  const seconds = Math.round(paceSecondsPerKm % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`
}
