import { startOfWeek, addWeeks, format } from 'date-fns'
import { type StravaActivity } from './strava'
import { zoneColors } from './chart-theme'

// Estimate FTP from activities (95% of best 20-min power)
export function estimateFTP(activities: StravaActivity[]): number | null {
  const ridesWithPower = activities.filter(
    (a) => (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_watts
  )

  if (ridesWithPower.length === 0) return null

  // Find best average power from rides >= 20 minutes
  const longRides = ridesWithPower.filter((a) => a.moving_time >= 1200)
  if (longRides.length === 0) {
    // Fall back to weighted average watts if available
    const withNP = ridesWithPower.filter((a) => a.weighted_average_watts)
    if (withNP.length > 0) {
      const bestNP = Math.max(...withNP.map((a) => a.weighted_average_watts || 0))
      return Math.round(bestNP * 0.95)
    }
    return null
  }

  const bestAvgPower = Math.max(...longRides.map((a) => a.average_watts || 0))
  return Math.round(bestAvgPower * 0.95)
}

// Power zones based on FTP
export interface PowerZone {
  name: string
  min: number
  max: number
  color: string
}

export function getPowerZones(ftp: number): PowerZone[] {
  return [
    { name: 'Recovery', min: 0, max: Math.round(ftp * 0.55), color: zoneColors[0] },
    { name: 'Endurance', min: Math.round(ftp * 0.55), max: Math.round(ftp * 0.75), color: zoneColors[1] },
    { name: 'Tempo', min: Math.round(ftp * 0.75), max: Math.round(ftp * 0.9), color: zoneColors[2] },
    { name: 'Threshold', min: Math.round(ftp * 0.9), max: Math.round(ftp * 1.05), color: zoneColors[3] },
    { name: 'VO2max', min: Math.round(ftp * 1.05), max: Math.round(ftp * 1.2), color: zoneColors[4] },
    { name: 'Anaerobic', min: Math.round(ftp * 1.2), max: Math.round(ftp * 1.5), color: zoneColors[5] },
    { name: 'Neuromuscular', min: Math.round(ftp * 1.5), max: 9999, color: zoneColors[6] },
  ]
}

export function getZoneForPower(power: number, ftp: number): PowerZone {
  const zones = getPowerZones(ftp)
  return zones.find((z) => power >= z.min && power < z.max) || zones[0]
}

// Calculate zone distribution from activities
export function calculateZoneDistribution(
  activities: StravaActivity[],
  ftp: number
): { zone: string; time: number; percentage: number; color: string }[] {
  const zones = getPowerZones(ftp)
  const zoneTime: Record<string, number> = {}

  zones.forEach((z) => (zoneTime[z.name] = 0))

  const ridesWithPower = activities.filter(
    (a) => (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_watts
  )

  ridesWithPower.forEach((activity) => {
    const zone = getZoneForPower(activity.average_watts || 0, ftp)
    zoneTime[zone.name] += activity.moving_time
  })

  const totalTime = Object.values(zoneTime).reduce((sum, t) => sum + t, 0)

  return zones.map((z) => ({
    zone: z.name,
    time: zoneTime[z.name],
    percentage: totalTime > 0 ? Math.round((zoneTime[z.name] / totalTime) * 100) : 0,
    color: z.color,
  })).filter((z) => z.time > 0)
}

// Training Stress Score (simplified)
export function calculateTSS(activity: StravaActivity, ftp: number): number {
  if (!activity.average_watts || !ftp) return 0

  const normalizedPower = activity.weighted_average_watts || activity.average_watts
  const intensityFactor = normalizedPower / ftp
  const durationHours = activity.moving_time / 3600

  return Math.round(durationHours * intensityFactor * intensityFactor * 100)
}

// Calculate fitness (CTL), fatigue (ATL), and form (TSB)
export interface FitnessData {
  date: string
  ctl: number // Chronic Training Load (fitness)
  atl: number // Acute Training Load (fatigue)
  tsb: number // Training Stress Balance (form)
  tss: number // Daily TSS
}

export function calculateFitnessOverTime(
  activities: StravaActivity[],
  ftp: number,
  days: number = 90
): FitnessData[] {
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Group activities by date
  const dailyTSS: Record<string, number> = {}

  activities
    .filter((a) => (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_watts)
    .forEach((activity) => {
      const date = activity.start_date_local.split('T')[0]
      const tss = calculateTSS(activity, ftp)
      dailyTSS[date] = (dailyTSS[date] || 0) + tss
    })

  const result: FitnessData[] = []
  let ctl = 0
  let atl = 0

  // Iterate through each day
  for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
    // Use local date to match activity.start_date_local format
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const tss = dailyTSS[dateStr] || 0

    // Exponential weighted moving averages
    ctl = ctl + (tss - ctl) / 42 // 42-day time constant
    atl = atl + (tss - atl) / 7 // 7-day time constant
    const tsb = ctl - atl

    result.push({
      date: dateStr,
      ctl: Math.round(ctl),
      atl: Math.round(atl),
      tsb: Math.round(tsb),
      tss,
    })
  }

  return result
}

// Personal Records
export interface PersonalRecord {
  type: string
  value: number
  unit: string
  activity: StravaActivity
  date: string
}

export function calculatePersonalRecords(activities: StravaActivity[]): PersonalRecord[] {
  const records: PersonalRecord[] = []

  const rides = activities.filter((a) => a.type === 'Ride' || a.type === 'VirtualRide')
  const runs = activities.filter((a) => a.type === 'Run')

  // Longest ride
  if (rides.length > 0) {
    const longest = rides.reduce((max, a) => (a.distance > max.distance ? a : max))
    records.push({
      type: 'Longest Ride',
      value: Math.round(longest.distance / 1000),
      unit: 'km',
      activity: longest,
      date: longest.start_date_local,
    })
  }

  // Max power
  const ridesWithPower = rides.filter((a) => a.max_watts)
  if (ridesWithPower.length > 0) {
    const maxPower = ridesWithPower.reduce((max, a) =>
      (a.max_watts || 0) > (max.max_watts || 0) ? a : max
    )
    records.push({
      type: 'Max Power',
      value: maxPower.max_watts || 0,
      unit: 'W',
      activity: maxPower,
      date: maxPower.start_date_local,
    })
  }

  // Best avg power (20+ min)
  const longRidesWithPower = rides.filter((a) => a.average_watts && a.moving_time >= 1200)
  if (longRidesWithPower.length > 0) {
    const bestAvg = longRidesWithPower.reduce((max, a) =>
      (a.average_watts || 0) > (max.average_watts || 0) ? a : max
    )
    records.push({
      type: 'Best Avg Power (20m+)',
      value: Math.round(bestAvg.average_watts || 0),
      unit: 'W',
      activity: bestAvg,
      date: bestAvg.start_date_local,
    })
  }

  // Most elevation
  if (rides.length > 0) {
    const mostClimb = rides.reduce((max, a) =>
      a.total_elevation_gain > max.total_elevation_gain ? a : max
    )
    records.push({
      type: 'Most Climbing',
      value: Math.round(mostClimb.total_elevation_gain),
      unit: 'm',
      activity: mostClimb,
      date: mostClimb.start_date_local,
    })
  }

  // Fastest avg speed (ride)
  const fastRides = rides.filter((a) => a.distance >= 20000) // At least 20km
  if (fastRides.length > 0) {
    const fastest = fastRides.reduce((max, a) =>
      a.average_speed > max.average_speed ? a : max
    )
    records.push({
      type: 'Fastest Ride (20km+)',
      value: Math.round(fastest.average_speed * 3.6 * 10) / 10,
      unit: 'km/h',
      activity: fastest,
      date: fastest.start_date_local,
    })
  }

  // Longest run
  if (runs.length > 0) {
    const longestRun = runs.reduce((max, a) => (a.distance > max.distance ? a : max))
    records.push({
      type: 'Longest Run',
      value: Math.round(longestRun.distance / 100) / 10,
      unit: 'km',
      activity: longestRun,
      date: longestRun.start_date_local,
    })
  }

  // Best run pace (5km+)
  const longRuns = runs.filter((a) => a.distance >= 5000)
  if (longRuns.length > 0) {
    const fastestRun = longRuns.reduce((max, a) =>
      a.average_speed > max.average_speed ? a : max
    )
    const paceSecsPerKm = 1000 / fastestRun.average_speed
    const paceMin = Math.floor(paceSecsPerKm / 60)
    const paceSec = Math.round(paceSecsPerKm % 60)
    records.push({
      type: 'Best Pace (5km+)',
      value: paceMin + paceSec / 100,
      unit: `${paceMin}:${paceSec.toString().padStart(2, '0')}/km`,
      activity: fastestRun,
      date: fastestRun.start_date_local,
    })
  }

  return records
}

// Advanced Metrics

// VO2max estimation from cycling power (ml/kg/min)
// Based on the relationship between power output and oxygen consumption
export function estimateVO2max(ftp: number, weight: number): number {
  if (!ftp || !weight) return 0
  // Formula: VO2max ≈ (10.8 * W/kg) + 7
  // This is based on the linear relationship between power and VO2
  const wattsPerKg = ftp / weight
  return Math.round((10.8 * wattsPerKg + 7) * 10) / 10
}

// Get VO2max category
export function getVO2maxCategory(vo2max: number, gender: 'male' | 'female' = 'male'): string {
  if (gender === 'male') {
    if (vo2max >= 60) return 'Elite'
    if (vo2max >= 52) return 'Excellent'
    if (vo2max >= 45) return 'Good'
    if (vo2max >= 38) return 'Average'
    return 'Below Average'
  } else {
    if (vo2max >= 54) return 'Elite'
    if (vo2max >= 47) return 'Excellent'
    if (vo2max >= 40) return 'Good'
    if (vo2max >= 33) return 'Average'
    return 'Below Average'
  }
}

// Intensity Factor (IF) - how hard was the workout relative to FTP
export function calculateIF(normalizedPower: number, ftp: number): number {
  if (!normalizedPower || !ftp) return 0
  return Math.round((normalizedPower / ftp) * 100) / 100
}

// Variability Index (VI) - how steady was the effort (1.0 = perfectly steady)
export function calculateVI(normalizedPower: number, avgPower: number): number {
  if (!normalizedPower || !avgPower) return 0
  return Math.round((normalizedPower / avgPower) * 100) / 100
}

// VAM (Velocità Ascensionale Media) - climbing speed in m/hour
export function calculateVAM(elevationGain: number, movingTimeSeconds: number): number {
  if (!elevationGain || !movingTimeSeconds) return 0
  const hours = movingTimeSeconds / 3600
  return Math.round(elevationGain / hours)
}

// Efficiency Factor (EF) - aerobic efficiency (higher = fitter)
export function calculateEF(normalizedPower: number, avgHR: number): number {
  if (!normalizedPower || !avgHR) return 0
  return Math.round((normalizedPower / avgHR) * 100) / 100
}

// Power:HR ratio (watts per beat)
export function calculatePowerHR(avgPower: number, avgHR: number): number {
  if (!avgPower || !avgHR) return 0
  return Math.round((avgPower / avgHR) * 100) / 100
}

// Calculate average metrics across activities
export interface AdvancedMetrics {
  avgIF: number
  avgVI: number
  avgVAM: number
  avgEF: number
  avgPowerHR: number
  vo2max: number
  vo2maxCategory: string
  bestVAM: number
  bestEF: number
}

export function calculateAdvancedMetrics(
  activities: StravaActivity[],
  ftp: number,
  weight: number
): AdvancedMetrics {
  const rides = activities.filter(
    (a) => (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_watts
  )

  if (rides.length === 0) {
    return {
      avgIF: 0,
      avgVI: 0,
      avgVAM: 0,
      avgEF: 0,
      avgPowerHR: 0,
      vo2max: 0,
      vo2maxCategory: '',
      bestVAM: 0,
      bestEF: 0,
    }
  }

  let totalIF = 0
  let totalVI = 0
  let totalVAM = 0
  let totalEF = 0
  let totalPowerHR = 0
  let countIF = 0
  let countVI = 0
  let countVAM = 0
  let countEF = 0
  let countPowerHR = 0
  let bestVAM = 0
  let bestEF = 0

  rides.forEach((ride) => {
    const np = ride.weighted_average_watts || ride.average_watts || 0
    const avgPower = ride.average_watts || 0
    const avgHR = ride.average_heartrate || 0

    // IF
    if (ftp > 0) {
      const rideIF = calculateIF(np, ftp)
      totalIF += rideIF
      countIF++
    }

    // VI
    if (np > 0 && avgPower > 0) {
      const rideVI = calculateVI(np, avgPower)
      totalVI += rideVI
      countVI++
    }

    // VAM (only for rides with significant climbing)
    if (ride.total_elevation_gain > 100) {
      const rideVAM = calculateVAM(ride.total_elevation_gain, ride.moving_time)
      totalVAM += rideVAM
      countVAM++
      if (rideVAM > bestVAM) bestVAM = rideVAM
    }

    // EF and Power:HR (need HR data)
    if (avgHR > 0 && np > 0) {
      const rideEF = calculateEF(np, avgHR)
      totalEF += rideEF
      countEF++
      if (rideEF > bestEF) bestEF = rideEF
    }

    if (avgHR > 0 && avgPower > 0) {
      const ridePowerHR = calculatePowerHR(avgPower, avgHR)
      totalPowerHR += ridePowerHR
      countPowerHR++
    }
  })

  const vo2max = estimateVO2max(ftp, weight)

  return {
    avgIF: countIF > 0 ? Math.round((totalIF / countIF) * 100) / 100 : 0,
    avgVI: countVI > 0 ? Math.round((totalVI / countVI) * 100) / 100 : 0,
    avgVAM: countVAM > 0 ? Math.round(totalVAM / countVAM) : 0,
    avgEF: countEF > 0 ? Math.round((totalEF / countEF) * 100) / 100 : 0,
    avgPowerHR: countPowerHR > 0 ? Math.round((totalPowerHR / countPowerHR) * 100) / 100 : 0,
    vo2max,
    vo2maxCategory: getVO2maxCategory(vo2max),
    bestVAM,
    bestEF: Math.round(bestEF * 100) / 100,
  }
}

// Weekly training summary
export interface WeeklySummary {
  week: string
  rides: number
  runs: number
  totalDistance: number
  totalTime: number
  totalElevation: number
  totalTSS: number
  avgPower: number
}

export function calculateWeeklySummaries(
  activities: StravaActivity[],
  ftp: number,
  weeks: number = 12
): WeeklySummary[] {
  const summaries: WeeklySummary[] = []
  const now = new Date()
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday

  for (let w = 0; w < weeks; w++) {
    const weekStart = addWeeks(currentWeekStart, -w)
    const weekEnd = addWeeks(weekStart, 1)

    const weekActivities = activities.filter((a) => {
      const date = new Date(a.start_date)
      return date >= weekStart && date < weekEnd
    })

    const rides = weekActivities.filter((a) => a.type === 'Ride' || a.type === 'VirtualRide')
    const runs = weekActivities.filter((a) => a.type === 'Run')

    const ridesWithPower = rides.filter((a) => a.average_watts)
    const avgPower =
      ridesWithPower.length > 0
        ? ridesWithPower.reduce((sum, a) => sum + (a.average_watts || 0), 0) / ridesWithPower.length
        : 0

    summaries.push({
      week: format(weekStart, 'MMM d'),
      rides: rides.length,
      runs: runs.length,
      totalDistance: Math.round(weekActivities.reduce((sum, a) => sum + a.distance, 0) / 1000),
      totalTime: weekActivities.reduce((sum, a) => sum + a.moving_time, 0),
      totalElevation: Math.round(weekActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0)),
      totalTSS: rides.reduce((sum, a) => sum + calculateTSS(a, ftp), 0),
      avgPower: Math.round(avgPower),
    })
  }

  return summaries.reverse()
}
