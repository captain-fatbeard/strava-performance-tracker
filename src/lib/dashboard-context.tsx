import { createContext, useContext } from 'react'
import { type StravaActivity, type StravaAthlete } from './strava'

export type TimeRange = '30d' | '90d' | '6m' | '1y' | 'all'
export type ActivityType = 'all' | 'Ride' | 'Run' | 'VirtualRide'

export const timeRangeToDays: Record<TimeRange, number> = {
  '30d': 30,
  '90d': 90,
  '6m': 180,
  '1y': 365,
  'all': 365 * 3,
}

export interface DashboardContextType {
  athlete: StravaAthlete
  activities: StravaActivity[]
  filteredActivities: StravaActivity[]
  statsActivities: StravaActivity[]
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
  maxHR: number
  setMaxHR: (maxHR: number) => void
  restingHR: number
  setRestingHR: (restingHR: number) => void
  age: number
  setAge: (age: number) => void
  gender: 'male' | 'female'
  setGender: (gender: 'male' | 'female') => void
  timeRangeDays: number
  excludedActivityIds: number[]
  toggleActivityExclusion: (activityId: number) => void
}

export const DashboardContext = createContext<DashboardContextType | null>(null)

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within DashboardLayout')
  }
  return context
}
