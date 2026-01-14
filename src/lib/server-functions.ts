import { createServerFn } from '@tanstack/react-start'
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  getActivities,
  getActivity,
  getAthlete,
  type StravaTokens,
  type StravaAthlete,
  type StravaActivity,
  type StravaDetailedActivity,
} from './strava'

// Environment variables (set these in your deployment)
const getEnv = () => ({
  STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID || '',
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET || '',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
})

export const getStravaAuthUrl = createServerFn({ method: 'GET' }).handler(async () => {
  const env = getEnv()
  const redirectUri = `${env.APP_URL}/auth/callback`
  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read,activity:read_all,profile:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
})

export const handleStravaCallback = createServerFn({ method: 'POST' })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const env = getEnv()
    console.log('[Auth] Exchanging code, client_id:', env.STRAVA_CLIENT_ID, 'code:', data.code?.substring(0, 10) + '...')
    try {
      const result = await exchangeCodeForTokens(
        data.code,
        env.STRAVA_CLIENT_ID,
        env.STRAVA_CLIENT_SECRET
      )
      console.log('[Auth] Success, got athlete:', result.athlete?.firstname)
      return result
    } catch (err) {
      console.error('[Auth] Failed:', err)
      throw err
    }
  })

export const refreshStravaToken = createServerFn({ method: 'POST' })
  .inputValidator((data: { refreshToken: string }) => data)
  .handler(async ({ data }) => {
    const env = getEnv()
    const tokens = await refreshAccessToken(
      data.refreshToken,
      env.STRAVA_CLIENT_ID,
      env.STRAVA_CLIENT_SECRET
    )
    return tokens
  })

export const fetchStravaAthlete = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }): Promise<StravaAthlete> => {
    return getAthlete(data.accessToken)
  })

export const fetchStravaActivities = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; page?: number; perPage?: number; after?: number }) => data)
  .handler(async ({ data }): Promise<StravaActivity[]> => {
    return getActivities(data.accessToken, {
      page: data.page,
      perPage: data.perPage,
      after: data.after,
    })
  })

export const fetchStravaActivity = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; activityId: number }) => data)
  .handler(async ({ data }): Promise<StravaDetailedActivity> => {
    return getActivity(data.accessToken, data.activityId)
  })

export const fetchAllStravaActivities = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; afterDate?: string }) => data)
  .handler(async ({ data }): Promise<StravaActivity[]> => {
    const allActivities: StravaActivity[] = []
    let page = 1
    const perPage = 100
    const after = data.afterDate ? Math.floor(new Date(data.afterDate).getTime() / 1000) : undefined

    while (true) {
      const activities = await getActivities(data.accessToken, {
        page,
        perPage,
        after,
      })

      allActivities.push(...activities)

      if (activities.length < perPage) break
      page++

      // Safety limit
      if (page > 50) break
    }

    return allActivities
  })
