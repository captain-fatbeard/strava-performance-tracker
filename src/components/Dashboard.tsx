import { useState, useMemo } from 'react'
import { type StravaActivity, type StravaAthlete, metersToKm } from '~/lib/strava'
import { estimateFTP } from '~/lib/performance'
import { PerformanceCharts } from './PerformanceCharts'
import { ActivityList } from './ActivityList'
import { StatsCards } from './StatsCards'
import { FitnessChart } from './FitnessChart'
import { PowerZonesChart } from './PowerZonesChart'
import { PersonalRecords } from './PersonalRecords'
import { WeeklyProgress } from './WeeklyProgress'
import { AdvancedMetrics } from './AdvancedMetrics'
import { EfficiencyChart } from './EfficiencyChart'

interface DashboardProps {
  athlete: StravaAthlete
  activities: StravaActivity[]
  onLogout: () => void
}

type TimeRange = '30d' | '90d' | '6m' | '1y' | 'all'

const timeRangeToDays: Record<TimeRange, number> = {
  '30d': 30,
  '90d': 90,
  '6m': 180,
  '1y': 365,
  'all': 365 * 3,
}
type ActivityType = 'all' | 'Ride' | 'Run' | 'VirtualRide'

export function Dashboard({ athlete, activities, onLogout }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('90d')
  const [activityType, setActivityType] = useState<ActivityType>('all')
  const [activeTab, setActiveTab] = useState<'overview' | 'fitness' | 'trends' | 'activities'>('overview')
  const [weight, setWeight] = useState<number>(75)

  const filteredActivities = useMemo(() => {
    let filtered = activities

    // Filter by activity type
    if (activityType !== 'all') {
      filtered = filtered.filter((a) => {
        if (activityType === 'Ride') {
          return a.type === 'Ride' || a.type === 'VirtualRide'
        }
        return a.type === activityType || a.sport_type === activityType
      })
    }

    // Filter by time range
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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Performance Tracker</h1>
          <span className="athlete-name">
            {athlete.firstname} {athlete.lastname}
          </span>
        </div>
        <div className="header-right">
          <button onClick={onLogout} className="logout-btn">
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
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'fitness' ? 'active' : ''}
          onClick={() => setActiveTab('fitness')}
        >
          Fitness
        </button>
        <button
          className={activeTab === 'trends' ? 'active' : ''}
          onClick={() => setActiveTab('trends')}
        >
          Trends
        </button>
        <button
          className={activeTab === 'activities' ? 'active' : ''}
          onClick={() => setActiveTab('activities')}
        >
          Activities
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <>
            <StatsCards stats={stats} />
            <PersonalRecords activities={filteredActivities} />
            <WeeklyProgress activities={filteredActivities} />
          </>
        )}

        {activeTab === 'fitness' && (
          <>
            <FitnessChart activities={filteredActivities} days={timeRangeToDays[timeRange]} />
            <AdvancedMetrics activities={filteredActivities} weight={weight} />
            <EfficiencyChart activities={filteredActivities} weight={weight} />
            <PowerZonesChart activities={filteredActivities} />
          </>
        )}

        {activeTab === 'trends' && (
          <PerformanceCharts activities={filteredActivities} showAllCharts />
        )}

        {activeTab === 'activities' && (
          <ActivityList activities={filteredActivities} />
        )}
      </main>
    </div>
  )
}
