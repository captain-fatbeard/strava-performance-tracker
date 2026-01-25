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

// ==========================================
// Fat Burning & Heart Rate Zone Calculations
// ==========================================

export interface HRZone {
  name: string
  min: number
  max: number
  fatBurnRatio: number // Percentage of calories from fat at this zone
  color: string
}

// Calculate HR zones using Karvonen formula (Heart Rate Reserve method)
// More accurate than simple % of max HR
export function getHRZones(maxHR: number, restingHR: number): HRZone[] {
  const hrr = maxHR - restingHR // Heart Rate Reserve

  return [
    {
      name: 'Zone 1 (Recovery)',
      min: Math.round(restingHR + hrr * 0.5),
      max: Math.round(restingHR + hrr * 0.6),
      fatBurnRatio: 0.85, // 85% of calories from fat
      color: '#4a5568',
    },
    {
      name: 'Zone 2 (Fat Burn)',
      min: Math.round(restingHR + hrr * 0.6),
      max: Math.round(restingHR + hrr * 0.7),
      fatBurnRatio: 0.65, // 65% of calories from fat - optimal fat burning
      color: '#5a7a6b',
    },
    {
      name: 'Zone 3 (Aerobic)',
      min: Math.round(restingHR + hrr * 0.7),
      max: Math.round(restingHR + hrr * 0.8),
      fatBurnRatio: 0.45, // 45% from fat
      color: '#7a7a5a',
    },
    {
      name: 'Zone 4 (Threshold)',
      min: Math.round(restingHR + hrr * 0.8),
      max: Math.round(restingHR + hrr * 0.9),
      fatBurnRatio: 0.25, // 25% from fat
      color: '#8a6a5a',
    },
    {
      name: 'Zone 5 (Max)',
      min: Math.round(restingHR + hrr * 0.9),
      max: maxHR,
      fatBurnRatio: 0.1, // 10% from fat
      color: '#7a5a6a',
    },
  ]
}

// Get which HR zone a given heart rate falls into
export function getHRZoneForBPM(hr: number, maxHR: number, restingHR: number): HRZone | null {
  const zones = getHRZones(maxHR, restingHR)
  return zones.find((z) => hr >= z.min && hr < z.max) || null
}

// Estimate calories burned based on HR, duration, weight, and gender
// Using simplified Keytel formula
export function estimateCaloriesBurned(
  avgHR: number,
  durationSeconds: number,
  weight: number,
  age: number = 35,
  isMale: boolean = true
): number {
  const durationMinutes = durationSeconds / 60

  if (isMale) {
    // Male formula
    return Math.round(
      durationMinutes *
        (0.6309 * avgHR + 0.1988 * weight + 0.2017 * age - 55.0969) / 4.184
    )
  } else {
    // Female formula
    return Math.round(
      durationMinutes *
        (0.4472 * avgHR - 0.1263 * weight + 0.074 * age - 20.4022) / 4.184
    )
  }
}

// Estimate fat burned in grams based on calories and intensity
// Fat provides ~9 calories per gram
export function estimateFatBurned(
  calories: number,
  avgHR: number,
  maxHR: number,
  restingHR: number
): number {
  const zone = getHRZoneForBPM(avgHR, maxHR, restingHR)
  const fatRatio = zone?.fatBurnRatio || 0.4 // Default to 40% if zone not found

  const fatCalories = calories * fatRatio
  const fatGrams = fatCalories / 9 // 9 calories per gram of fat

  return Math.round(fatGrams)
}

// Calculate intensity as percentage of heart rate reserve
export function calculateIntensity(avgHR: number, maxHR: number, restingHR: number): number {
  const hrr = maxHR - restingHR
  return Math.round(((avgHR - restingHR) / hrr) * 100)
}

// Fat burning stats for a single activity
export interface ActivityFatStats {
  activityId: number
  name: string
  date: string
  duration: number
  avgHR: number
  calories: number
  fatBurned: number
  fatRatio: number
  intensity: number
  zone: string
  isOptimalFatBurn: boolean
}

