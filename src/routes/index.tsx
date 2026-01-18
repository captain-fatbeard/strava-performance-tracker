import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getStoredAuth } from '~/lib/auth-store'
import { getStravaAuthUrl } from '~/lib/server-functions'
import { LoginButton } from '~/components/LoginButton'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const auth = getStoredAuth()
    if (auth.tokens && auth.athlete) {
      navigate({ to: '/overview' })
    } else {
      setIsChecking(false)
    }
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
