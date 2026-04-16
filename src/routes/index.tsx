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
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center hero-gradient">
        <div className="size-12 border-3 border-border-subtle border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8 text-center hero-gradient relative overflow-hidden">
      {/* Animated orbs */}
      <div className="orb w-[500px] h-[500px] bg-accent/[0.07] top-[-10%] left-[-10%] animate-float" />
      <div className="orb w-[400px] h-[400px] bg-accent-secondary/[0.05] bottom-[-5%] right-[-5%] animate-float" style={{ animationDelay: '-3s' }} />
      <div className="orb w-[300px] h-[300px] bg-accent-muted/[0.06] top-[30%] right-[10%] animate-float" style={{ animationDelay: '-1.5s' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
        <div className="relative">
          <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
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
          <div className="absolute -inset-4 bg-accent/20 rounded-2xl blur-2xl animate-pulse-glow" />
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-6xl font-extrabold tracking-tight bg-linear-to-br from-text-primary via-text-primary to-accent-light bg-clip-text text-transparent max-md:text-5xl">
            FormLab
          </h1>
          <p className="text-text-secondary text-lg max-w-[420px] font-light tracking-wide">
            Precision analytics for your training data
          </p>
        </div>
        <LoginButton onClick={handleLogin} />
        <p className="text-text-muted text-xs tracking-wide mt-2">
          Connects securely with your Strava account
        </p>
      </div>
    </div>
  )
}
