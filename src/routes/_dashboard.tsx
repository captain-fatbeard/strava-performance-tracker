import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo, createContext, useContext } from 'react'
import { getStoredAuth, isTokenExpired, setStoredAuth, clearStoredAuth } from '~/lib/auth-store'
import { getStoredSettings, setStoredSettings } from '~/lib/settings-store'
import { refreshStravaToken, fetchAllStravaActivities } from '~/lib/server-functions'
import { type StravaActivity, type StravaAthlete, metersToKm } from '~/lib/strava'
import { estimateFTP } from '~/lib/performance'

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayout,
})

type TimeRange = '30d' | '90d' | '6m' | '1y' | 'all'
type ActivityType = 'all' | 'Ride' | 'Run' | 'VirtualRide'

const timeRangeToDays: Record<TimeRange, number> = {
  '30d': 30,
  '90d': 90,
  '6m': 180,
  '1y': 365,
  'all': 365 * 3,
}

interface DashboardContextType {
  athlete: StravaAthlete
  activities: StravaActivity[]
  filteredActivities: StravaActivity[]
  stats: {
    totalActivities: number
    totalDistance: number
    totalElevation: number
    totalTime: number
    avgPower: number
    avgHR: number
    rides: number
    runs: number
    ftp: number
    wattsPerKilo: number
  }
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void
  activityType: ActivityType
  setActivityType: (type: ActivityType) => void
  weight: number
  setWeight: (weight: number) => void
  timeRangeDays: number
}

const DashboardContext = createContext<DashboardContextType | null>(null)

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within DashboardLayout')
  }
  return context
}

function DashboardLayout() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null)
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [error, setError] = useState<string | null>(null)

  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const stored = getStoredSettings()
    return (stored.timeRange as TimeRange) || '90d'
  })
  const [activityType, setActivityType] = useState<ActivityType>(() => {
    const stored = getStoredSettings()
    return (stored.activityType as ActivityType) || 'all'
  })
  const [weight, setWeight] = useState<number>(() => {
    const stored = getStoredSettings()
    return stored.weight || 75
  })

  useEffect(() => {
    setStoredSettings({ weight, timeRange, activityType })
  }, [weight, timeRange, activityType])

  useEffect(() => {
    async function init() {
      const auth = getStoredAuth()

      if (!auth.tokens || !auth.athlete) {
        navigate({ to: '/' })
        return
      }

      try {
        let tokens = auth.tokens

        if (isTokenExpired(tokens)) {
          const newTokens = await refreshStravaToken({ data: { refreshToken: tokens.refresh_token } })
          tokens = newTokens
          setStoredAuth({ tokens, athlete: auth.athlete })
        }

        setAthlete(auth.athlete)

        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        const fetchedActivities = await fetchAllStravaActivities({
          data: {
            accessToken: tokens.access_token,
            afterDate: oneYearAgo.toISOString(),
          },
        })

        setActivities(fetchedActivities)
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load data. Please try logging in again.')
        clearStoredAuth()
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [navigate])

  const handleLogout = () => {
    clearStoredAuth()
    navigate({ to: '/' })
  }

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
    stats,
    timeRange,
    setTimeRange,
    activityType,
    setActivityType,
    weight,
    setWeight,
    timeRangeDays: timeRangeToDays[timeRange],
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Performance Tracker</h1>
            <span className="athlete-name">
              {athlete.firstname} {athlete.lastname}
            </span>
          </div>
          <div className="header-right">
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>

        <div className="filters">
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
        </div>

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
    </DashboardContext.Provider>
  )
}
