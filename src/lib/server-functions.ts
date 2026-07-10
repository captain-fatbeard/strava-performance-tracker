import { createServerFn } from '@tanstack/react-start'
import { type StravaAthlete, type StravaActivity, type ActivityDetailsJson } from './strava'
import {
  listIntervalsActivities,
  getIntervalsActivity,
  getIntervalsStreams,
  mapIntervalsActivity,
  buildDetailsFromIntervals,
  toIntervalsApiId,
  isIntervalsActivityId,
} from './intervals'

// Environment variables (set these in your deployment)
const getEnv = () => ({
  INTERVALS_API_KEY: process.env.INTERVALS_API_KEY || '',
  APP_PASSPHRASE: process.env.APP_PASSPHRASE || '',
  // Athlete id used to key all Supabase data. Matches the original Strava
  // athlete id so history, settings and weight entries stay attached.
  APP_ATHLETE_ID: process.env.APP_ATHLETE_ID || '',
})

function requireAuth(passphrase: string) {
  const env = getEnv()
  if (!env.APP_PASSPHRASE) {
    throw new Error('APP_PASSPHRASE is not configured')
  }
  if (passphrase !== env.APP_PASSPHRASE) {
    throw new Error('Invalid passphrase')
  }
  if (!env.INTERVALS_API_KEY) {
    throw new Error('INTERVALS_API_KEY is not configured')
  }
  if (!env.APP_ATHLETE_ID) {
    throw new Error('APP_ATHLETE_ID is not configured')
  }
  return env
}

interface IntervalsAthleteProfile {
  id: string
  name: string | null
  city: string | null
  country: string | null
}

export const verifyPassphrase = createServerFn({ method: 'POST' })
  .inputValidator((data: { passphrase: string }) => data)
  .handler(async ({ data }): Promise<StravaAthlete> => {
    const env = requireAuth(data.passphrase)

    const auth = Buffer.from(`API_KEY:${env.INTERVALS_API_KEY}`).toString('base64')
    const response = await fetch('https://intervals.icu/api/v1/athlete/0', {
      headers: { Authorization: `Basic ${auth}` },
    })
    if (!response.ok) {
      throw new Error(`Failed to load intervals.icu profile: ${response.status}`)
    }
    const profile: IntervalsAthleteProfile = await response.json()

    const [firstname = '', ...rest] = (profile.name ?? '').split(' ')
    return {
      id: Number(env.APP_ATHLETE_ID),
      firstname,
      lastname: rest.join(' '),
      profile: '',
      city: profile.city ?? '',
      country: profile.country ?? '',
    }
  })

export const fetchIntervalsActivities = createServerFn({ method: 'POST' })
  .inputValidator((data: { passphrase: string; afterDate?: string }) => data)
  .handler(async ({ data }): Promise<StravaActivity[]> => {
    const env = requireAuth(data.passphrase)
    const activities = await listIntervalsActivities(env.INTERVALS_API_KEY, data.afterDate)
    return activities.map(mapIntervalsActivity)
  })

export const fetchIntervalsActivityDetails = createServerFn({ method: 'POST' })
  .inputValidator((data: { passphrase: string; activityId: number; riderWeight?: number }) => data)
  .handler(async ({ data }): Promise<ActivityDetailsJson | null> => {
    const env = requireAuth(data.passphrase)

    // Legacy Strava-era activities can no longer be fetched from any API;
    // whatever details were cached before the cutover is all there is.
    if (!isIntervalsActivityId(data.activityId)) return null

    const apiId = toIntervalsApiId(data.activityId)
    const activity = await getIntervalsActivity(env.INTERVALS_API_KEY, apiId)
    const wanted = ['time', 'watts', 'distance', 'heartrate', 'altitude', 'velocity_smooth', 'latlng']
    const available = activity.stream_types
      ? wanted.filter((t) => activity.stream_types!.includes(t))
      : wanted
    const streams = available.length
      ? await getIntervalsStreams(env.INTERVALS_API_KEY, apiId, available)
      : { numeric: {} }

    return buildDetailsFromIntervals(activity, streams, data.riderWeight)
  })
