const STORAGE_KEY = 'strava_settings'

export interface AppSettings {
  weight: number
  maxHR: number
  restingHR: number
  age: number
  gender: 'male' | 'female'
  timeRange: '30d' | '90d' | '6m' | '1y' | 'all'
  activityType: 'all' | 'Ride' | 'Run' | 'VirtualRide'
  excludedActivityIds: number[]
}

const defaultSettings: AppSettings = {
  weight: 75,
  maxHR: 185,      // Default estimate, user should adjust
  restingHR: 60,   // Default estimate, user should adjust
  age: 35,
  gender: 'male',
  timeRange: '90d',
  activityType: 'all',
  excludedActivityIds: [],
}

export function getStoredSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return defaultSettings
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultSettings
    return { ...defaultSettings, ...JSON.parse(stored) }
  } catch {
    return defaultSettings
  }
}

export function setStoredSettings(settings: Partial<AppSettings>): void {
  if (typeof window === 'undefined') return
  const current = getStoredSettings()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...settings }))
}

export function clearStoredSettings(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
