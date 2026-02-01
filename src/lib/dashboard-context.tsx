import { createContext, useContext } from 'react'
import { type StravaActivity, type StravaAthlete } from './strava'
import { type TimeRange, type ActivityType, type Gender } from './storage'
import type { WeightEntry } from './storage/supabase-client'

export type { TimeRange, ActivityType, Gender }
export type { WeightEntry }

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
  gender: Gender
  setGender: (gender: Gender) => void
  timeRangeDays: number
  excludedActivityIds: number[]
  toggleActivityExclusion: (activityId: number) => void
  weightEntries: WeightEntry[]
  addWeightEntry: (weight: number, recordedAt: Date) => Promise<boolean>
  deleteWeightEntry: (id: string) => Promise<boolean>
}

export const DashboardContext = createContext<DashboardContextType | null>(null)

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within DashboardLayout')
  }
  return context
}