// Calculate fat burning stats for a single activity
export function calculateActivityFatStats(
  activity: StravaActivity,
  weight: number,
  maxHR: number,
  restingHR: number
): ActivityFatStats | null {
  if (!activity.average_heartrate) return null

  const avgHR = activity.average_heartrate
  const duration = activity.moving_time
  const calories = activity.kilojoules
    ? Math.round(activity.kilojoules * 0.25) // Convert kJ to estimated calories burned
    : estimateCaloriesBurned(avgHR, duration, weight)

  const fatBurned = estimateFatBurned(calories, avgHR, maxHR, restingHR)
  const zone = getHRZoneForBPM(avgHR, maxHR, restingHR)
  const intensity = calculateIntensity(avgHR, maxHR, restingHR)

  return {
    activityId: activity.id,
    name: activity.name,
    date: activity.start_date_local,
    duration,
    avgHR,
    calories,
    fatBurned,
    fatRatio: zone?.fatBurnRatio || 0.4,
    intensity,
    zone: zone?.name || 'Unknown',
    isOptimalFatBurn: intensity >= 60 && intensity <= 70,
  }
}

// Aggregate fat burning stats
export interface FatBurningSummary {
  totalCalories: number
  totalFatBurned: number // grams
  avgFatRatio: number
  zone2Time: number // seconds in Zone 2 (fat burning zone)
  zone2Percentage: number
  totalTime: number
  activitiesInZone2: number
  totalActivitiesWithHR: number
  weeklyFatBurn: { week: string; fatBurned: number; zone2Time: number }[]
  optimalFatBurnActivities: number
}

// Calculate comprehensive fat burning summary
export function calculateFatBurningSummary(
  activities: StravaActivity[],
  weight: number,
  maxHR: number,
  restingHR: number
): FatBurningSummary {
  const activitiesWithHR = activities.filter((a) => a.average_heartrate)

  let totalCalories = 0
  let totalFatBurned = 0
  let zone2Time = 0
  let totalTime = 0
  let activitiesInZone2 = 0
  let optimalFatBurnActivities = 0
  let totalFatRatio = 0

  const weeklyFatMap = new Map<string, { fatBurned: number; zone2Time: number }>()

  activitiesWithHR.forEach((activity) => {
    const stats = calculateActivityFatStats(activity, weight, maxHR, restingHR)
    if (!stats) return

    totalCalories += stats.calories
    totalFatBurned += stats.fatBurned
    totalTime += stats.duration
    totalFatRatio += stats.fatRatio

    if (stats.isOptimalFatBurn) {
      zone2Time += stats.duration
      activitiesInZone2++
      optimalFatBurnActivities++
    }

    // Weekly aggregation
    const weekStart = format(
      startOfWeek(new Date(activity.start_date), { weekStartsOn: 1 }),
      'MMM d'
    )
    const existing = weeklyFatMap.get(weekStart) || { fatBurned: 0, zone2Time: 0 }
    weeklyFatMap.set(weekStart, {
      fatBurned: existing.fatBurned + stats.fatBurned,
      zone2Time: existing.zone2Time + (stats.isOptimalFatBurn ? stats.duration : 0),
    })
  })

  const weeklyFatBurn = Array.from(weeklyFatMap.entries())
    .map(([week, data]) => ({
      week,
      fatBurned: data.fatBurned,
      zone2Time: Math.round(data.zone2Time / 60), // Convert to minutes
    }))
    .slice(-12)

  return {
    totalCalories,
    totalFatBurned,
    avgFatRatio: activitiesWithHR.length > 0 ? totalFatRatio / activitiesWithHR.length : 0,
    zone2Time,
    zone2Percentage: totalTime > 0 ? Math.round((zone2Time / totalTime) * 100) : 0,
    totalTime,
    activitiesInZone2,
    totalActivitiesWithHR: activitiesWithHR.length,
    weeklyFatBurn,
    optimalFatBurnActivities,
  }
}

// ==========================================
// BMR & Resting Fat Burn Calculations
// ==========================================

