import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { storage } from '~/lib/storage'
import { getStravaAuthUrl } from '~/lib/server-functions'
import { LoginButton } from '~/components/LoginButton'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const [tokens, athlete] = await Promise.all([
        storage.auth.getTokens(),
        storage.auth.getAthlete(),
      ])

      if (tokens && athlete) {
        navigate({ to: '/overview' })
      } else {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [navigate])

  const handleLogin = async () => {
    const authUrl = await getStravaAuthUrl()
    window.location.href = authUrl
  }

  if (isChecking) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="login-container">
      <h1>Strava Performance Tracker</h1>
      <p>Track your cycling and running performance over time</p>
      <LoginButton onClick={handleLogin} />
    </div>
  )
}
