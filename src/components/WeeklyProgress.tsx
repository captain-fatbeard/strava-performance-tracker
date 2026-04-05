import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { startOfWeek, addWeeks } from 'date-fns'
import { type StravaActivity } from '~/lib/strava'
import { calculateWeeklySummaries, estimateFTP } from '~/lib/performance'
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'
import { statCard, statCardAccent, statValue, statValueAccent } from '~/lib/styles'

interface WeeklyProgressProps {
  activities: StravaActivity[]
}

const STREAK_THRESHOLD_HOURS = 2

export function WeeklyProgress({ activities }: WeeklyProgressProps) {
  const ftp = useMemo(() => estimateFTP(activities) || 200, [activities])

  const weeklyData = useMemo(
    () => calculateWeeklySummaries(activities, ftp, 12).map(week => ({
      ...week,
      totalHours: Math.round(week.totalTime / 360) / 10,
    })),
    [activities, ftp]
  )

  const { currentStreak, longestStreak, avgActivitiesPerWeek } = useMemo(() => {
    if (activities.length === 0) {
      return { currentStreak: 0, longestStreak: 0, avgActivitiesPerWeek: 0 }
    }

    const now = new Date()
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })

    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )

    const earliestDate = new Date(sortedActivities[0].start_date)
    const earliestWeekStart = startOfWeek(earliestDate, { weekStartsOn: 1 })

    // Build weekly hours map for all weeks from earliest to current
    const weeklyHoursMap = new Map<string, number>()
    for (let ws = new Date(earliestWeekStart); ws <= currentWeekStart; ws = addWeeks(ws, 1)) {
      const we = addWeeks(ws, 1)
      const weekKey = ws.toISOString().split('T')[0]
      const hours = activities
        .filter((a) => {
          const d = new Date(a.start_date)
          return d >= ws && d < we
        })
        .reduce((sum, a) => sum + a.moving_time / 3600, 0)
      weeklyHoursMap.set(weekKey, hours)
    }

    // Find longest streak
    let longest = 0
    let streak = 0
    for (let ws = new Date(earliestWeekStart); ws <= currentWeekStart; ws = addWeeks(ws, 1)) {
      const weekKey = ws.toISOString().split('T')[0]
      const hours = weeklyHoursMap.get(weekKey) ?? 0
      if (hours >= STREAK_THRESHOLD_HOURS) {
        streak++
        if (streak > longest) longest = streak
      } else {
        streak = 0
      }
    }

    // Find current streak (count backward from current week)
    let current = 0
    for (let ws = new Date(currentWeekStart); ws >= earliestWeekStart; ws = addWeeks(ws, -1)) {
      const weekKey = ws.toISOString().split('T')[0]
      const hours = weeklyHoursMap.get(weekKey) ?? 0
      if (hours >= STREAK_THRESHOLD_HOURS) {
        current++
      } else {
        break
      }
    }

    // Avg activities per week from the chart data
    const totalActivities = weeklyData.reduce((s, d) => s + d.rides + d.runs, 0)
    const weeksWithActivity = weeklyData.filter((d) => d.rides + d.runs > 0).length
    const avgPerWeek = weeksWithActivity > 0
      ? Math.round((totalActivities / weeksWithActivity) * 10) / 10
      : 0

    return {
      currentStreak: current,
      longestStreak: longest,
      avgActivitiesPerWeek: avgPerWeek,
    }
  }, [activities, weeklyData])

  if (weeklyData.length === 0) {
    return null
  }

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
      <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Weekly Training Load</h3>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-6">
        <div className={`${statCardAccent} text-center`}>
          <div className={statValueAccent}>
            {currentStreak}
          </div>
          <div className="text-sm text-text-secondary font-medium">Current Streak</div>
          <div className="text-xs text-text-muted">weeks</div>
        </div>
        <div className={`${statCard} text-center gap-1`}>
          <div className={statValue}>{longestStreak}</div>
          <div className="text-sm text-text-secondary font-medium">Longest Streak</div>
          <div className="text-xs text-text-muted">weeks</div>
        </div>
        <div className={`${statCard} text-center gap-1`}>
          <div className={statValue}>{avgActivitiesPerWeek}</div>
          <div className="text-sm text-text-secondary font-medium">Avg/Week</div>
          <div className="text-xs text-text-muted">activities</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis dataKey="week" stroke={chartTheme.axis} fontSize={12} />
          <YAxis yAxisId="left" stroke={chartTheme.axis} fontSize={12} />
          <YAxis yAxisId="right" orientation="right" stroke={chartTheme.axis} fontSize={12} />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: number, name: string) => {
              if (name === 'Training Stress') return [value, 'TSS']
              if (name === 'Distance (km)') return [`${value} km`, 'Distance']
              if (name === 'Time (hrs)') return [`${value} hrs`, 'Time']
              if (name === 'Avg Power (W)') return [`${value} W`, 'Avg Power']
              return [value, name]
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="totalTSS"
            fill={chartTheme.colors.neutral[600]}
            name="Training Stress"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="totalDistance"
            fill={chartTheme.colors.neutral[500]}
            name="Distance (km)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="totalHours"
            stroke={chartTheme.colors.primary.main}
            strokeWidth={2}
            dot={{ r: 4, fill: chartTheme.colors.primary.main }}
            name="Time (hrs)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgPower"
            stroke={chartTheme.colors.secondary.main}
            strokeWidth={2}
            dot={{ r: 4, fill: chartTheme.colors.secondary.main }}
            name="Avg Power (W)"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-5 mt-6 max-md:grid-cols-2 max-md:gap-3 max-[480px]:gap-2">
        {weeklyData.slice(-4).map((week, i) => (
          <div key={i} className="bg-bg-tertiary rounded-[var(--radius-md)] p-5 transition-all duration-200 hover:bg-bg-elevated max-[480px]:p-3.5">
            <div className="text-sm font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">{week.week}</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <span className="block text-[1.375rem] font-bold text-text-primary max-md:text-lg max-[480px]:text-base">{week.rides + week.runs}</span>
                <span className="text-[0.65rem] text-text-muted uppercase font-semibold tracking-wide max-[480px]:text-xs">activities</span>
              </div>
              <div className="text-center">
                <span className="block text-[1.375rem] font-bold text-text-primary max-md:text-lg max-[480px]:text-base">{week.totalDistance}</span>
                <span className="text-[0.65rem] text-text-muted uppercase font-semibold tracking-wide max-[480px]:text-xs">km</span>
              </div>
              <div className="text-center">
                <span className="block text-[1.375rem] font-bold text-text-primary max-md:text-lg max-[480px]:text-base">{Math.floor(week.totalTime / 3600)}h {Math.floor((week.totalTime % 3600) / 60)}m</span>
                <span className="text-[0.65rem] text-text-muted uppercase font-semibold tracking-wide max-[480px]:text-xs">time</span>
              </div>
              <div className="text-center">
                <span className="block text-[1.375rem] font-bold text-text-primary max-md:text-lg max-[480px]:text-base">{week.totalTSS}</span>
                <span className="text-[0.65rem] text-text-muted uppercase font-semibold tracking-wide max-[480px]:text-xs">TSS</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
