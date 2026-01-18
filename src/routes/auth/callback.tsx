import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { handleStravaCallback } from '~/lib/server-functions'
import { setStoredAuth } from '~/lib/auth-store'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
  validateSearch: (search: Record<string, unknown>) => ({
    code: search.code as string | undefined,
    error: search.error as string | undefined,
  }),
})

function AuthCallback() {
  const { code, error: authError } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(authError || null)

  useEffect(() => {
    async function handleAuth() {
      if (!code) {
        setError('No authorization code received')
        return
      }

      try {
        const result = await handleStravaCallback({ data: { code } })

        setStoredAuth({
          tokens: {
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            expires_at: result.expires_at,
          },
          athlete: result.athlete,
        })

        navigate({ to: '/overview' })
      } catch (err) {
        console.error('Auth error:', err)
        setError('Failed to complete authentication')
      }
    }

    if (!authError) {
      handleAuth()
    }
  }, [code, authError, navigate])

  if (error) {
    return (
      <div className="auth-callback">
        <h1>Authentication Error</h1>
        <p className="error-message">{error}</p>
        <a href="/">Go back home</a>
      </div>
    )
  }

  return (
    <div className="auth-callback">
      <div className="loading-spinner" />
      <p>Completing authentication...</p>
    </div>
  )
}
