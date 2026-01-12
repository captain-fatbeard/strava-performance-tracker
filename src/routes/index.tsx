import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getStoredAuth, isTokenExpired, setStoredAuth, clearStoredAuth } from '~/lib/auth-store'
import { getStravaAuthUrl, refreshStravaToken, fetchAllStravaActivities } from '~/lib/server-functions'
import { type StravaActivity, type StravaAthlete } from '~/lib/strava'
import { Dashboard } from '~/components/Dashboard'
import { LoginButton } from '~/components/LoginButton'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null)
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const auth = getStoredAuth()

      if (!auth.tokens || !auth.athlete) {
        setIsLoading(false)
        return
      }

      try {
        let tokens = auth.tokens

        // Refresh token if expired
        if (isTokenExpired(tokens)) {
          const newTokens = await refreshStravaToken({ refreshToken: tokens.refresh_token })
          tokens = newTokens
          setStoredAuth({ tokens, athlete: auth.athlete })
        }

        setAthlete(auth.athlete)

        // Fetch activities from the last year
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        const fetchedActivities = await fetchAllStravaActivities({
          accessToken: tokens.access_token,
          afterDate: oneYearAgo.toISOString(),
        })

        setActivities(fetchedActivities)
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load data. Please try logging in again.')
        clearStoredAuth()
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  const handleLogin = async () => {
    const authUrl = await getStravaAuthUrl()
    window.location.href = authUrl
  }

  const handleLogout = () => {
    clearStoredAuth()
    setAthlete(null)
    setActivities([])
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading your data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <LoginButton onClick={handleLogin} />
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="login-container">
        <h1>Strava Performance Tracker</h1>
        <p>Track your cycling and running performance over time</p>
        <LoginButton onClick={handleLogin} />
      </div>
    )
  }

  return (
    <Dashboard
      athlete={athlete}
      activities={activities}
      onLogout={handleLogout}
    />
  )
}
