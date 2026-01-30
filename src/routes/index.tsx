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
      <svg className="login-logo" width="64" height="64" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="url(#login-logo-gradient)"/>
        <path d="M8 22L12 14L16 18L20 10L24 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="14" r="2" fill="white"/>
        <circle cx="16" cy="18" r="2" fill="white"/>
        <circle cx="20" cy="10" r="2" fill="white"/>
        <defs>
          <linearGradient id="login-logo-gradient" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#14b8a6"/>
            <stop offset="1" stopColor="#0891b2"/>
          </linearGradient>
        </defs>
      </svg>
      <h1>FormLab</h1>
      <p>Analyze your fitness form and training metrics</p>
      <LoginButton onClick={handleLogin} />
    </div>
  )
}
