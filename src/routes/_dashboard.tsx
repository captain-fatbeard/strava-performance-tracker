import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { storage } from '~/lib/storage'
import {
  DEFAULT_SETTINGS,
  type TimeRange,
  type ActivityType,
} from '~/lib/storage/supabase-client'
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
  fetchUserSettings,
  upsertUserSettings,
  fetchExcludedActivityIds,
  addExcludedActivity,
  removeExcludedActivity,
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_SETTINGS.timeRange)
  const [activityType, setActivityType] = useState<ActivityType>(DEFAULT_SETTINGS.activityType)
  const [maxHR, setMaxHR] = useState<number>(DEFAULT_SETTINGS.maxHR)
  const [restingHR, setRestingHR] = useState<number>(DEFAULT_SETTINGS.restingHR)
  const [age, setAge] = useState<number>(DEFAULT_SETTINGS.age)
  const [gender, setGender] = useState<'male' | 'female'>(DEFAULT_SETTINGS.gender)
  const [excludedActivityIds, setExcludedActivityIds] = useState<number[]>([])

  // Weight tracking state
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([])

  // Derive weight from most recent weight entry
  const weight = useMemo(() => {
    if (weightEntries.length === 0) return 75 // Default weight
    return weightEntries[0].weight // Already sorted by recorded_at DESC
  }, [weightEntries])

  // Track if settings have been loaded to avoid overwriting on mount
  const settingsLoaded = useRef(false)

  // Persist settings changes to database (only after initial load)
  useEffect(() => {
    if (!settingsLoaded.current || !athlete) return

    // Debounce to avoid rapid API calls during slider drags
    const timeoutId = setTimeout(() => {
      if (isSupabaseConfigured()) {
        upsertUserSettings(athlete.id, {
          maxHR,
          restingHR,
          age,
          gender,
          timeRange,
          activityType,
        })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [athlete, maxHR, restingHR, age, gender, timeRange, activityType])

  useEffect(() => {
    async function init() {
      // First check auth - we need athlete ID for settings
      const [tokens, storedAthlete] = await Promise.all([
        storage.auth.getTokens(),
        storage.auth.getAthlete(),
      ])

      if (!tokens || !storedAthlete) {
        navigate({ to: '/' })
        return
      }

      setAthlete(storedAthlete)

      // Load settings and excluded activities from Supabase (requires athlete ID)
      if (isSupabaseConfigured()) {
        const [settings, excludedIds] = await Promise.all([
          fetchUserSettings(storedAthlete.id),
          fetchExcludedActivityIds(storedAthlete.id),
        ])
        if (settings) {
          setTimeRange(settings.timeRange)
          setActivityType(settings.activityType)
          setMaxHR(settings.maxHR)
          setRestingHR(settings.restingHR)
          setAge(settings.age)
          setGender(settings.gender)
        }
        setExcludedActivityIds(excludedIds)
      }
      settingsLoaded.current = true

      try {
        let currentTokens = tokens

        if (await storage.auth.isTokenExpired()) {
          const newTokens = await refreshStravaToken({ data: { refreshToken: tokens.refresh_token } })
          currentTokens = newTokens
          await storage.auth.setTokens(newTokens)
        }

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

  const toggleActivityExclusion = useCallback(
    (activityId: number) => {
      if (!athlete) return

      const isCurrentlyExcluded = excludedActivityIds.includes(activityId)

      // Optimistic update
      setExcludedActivityIds((prev) =>
        isCurrentlyExcluded
          ? prev.filter((id) => id !== activityId)
          : [...prev, activityId]
      )

      // Persist to Supabase
      if (isSupabaseConfigured()) {
        if (isCurrentlyExcluded) {
          removeExcludedActivity(athlete.id, activityId)
        } else {
          addExcludedActivity(athlete.id, activityId)
        }
      }
    },
    [athlete, excludedActivityIds]
  )

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
    const rides = filteredActivities.filter(
      (a) => a.type === 'Ride' || a.type === 'VirtualRide'
    )
    const runs = filteredActivities.filter((a) => a.type === 'Run')

    const totalDistance = filteredActivities.reduce((sum, a) => sum + a.distance, 0)
    const totalElevation = filteredActivities.reduce(
      (sum, a) => sum + a.total_elevation_gain,
      0
    )
    const totalTime = filteredActivities.reduce((sum, a) => sum + a.moving_time, 0)

    const avgPower =
      rides.length > 0
        ? rides.reduce((sum, a) => sum + (a.average_watts || 0), 0) /
          rides.filter((a) => a.average_watts).length
        : 0

    const avgHR =
      filteredActivities.length > 0
        ? filteredActivities.reduce((sum, a) => sum + (a.average_heartrate || 0), 0) /
          filteredActivities.filter((a) => a.average_heartrate).length
        : 0

    const ftp = estimateFTP(rides) || 0
    const wattsPerKilo = ftp > 0 && weight > 0 ? ftp / weight : 0

    return {
      totalActivities: filteredActivities.length,
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
  }, [filteredActivities, weight])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center bg-[radial-gradient(ellipse_at_top,var(--color-bg-secondary)_0%,var(--color-bg-primary)_70%)]">
        <div className="size-12 border-3 border-border-subtle border-t-accent rounded-full animate-spin" />
        <p>Loading your data...</p>
      </div>
    )
  }

  if (error || !athlete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center bg-[radial-gradient(ellipse_at_top,var(--color-bg-secondary)_0%,var(--color-bg-primary)_70%)]">
        <p className="text-danger bg-danger-muted px-6 py-4 rounded-[var(--radius-md)] border border-red-500/30">{error || 'Not authenticated'}</p>
        <Link to="/" className="bg-linear-to-br from-accent to-accent-dark text-white border-none py-3.5 px-7 text-[0.9rem] font-semibold rounded-[var(--radius-md)] cursor-pointer no-underline transition-all duration-200 shadow-md hover:-translate-y-0.5 hover:shadow-lg hover:shadow-glow">Back to Login</Link>
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
      <div className="max-w-[1440px] mx-auto p-8 relative max-md:p-4 max-[480px]:p-3">
        <header className="flex justify-between items-center mb-8 pb-6 border-b border-border-subtle max-md:gap-3 max-md:mb-4 max-md:pb-4">
          <div className="flex flex-col">
            <Link to="/overview" className="flex items-center gap-3 no-underline">
              <svg className="shrink-0" width="32" height="32" viewBox="0 0 32 32" fill="none">
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
              <h1 className="text-[1.75rem] font-bold bg-linear-to-br from-text-primary to-accent-light bg-clip-text text-transparent max-md:text-xl max-[480px]:text-[1.1rem]">FormLab</h1>
            </Link>
            <span className="text-text-muted text-sm mt-1 max-md:hidden">
              {athlete.firstname} {athlete.lastname}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center justify-center bg-bg-tertiary border border-border text-text-secondary size-10 rounded-[var(--radius-md)] cursor-pointer transition-all duration-150 hover:bg-bg-elevated hover:text-text-primary hover:border-accent max-md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button
              className="hidden max-md:flex items-center justify-center bg-bg-tertiary border border-border text-text-secondary size-10 rounded-[var(--radius-md)] cursor-pointer transition-all duration-150 shrink-0 hover:bg-bg-elevated hover:text-text-primary hover:border-accent"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setMobileNavOpen(false)} />
        )}
        <aside className={`hidden max-md:flex flex-col fixed top-0 right-0 h-screen w-70 bg-bg-secondary border-l border-border z-50 shadow-lg transition-transform duration-300 max-[480px]:w-full ${mobileNavOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center p-6 border-b border-border-subtle">
            <h2 className="text-xl font-semibold text-text-primary">Navigation</h2>
            <button
              className="flex items-center justify-center bg-bg-tertiary border border-border text-text-secondary size-9 rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 hover:bg-bg-elevated hover:text-text-primary hover:border-text-muted"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="mobile-nav-links flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
            <Link to="/overview" activeProps={{ className: 'active' }} onClick={() => setMobileNavOpen(false)} className="block py-3 px-4 text-text-secondary no-underline text-[0.9375rem] font-medium rounded-[var(--radius-md)] transition-all duration-150 relative hover:text-text-primary hover:bg-bg-tertiary">
              Overview
            </Link>
            <Link to="/training" activeProps={{ className: 'active' }} onClick={() => setMobileNavOpen(false)} className="block py-3 px-4 text-text-secondary no-underline text-[0.9375rem] font-medium rounded-[var(--radius-md)] transition-all duration-150 relative hover:text-text-primary hover:bg-bg-tertiary">
              Training
            </Link>
            <Link to="/health" activeProps={{ className: 'active' }} onClick={() => setMobileNavOpen(false)} className="block py-3 px-4 text-text-secondary no-underline text-[0.9375rem] font-medium rounded-[var(--radius-md)] transition-all duration-150 relative hover:text-text-primary hover:bg-bg-tertiary">
              Health
            </Link>
            <Link to="/performance" activeProps={{ className: 'active' }} onClick={() => setMobileNavOpen(false)} className="block py-3 px-4 text-text-secondary no-underline text-[0.9375rem] font-medium rounded-[var(--radius-md)] transition-all duration-150 relative hover:text-text-primary hover:bg-bg-tertiary">
              Performance
            </Link>
            <Link to="/activities" activeProps={{ className: 'active' }} onClick={() => setMobileNavOpen(false)} className="block py-3 px-4 text-text-secondary no-underline text-[0.9375rem] font-medium rounded-[var(--radius-md)] transition-all duration-150 relative hover:text-text-primary hover:bg-bg-tertiary">
              Activities
            </Link>
          </div>
          <div className="p-4 border-t border-border-subtle flex flex-col gap-2">
            <button
              className="flex items-center gap-2 bg-bg-tertiary border border-border text-text-secondary py-2.5 px-4 rounded-[var(--radius-sm)] cursor-pointer text-sm font-medium transition-all duration-150 w-full hover:bg-bg-elevated hover:text-text-primary hover:border-accent"
              onClick={() => { setMobileNavOpen(false); setSidebarOpen(true) }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Settings
            </button>
            <button onClick={() => { setMobileNavOpen(false); handleLogout() }} className="bg-bg-tertiary border border-border text-text-secondary py-2.5 px-5 rounded-[var(--radius-sm)] cursor-pointer text-sm font-medium transition-all duration-150 hover:bg-bg-elevated hover:text-text-primary hover:border-text-muted w-full flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </aside>

        {/* Settings sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`fixed top-0 right-0 h-screen w-80 bg-bg-secondary border-l border-border z-50 flex flex-col shadow-lg transition-transform duration-300 max-md:w-full max-md:max-w-80 max-[480px]:max-w-none ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center p-6 border-b border-border-subtle">
            <h2 className="text-xl font-semibold text-text-primary">Settings</h2>
            <button
              className="flex items-center justify-center bg-bg-tertiary border border-border text-text-secondary size-9 rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 hover:bg-bg-elevated hover:text-text-primary hover:border-text-muted"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-8">
              <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-4 pb-2 border-b border-border-subtle">Filters</h3>
              <div className="flex flex-col gap-2 mb-5">
                <label className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">Time Range</label>
                <select
                  className="custom-select w-full bg-bg-tertiary border border-border text-text-primary py-2.5 pr-10 pl-4 rounded-[var(--radius-sm)] text-sm cursor-pointer transition-all duration-150 hover:border-text-muted focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
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

              <div className="flex flex-col gap-2">
                <label className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">Activity Type</label>
                <select
                  className="custom-select w-full bg-bg-tertiary border border-border text-text-primary py-2.5 pr-10 pl-4 rounded-[var(--radius-sm)] text-sm cursor-pointer transition-all duration-150 hover:border-text-muted focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
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

            <div>
              <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-4 pb-2 border-b border-border-subtle">User Profile</h3>
              <div className="flex flex-col gap-2 mb-5 min-w-[200px]">
                <label className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">Max HR: {maxHR} bpm</label>
                <input
                  className="range-thumb w-full h-1.5 bg-bg-tertiary rounded-sm outline-none cursor-pointer appearance-none"
                  type="range"
                  min="150"
                  max="220"
                  value={maxHR}
                  onChange={(e) => setMaxHR(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-2 mb-5 min-w-[200px]">
                <label className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">Resting HR: {restingHR} bpm</label>
                <input
                  className="range-thumb w-full h-1.5 bg-bg-tertiary rounded-sm outline-none cursor-pointer appearance-none"
                  type="range"
                  min="35"
                  max="90"
                  value={restingHR}
                  onChange={(e) => setRestingHR(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-2 mb-5 min-w-[200px]">
                <label className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">Age: {age}</label>
                <input
                  className="range-thumb w-full h-1.5 bg-bg-tertiary rounded-sm outline-none cursor-pointer appearance-none"
                  type="range"
                  min="18"
                  max="80"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">Gender</label>
                <select
                  className="custom-select w-full bg-bg-tertiary border border-border text-text-primary py-2.5 pr-10 pl-4 rounded-[var(--radius-sm)] text-sm cursor-pointer transition-all duration-150 hover:border-text-muted focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border-subtle">
            <button onClick={handleLogout} className="bg-bg-tertiary border border-border text-text-secondary py-2.5 px-5 rounded-[var(--radius-sm)] cursor-pointer text-sm font-medium transition-all duration-150 hover:bg-bg-elevated hover:text-text-primary hover:border-text-muted w-full flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </aside>

        <div className="w-full">
          <nav className="mb-8 max-md:hidden">
            <div className="nav-links flex gap-2 p-2 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-subtle">
              <Link to="/overview" activeProps={{ className: 'active' }} className="bg-transparent border-none text-text-muted py-3 px-6 text-sm font-medium cursor-pointer relative transition-all duration-150 no-underline rounded-[var(--radius-md)] hover:text-text-primary hover:bg-bg-tertiary">
                Overview
              </Link>
              <Link to="/training" activeProps={{ className: 'active' }} className="bg-transparent border-none text-text-muted py-3 px-6 text-sm font-medium cursor-pointer relative transition-all duration-150 no-underline rounded-[var(--radius-md)] hover:text-text-primary hover:bg-bg-tertiary">
                Training
              </Link>
              <Link to="/health" activeProps={{ className: 'active' }} className="bg-transparent border-none text-text-muted py-3 px-6 text-sm font-medium cursor-pointer relative transition-all duration-150 no-underline rounded-[var(--radius-md)] hover:text-text-primary hover:bg-bg-tertiary">
                Health
              </Link>
              <Link to="/performance" activeProps={{ className: 'active' }} className="bg-transparent border-none text-text-muted py-3 px-6 text-sm font-medium cursor-pointer relative transition-all duration-150 no-underline rounded-[var(--radius-md)] hover:text-text-primary hover:bg-bg-tertiary">
                Performance
              </Link>
              <Link to="/activities" activeProps={{ className: 'active' }} className="bg-transparent border-none text-text-muted py-3 px-6 text-sm font-medium cursor-pointer relative transition-all duration-150 no-underline rounded-[var(--radius-md)] hover:text-text-primary hover:bg-bg-tertiary">
                Activities
              </Link>
            </div>
          </nav>

          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
