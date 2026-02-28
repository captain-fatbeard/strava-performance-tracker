import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { startOfWeek, addWeeks, differenceInCalendarDays, eachDayOfInterval } from 'date-fns'
import { type StravaActivity } from '~/lib/strava'
import { estimateCaloriesBurned } from '~/lib/performance'
import { chartTheme, tooltipStyle, formatDateShort } from '~/lib/chart-theme'

interface ActivityInsightsProps {
  activities: StravaActivity[]
  weight: number
  age: number
  gender: 'male' | 'female'
  timeRangeDays: number
}

interface WeeklyCalorieData {
  week: string
  calories: number
}

interface WeeklyConsistencyData {
  week: string
  rides: number
  runs: number
  other: number
  activeDays: number
}

function getActivityCategory(type: string): 'rides' | 'runs' | 'other' {
  if (type === 'Ride' || type === 'VirtualRide') return 'rides'
  if (type === 'Run') return 'runs'
  return 'other'
}

export function ActivityInsights({
  activities,
  weight,
  age,
  gender,
  timeRangeDays,
}: ActivityInsightsProps) {
  // --- Weekly Calorie Burn Data ---
  const { weeklyCalories, totalCalories, weeklyAvgCalories } = useMemo(() => {
    const now = new Date()
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weeks = Math.min(12, Math.ceil(timeRangeDays / 7))
    const data: WeeklyCalorieData[] = []
    const isMale = gender === 'male'

    for (let w = 0; w < weeks; w++) {
      const ws = addWeeks(currentWeekStart, -w)
      const we = addWeeks(ws, 1)

      const weekActivities = activities.filter((a) => {
        const d = new Date(a.start_date)
        return d >= ws && d < we
      })

      const calories = weekActivities.reduce((sum, a) => {
        if (a.kilojoules) {
          // kJ reported by Strava ≈ calories for cycling (efficiency ~25%)
          return sum + Math.round(a.kilojoules * 0.25)
        }
        if (a.average_heartrate) {
          return sum + estimateCaloriesBurned(a.average_heartrate, a.moving_time, weight, age, isMale)
        }
        // Rough fallback: ~5 cal/min for moderate exercise
        return sum + Math.round((a.moving_time / 60) * 5)
      }, 0)

      data.push({ week: formatDateShort(ws), calories })
    }

    data.reverse()
    const total = data.reduce((s, d) => s + d.calories, 0)
    const weeksWithActivity = data.filter((d) => d.calories > 0).length
    const avg = weeksWithActivity > 0 ? Math.round(total / weeksWithActivity) : 0

    return { weeklyCalories: data, totalCalories: total, weeklyAvgCalories: avg }
  }, [activities, weight, age, gender, timeRangeDays])

  // --- Activity Consistency Data ---
  const { weeklyConsistency, currentStreak, longestStreak, avgActivitiesPerWeek } = useMemo(() => {
    const now = new Date()
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weeks = Math.min(12, Math.ceil(timeRangeDays / 7))
    const data: WeeklyConsistencyData[] = []

    for (let w = 0; w < weeks; w++) {
      const ws = addWeeks(currentWeekStart, -w)
      const we = addWeeks(ws, 1)

      const weekActivities = activities.filter((a) => {
        const d = new Date(a.start_date)
        return d >= ws && d < we
      })

      const rides = weekActivities.filter((a) => getActivityCategory(a.type) === 'rides').length
      const runs = weekActivities.filter((a) => getActivityCategory(a.type) === 'runs').length
      const other = weekActivities.filter((a) => getActivityCategory(a.type) === 'other').length

      // Count unique active days
      const activeDaySet = new Set(
        weekActivities.map((a) => a.start_date_local.split('T')[0])
      )

      data.push({
        week: formatDateShort(ws),
        rides,
        runs,
        other,
        activeDays: activeDaySet.size,
      })
    }

    data.reverse()

    // Calculate streaks (consecutive days with activities)
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    )

    let current = 0
    let longest = 0
    let streak = 0

    if (sortedActivities.length > 0) {
      const firstDate = new Date(sortedActivities[0].start_date_local.split('T')[0])
      const lastDate = new Date(sortedActivities[sortedActivities.length - 1].start_date_local.split('T')[0])

      const activeDays = new Set(
        sortedActivities.map((a) => a.start_date_local.split('T')[0])
      )

      const allDays = eachDayOfInterval({ start: firstDate, end: lastDate })

      for (const day of allDays) {
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
        if (activeDays.has(key)) {
          streak++
          if (streak > longest) longest = streak
        } else {
          streak = 0
        }
      }

      // Check if current streak extends to today
      const today = new Date()
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const yesterdayDate = new Date(today)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayKey = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`

      if (activeDays.has(todayKey) || activeDays.has(yesterdayKey)) {
        // Count backward from today/yesterday
        let countStreak = 0
        const checkDate = new Date(activeDays.has(todayKey) ? today : yesterdayDate)
        while (true) {
          const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
          if (activeDays.has(key)) {
            countStreak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }
        current = countStreak
      }
    }

    const totalActivities = data.reduce((s, d) => s + d.rides + d.runs + d.other, 0)
    const weeksWithActivity = data.filter((d) => d.rides + d.runs + d.other > 0).length
    const avgPerWeek = weeksWithActivity > 0
      ? Math.round((totalActivities / weeksWithActivity) * 10) / 10
      : 0

    return {
      weeklyConsistency: data,
      currentStreak: current,
      longestStreak: longest,
      avgActivitiesPerWeek: avgPerWeek,
    }
  }, [activities, timeRangeDays])

  const hasCalorieData = weeklyCalories.some((d) => d.calories > 0)
  const hasConsistencyData = weeklyConsistency.some((d) => d.rides + d.runs + d.other > 0)

  if (!hasCalorieData && !hasConsistencyData) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Activity Insights</h3>
        <div className="text-text-muted text-center py-16 text-[0.9rem]">
          No activity data available for this time range.
        </div>
      </div>
    )
  }

  const statCard = "bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-6 flex flex-col gap-1 transition-all duration-200 hover:border-border hover:-translate-y-0.5 hover:shadow-md max-md:p-4 max-[480px]:p-3.5"
  const statValue = "text-[2rem] font-bold leading-tight bg-linear-to-br from-text-primary to-text-secondary bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl"

  return (
    <div className="flex flex-col gap-8">
      {/* Weekly Calorie Burn */}
      {hasCalorieData && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Weekly Calorie Burn</h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 mb-6">
            <div className={`${statCard} text-center bg-linear-to-br from-accent/15 to-accent/5 border-accent/30`}>
              <div className="text-[2rem] font-bold leading-tight bg-linear-to-br from-accent-light to-accent bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl">
                {totalCalories.toLocaleString()}
              </div>
              <div className="text-sm text-text-secondary font-medium">Period Total</div>
            </div>
            <div className={`${statCard} text-center`}>
              <div className={statValue}>{weeklyAvgCalories.toLocaleString()}</div>
              <div className="text-sm text-text-secondary font-medium">Weekly Avg</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyCalories}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="week" stroke={chartTheme.axis} fontSize={12} />
              <YAxis
                stroke={chartTheme.axis}
                fontSize={12}
                label={{ value: 'cal', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [`${value.toLocaleString()} cal`, 'Calories']}
              />
              <Bar
                dataKey="calories"
                fill={chartTheme.colors.primary.main}
                radius={[4, 4, 0, 0]}
                name="Calories"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Activity Consistency */}
      {hasConsistencyData && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Activity Consistency</h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-6">
            <div className={`${statCard} text-center bg-linear-to-br from-accent/15 to-accent/5 border-accent/30`}>
              <div className="text-[2rem] font-bold leading-tight bg-linear-to-br from-accent-light to-accent bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl">
                {currentStreak}
              </div>
              <div className="text-sm text-text-secondary font-medium">Current Streak</div>
              <div className="text-xs text-text-muted">days</div>
            </div>
            <div className={`${statCard} text-center`}>
              <div className={statValue}>{longestStreak}</div>
              <div className="text-sm text-text-secondary font-medium">Longest Streak</div>
              <div className="text-xs text-text-muted">days</div>
            </div>
            <div className={`${statCard} text-center`}>
              <div className={statValue}>{avgActivitiesPerWeek}</div>
              <div className="text-sm text-text-secondary font-medium">Avg/Week</div>
              <div className="text-xs text-text-muted">activities</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={weeklyConsistency}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="week" stroke={chartTheme.axis} fontSize={12} />
              <YAxis
                yAxisId="count"
                stroke={chartTheme.axis}
                fontSize={12}
                label={{ value: 'activities', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
              />
              <YAxis
                yAxisId="days"
                orientation="right"
                stroke={chartTheme.axis}
                fontSize={12}
                domain={[0, 7]}
                label={{ value: 'days', angle: 90, position: 'insideRight', fill: chartTheme.axis }}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, name: string) => {
                  if (name === 'Active Days') return [`${value} days`, name]
                  return [value, name]
                }}
              />
              <Legend />
              <Bar
                yAxisId="count"
                dataKey="rides"
                stackId="activities"
                fill={chartTheme.colors.primary.main}
                name="Rides"
              />
              <Bar
                yAxisId="count"
                dataKey="runs"
                stackId="activities"
                fill={chartTheme.colors.secondary.main}
                name="Runs"
              />
              <Bar
                yAxisId="count"
                dataKey="other"
                stackId="activities"
                fill={chartTheme.colors.neutral[500]}
                name="Other"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="days"
                type="monotone"
                dataKey="activeDays"
                stroke={chartTheme.colors.amber.main}
                strokeWidth={2}
                dot={{ r: 4, fill: chartTheme.colors.amber.main }}
                name="Active Days"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
