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

export interface StravaDetailedActivity extends StravaActivity {
  calories: number
  device_name: string
  segment_efforts: StravaSegmentEffort[]
  splits_metric: StravaSplit[]
  laps: StravaLap[]
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
