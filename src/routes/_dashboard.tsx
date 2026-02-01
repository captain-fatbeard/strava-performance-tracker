import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { storage, DEFAULT_SETTINGS, type TimeRange, type ActivityType } from '~/lib/storage'
import { refreshStravaToken, fetchAllStravaActivities } from '~/lib/server-functions'
import { type StravaActivity, type StravaAthlete, metersToKm } from '~/lib/strava'
import { estimateFTP } from '~/lib/performance'
import {
  DashboardContext,
  type DashboardContextType,
  timeRangeToDays,
} from '~/lib/dashboard-context'
import {
  fetchWeightEntries,
  addWeightEntry as addWeightEntryToDb,
  deleteWeightEntry as deleteWeightEntryFromDb,
  isSupabaseConfigured,
  type WeightEntry,
} from '~/lib/storage/supabase-client'

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null)
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_SETTINGS.timeRange)
  const [activityType, setActivityType] = useState<ActivityType>(DEFAULT_SETTINGS.activityType)
  const [weight, setWeight] = useState<number>(DEFAULT_SETTINGS.weight)
  const [maxHR, setMaxHR] = useState<number>(DEFAULT_SETTINGS.maxHR)
  const [restingHR, setRestingHR] = useState<number>(DEFAULT_SETTINGS.restingHR)
  const [age, setAge] = useState<number>(DEFAULT_SETTINGS.age)
  const [gender, setGender] = useState<'male' | 'female'>(DEFAULT_SETTINGS.gender)
  const [excludedActivityIds, setExcludedActivityIds] = useState<number[]>(
    DEFAULT_SETTINGS.excludedActivityIds
  )

  // Weight tracking state
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([])

  // Track if settings have been loaded to avoid overwriting on mount
  const settingsLoaded = useRef(false)

  // Persist settings changes (only after initial load)
  useEffect(() => {
    if (!settingsLoaded.current) return

    storage.settings.update({
      weight,
      maxHR,
      restingHR,
      age,
      gender,
      timeRange,
      activityType,
      excludedActivityIds,
    })
  }, [weight, maxHR, restingHR, age, gender, timeRange, activityType, excludedActivityIds])

  useEffect(() => {
    async function init() {
      // Load stored settings
      const settings = await storage.settings.get()
      setTimeRange(settings.timeRange)
      setActivityType(settings.activityType)
      setWeight(settings.weight)
      setMaxHR(settings.maxHR)
      setRestingHR(settings.restingHR)
      setAge(settings.age)
      setGender(settings.gender)
      setExcludedActivityIds(settings.excludedActivityIds)
      settingsLoaded.current = true

      // Check auth
      const [tokens, storedAthlete] = await Promise.all([
        storage.auth.getTokens(),
        storage.auth.getAthlete(),
      ])

      if (!tokens || !storedAthlete) {
        navigate({ to: '/' })
        return
      }

      try {
        let currentTokens = tokens

        if (await storage.auth.isTokenExpired()) {
          const newTokens = await refreshStravaToken({ data: { refreshToken: tokens.refresh_token } })
          currentTokens = newTokens
          await storage.auth.setTokens(newTokens)
        }

        setAthlete(storedAthlete)

        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        const fetchedActivities = await fetchAllStravaActivities({
          data: {
            accessToken: currentTokens.access_token,
            afterDate: oneYearAgo.toISOString(),
          },
        })

        setActivities(fetchedActivities)
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load data. Please try logging in again.')
        await storage.auth.clear()
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [navigate])

  const handleLogout = async () => {
    await storage.auth.clear()
    navigate({ to: '/' })
  }

  const toggleActivityExclusion = (activityId: number) => {
    setExcludedActivityIds((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    )
  }

  // Load weight entries when athlete is available
  useEffect(() => {
    if (athlete && isSupabaseConfigured()) {
      fetchWeightEntries(athlete.id).then(setWeightEntries)
    }
  }, [athlete])

  const handleAddWeightEntry = useCallback(
    async (weightValue: number, recordedAt: Date): Promise<boolean> => {
      if (!athlete) return false
      const entry = await addWeightEntryToDb(athlete.id, weightValue, recordedAt)
      if (entry) {
        setWeightEntries((prev) =>
          [entry, ...prev].sort(
            (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
          )
        )
        return true
      }
      return false
    },
    [athlete]
  )

  const handleDeleteWeightEntry = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteWeightEntryFromDb(id)
    if (success) {
      setWeightEntries((prev) => prev.filter((e) => e.id !== id))
    }
    return success
  }, [])

  const filteredActivities = useMemo(() => {
    let filtered = activities

    if (activityType !== 'all') {
      filtered = filtered.filter((a) => {
        if (activityType === 'Ride') {
          return a.type === 'Ride' || a.type === 'VirtualRide'
        }
        return a.type === activityType || a.sport_type === activityType
      })
    }

    const now = new Date()
    let cutoff: Date

    switch (timeRange) {
      case '30d':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '6m':
        cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        cutoff = new Date(0)
    }

    filtered = filtered.filter((a) => new Date(a.start_date) >= cutoff)

    return filtered.sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    )
  }, [activities, timeRange, activityType])

  const statsActivities = useMemo(() => {
    return filteredActivities.filter((a) => !excludedActivityIds.includes(a.id))
  }, [filteredActivities, excludedActivityIds])

  const stats = useMemo(() => {
    const rides = statsActivities.filter(
      (a) => a.type === 'Ride' || a.type === 'VirtualRide'
    )
    const runs = statsActivities.filter((a) => a.type === 'Run')

    const totalDistance = statsActivities.reduce((sum, a) => sum + a.distance, 0)
    const totalElevation = statsActivities.reduce(
      (sum, a) => sum + a.total_elevation_gain,
      0
    )
    const totalTime = statsActivities.reduce((sum, a) => sum + a.moving_time, 0)

    const avgPower =
      rides.length > 0
        ? rides.reduce((sum, a) => sum + (a.average_watts || 0), 0) /
          rides.filter((a) => a.average_watts).length
        : 0

    const avgHR =
      statsActivities.length > 0
        ? statsActivities.reduce((sum, a) => sum + (a.average_heartrate || 0), 0) /
          statsActivities.filter((a) => a.average_heartrate).length
        : 0

    const ftp = estimateFTP(rides) || 0
    const wattsPerKilo = ftp > 0 && weight > 0 ? ftp / weight : 0

    return {
      totalActivities: statsActivities.length,
      totalDistance: metersToKm(totalDistance),
      totalElevation,
      totalTime,
      avgPower: Math.round(avgPower),
      avgHR: Math.round(avgHR),
      rides: rides.length,
      runs: runs.length,
      ftp,
      wattsPerKilo,
    }
  }, [statsActivities, weight])

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading your data...</p>
      </div>
    )
  }

  if (error || !athlete) {
    return (
      <div className="error-container">
        <p className="error-message">{error || 'Not authenticated'}</p>
        <Link to="/" className="btn-primary">Back to Login</Link>
      </div>
    )
  }

  const contextValue: DashboardContextType = {
    athlete,
    activities,
    filteredActivities,
    statsActivities,
    stats,
    timeRange,
    setTimeRange,
    activityType,
    setActivityType,
    weight,
    setWeight,
    maxHR,
    setMaxHR,
    restingHR,
    setRestingHR,
    age,
    setAge,
    gender,
    setGender,
    timeRangeDays: timeRangeToDays[timeRange],
    excludedActivityIds,
    toggleActivityExclusion,
    weightEntries,
    addWeightEntry: handleAddWeightEntry,
    deleteWeightEntry: handleDeleteWeightEntry,
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="brand">
              <svg className="logo" width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#logo-gradient)"/>
                <path d="M8 22L12 14L16 18L20 10L24 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="14" r="2" fill="white"/>
                <circle cx="16" cy="18" r="2" fill="white"/>
                <circle cx="20" cy="10" r="2" fill="white"/>
                <defs>
                  <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#14b8a6"/>
                    <stop offset="1" stopColor="#0891b2"/>
                  </linearGradient>
                </defs>
              </svg>
              <h1>FormLab</h1>
            </div>
            <span className="athlete-name">
              {athlete.firstname} {athlete.lastname}
            </span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </header>

        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>Settings</h2>
            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="sidebar-content">
            <div className="sidebar-section">
              <h3>Filters</h3>
              <div className="filter-group">
                <label>Time Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                >
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="6m">Last 6 months</option>
                  <option value="1y">Last year</option>
                  <option value="all">All time</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Activity Type</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as ActivityType)}
                >
                  <option value="all">All activities</option>
                  <option value="Ride">Cycling (incl. Zwift)</option>
                  <option value="Run">Running</option>
                  <option value="VirtualRide">Zwift only</option>
                </select>
              </div>
            </div>

            <div className="sidebar-section">
              <h3>User Profile</h3>
              <div className="filter-group weight-slider">
                <label>Weight: {weight} kg</label>
                <input
                  type="range"
                  min="40"
                  max="150"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                />
              </div>

              <div className="filter-group weight-slider">
                <label>Max HR: {maxHR} bpm</label>
                <input
                  type="range"
                  min="150"
                  max="220"
                  value={maxHR}
                  onChange={(e) => setMaxHR(Number(e.target.value))}
                />
              </div>

              <div className="filter-group weight-slider">
                <label>Resting HR: {restingHR} bpm</label>
                <input
                  type="range"
                  min="35"
                  max="90"
                  value={restingHR}
                  onChange={(e) => setRestingHR(Number(e.target.value))}
                />
              </div>

              <div className="filter-group weight-slider">
                <label>Age: {age}</label>
                <input
                  type="range"
                  min="18"
                  max="80"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                />
              </div>

              <div className="filter-group">
                <label>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          <div className="sidebar-footer">
            <button onClick={handleLogout} className="logout-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </aside>

        <div className="dashboard-main">
          <nav className="dashboard-tabs">
            <Link to="/overview" activeProps={{ className: 'active' }}>
              Overview
            </Link>
            <Link to="/fitness" activeProps={{ className: 'active' }}>
              Fitness
            </Link>
            <Link to="/trends" activeProps={{ className: 'active' }}>
              Trends
            </Link>
            <Link to="/activities" activeProps={{ className: 'active' }}>
              Activities
            </Link>
          </nav>

          <main className="dashboard-content">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
