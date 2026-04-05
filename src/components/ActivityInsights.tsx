import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { startOfWeek, addWeeks } from 'date-fns'
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

  const hasCalorieData = weeklyCalories.some((d) => d.calories > 0)

  if (!hasCalorieData) {
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
  )
}
