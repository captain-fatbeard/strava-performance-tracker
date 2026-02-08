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
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center bg-[radial-gradient(ellipse_at_top,var(--color-bg-secondary)_0%,var(--color-bg-primary)_70%)]">
        <h1>Authentication Error</h1>
        <p className="text-danger bg-danger-muted px-6 py-4 rounded-[var(--radius-md)] border border-red-500/30">{error}</p>
        <a href="/">Go back home</a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center bg-[radial-gradient(ellipse_at_top,var(--color-bg-secondary)_0%,var(--color-bg-primary)_70%)]">
      <div className="size-12 border-3 border-border-subtle border-t-accent rounded-full animate-spin" />
      <p>Completing authentication...</p>
    </div>
  )
}