// Calculate BMR using Mifflin-St Jeor formula (most accurate for most people)
// Returns calories per day
export function calculateBMR(
  weight: number,
  age: number,
  gender: 'male' | 'female',
  heightCm: number = 175 // Default height, can be added to settings later
): number {
  if (gender === 'male') {
    // Men: BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age in years) + 5
    return Math.round(10 * weight + 6.25 * heightCm - 5 * age + 5)
  } else {
    // Women: BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age in years) − 161
    return Math.round(10 * weight + 6.25 * heightCm - 5 * age - 161)
  }
}

// Calculate TDEE (Total Daily Energy Expenditure) based on activity level
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel = 'light'): number {
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,    // Little or no exercise
    light: 1.375,      // Light exercise 1-3 days/week
    moderate: 1.55,    // Moderate exercise 3-5 days/week
    active: 1.725,     // Hard exercise 6-7 days/week
    veryActive: 1.9,   // Very hard exercise & physical job
  }
  return Math.round(bmr * multipliers[activityLevel])
}

// At rest, body burns approximately 70-85% of calories from fat
// This is called the Respiratory Exchange Ratio (RER) at rest
const RESTING_FAT_RATIO = 0.77 // 77% of resting calories from fat

// Calculate daily resting fat burn in grams
export function calculateDailyRestingFatBurn(bmr: number): number {
  const fatCalories = bmr * RESTING_FAT_RATIO
  const fatGrams = fatCalories / 9 // 9 calories per gram of fat
  return Math.round(fatGrams)
}

// Calculate total daily fat burn (resting + activity)
export interface DailyFatBurn {
  restingFatBurn: number      // grams from BMR
  activityFatBurn: number     // grams from exercise
  totalFatBurn: number        // total grams
  restingCalories: number     // BMR calories
  activityCalories: number    // exercise calories
  totalCalories: number       // total calories
}

export function calculateDailyFatBurn(
  bmr: number,
  activityCalories: number,
  activityFatBurn: number
): DailyFatBurn {
  const restingFatBurn = calculateDailyRestingFatBurn(bmr)

  return {
    restingFatBurn,
    activityFatBurn,
    totalFatBurn: restingFatBurn + activityFatBurn,
    restingCalories: bmr,
    activityCalories,
    totalCalories: bmr + activityCalories,
  }
}

// Extended summary including resting metabolism
export interface CompleteFatBurningSummary extends FatBurningSummary {
  bmr: number
  dailyRestingFatBurn: number
  weeklyRestingFatBurn: number
  periodRestingFatBurn: number  // For the selected time period
  periodDays: number
  totalFatBurnWithResting: number
  weeklyTotalFatBurn: {
    week: string
    activityFatBurn: number
    restingFatBurn: number
    totalFatBurn: number
    zone2Time: number
  }[]
}

export function calculateCompleteFatBurningSummary(
  activities: StravaActivity[],
  weight: number,
  maxHR: number,
  restingHR: number,
  age: number,
  gender: 'male' | 'female',
  periodDays: number
): CompleteFatBurningSummary {
  // Get activity-based stats
  const activityStats = calculateFatBurningSummary(activities, weight, maxHR, restingHR)

  // Calculate BMR and resting fat burn
  const bmr = calculateBMR(weight, age, gender)
  const dailyRestingFatBurn = calculateDailyRestingFatBurn(bmr)
  const weeklyRestingFatBurn = dailyRestingFatBurn * 7
  const periodRestingFatBurn = dailyRestingFatBurn * periodDays

  // Combine weekly data with resting fat burn
  const weeklyTotalFatBurn = activityStats.weeklyFatBurn.map((week) => ({
    week: week.week,
    activityFatBurn: week.fatBurned,
    restingFatBurn: weeklyRestingFatBurn,
    totalFatBurn: week.fatBurned + weeklyRestingFatBurn,
    zone2Time: week.zone2Time,
  }))

  return {
    ...activityStats,
    bmr,
    dailyRestingFatBurn,
    weeklyRestingFatBurn,
    periodRestingFatBurn,
    periodDays,
    totalFatBurnWithResting: activityStats.totalFatBurned + periodRestingFatBurn,
    weeklyTotalFatBurn,
  }
}
