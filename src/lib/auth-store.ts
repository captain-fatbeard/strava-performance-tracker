import { type StravaAthlete, type StravaTokens } from './strava'

const STORAGE_KEY = 'strava_auth'

export interface AuthState {
  tokens: StravaTokens | null
  athlete: StravaAthlete | null
}

export function getStoredAuth(): AuthState {
  if (typeof window === 'undefined') {
    return { tokens: null, athlete: null }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { tokens: null, athlete: null }
    return JSON.parse(stored)
  } catch {
    return { tokens: null, athlete: null }
  }
}

export function setStoredAuth(state: AuthState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function isTokenExpired(tokens: StravaTokens): boolean {
  // Add 60 second buffer
  return Date.now() / 1000 > tokens.expires_at - 60
}
