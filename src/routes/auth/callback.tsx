import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { handleStravaCallback } from '~/lib/server-functions'
import { storage } from '~/lib/storage'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
  validateSearch: (search: Record<string, unknown>) => ({
    code: search.code as string | undefined,
    error: search.error as string | undefined,
    state: search.state as string | undefined,
  }),
})

function AuthCallback() {
  const { code, error: authError, state } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(authError || null)

  useEffect(() => {
    // If this is a local dev redirect, forward the code to localhost
    if (state?.startsWith('dev_redirect:') && code) {
      const localUrl = state.slice('dev_redirect:'.length)
      window.location.href = `${localUrl}/auth/callback?code=${code}`
      return
    }

    async function handleAuth() {
      if (!code) {
        setError('No authorization code received')
        return
      }

      try {
        const result = await handleStravaCallback({ data: { code } })

        await Promise.all([
          storage.auth.setTokens({
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            expires_at: result.expires_at,
          }),
          storage.auth.setAthlete(result.athlete),
        ])

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
