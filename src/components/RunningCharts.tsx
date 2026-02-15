import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import { type StravaActivity } from '~/lib/strava'
import { formatPace } from '~/lib/performance'
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'

interface RunningChartsProps {
  activities: StravaActivity[]
}

const trendClasses: Record<string, string> = {
  improving: 'bg-success-muted text-success',
  declining: 'bg-danger-muted text-danger',
  stable: 'bg-warning-muted text-warning',
}

export function RunningCharts({ activities }: RunningChartsProps) {
  const runs = useMemo(
    () => activities.filter((a) => a.type === 'Run').sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
    [activities]
  )

  const paceTrendData = useMemo(() => {
    return runs
      .filter((r) => r.distance > 0)
      .map((run) => {
        const paceSecsPerKm = run.moving_time / (run.distance / 1000)
        return {
          fullDate: run.start_date_local,
          date: format(new Date(run.start_date_local), 'MMM d'),
          pace: Math.round(paceSecsPerKm * 10) / 10, // seconds per km
          paceFormatted: formatPace(paceSecsPerKm),
          distance: Math.round(run.distance / 100) / 10, // km with 1 decimal
          name: run.name,
        }
      })
  }, [runs])

  const paceTrendLine = useMemo(() => {
    if (paceTrendData.length < 2) return null

    const n = paceTrendData.length
    const sumX = paceTrendData.reduce((sum, _, i) => sum + i, 0)
    const sumY = paceTrendData.reduce((sum, d) => sum + d.pace, 0)
    const sumXY = paceTrendData.reduce((sum, d, i) => sum + i * d.pace, 0)
    const sumX2 = paceTrendData.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return {
      slope,
      startValue: intercept,
      endValue: slope * (n - 1) + intercept,
      // For pace, negative slope = improving (getting faster)
      trend: slope < -1 ? 'improving' : slope > 1 ? 'declining' : 'stable',
    }
  }, [paceTrendData])

  const hrTrendData = useMemo(() => {
    return runs
      .filter((r) => r.average_heartrate)
      .map((run) => ({
        fullDate: run.start_date_local,
        date: format(new Date(run.start_date_local), 'MMM d'),
        avgHR: Math.round(run.average_heartrate || 0),
        maxHR: run.max_heartrate || 0,
        name: run.name,
      }))
  }, [runs])

  if (runs.length === 0) return null

  const hasNoPaceData = paceTrendData.length === 0
  const hasNoHRData = hrTrendData.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Pace Trend Chart */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
          <h3 className="text-lg font-semibold text-text-primary">Pace Trend</h3>
          {paceTrendLine && (
            <span className={`text-xs py-1.5 px-3.5 rounded-full font-semibold ${trendClasses[paceTrendLine.trend]}`}>
              {paceTrendLine.trend === 'improving' && '↑ Getting Faster'}
              {paceTrendLine.trend === 'declining' && '↓ Slowing Down'}
              {paceTrendLine.trend === 'stable' && '→ Stable'}
            </span>
          )}
        </div>
        {hasNoPaceData ? (
          <div className="text-text-muted text-center py-16 text-[0.9rem]">No pace data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={paceTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="fullDate" stroke={chartTheme.axis} fontSize={12} tickFormatter={(value) => format(new Date(value), 'MMM d')} />
              <YAxis
                stroke={chartTheme.axis}
                fontSize={12}
                reversed
                domain={[(min: number) => Math.floor(min / 30) * 30, (max: number) => Math.ceil(max / 30) * 30]}
                tickFormatter={(value: number) => formatPace(value)}
              />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(value) => format(new Date(value as string), 'MMM d, yyyy')}
                formatter={(value: number, name: string) => {
                  if (name === 'Pace') return [formatPace(value) + ' /km', name]
                  return [`${value} km`, name]
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="pace"
                stroke={chartTheme.colors.primary.main}
                strokeWidth={2}
                dot={{ r: 4, fill: chartTheme.colors.primary.main }}
                activeDot={{ r: 6, stroke: chartTheme.colors.primary.main, strokeWidth: 2 }}
                name="Pace"
              />
              {paceTrendLine && (
                <ReferenceLine
                  segment={[
                    { x: paceTrendData[0]?.fullDate, y: paceTrendLine.startValue },
                    { x: paceTrendData[paceTrendData.length - 1]?.fullDate, y: paceTrendLine.endValue },
                  ]}
                  stroke={chartTheme.colors.amber.main}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Heart Rate Trend (Runs) */}
      {!hasNoHRData && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Heart Rate Trend (Runs)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hrTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="fullDate" stroke={chartTheme.axis} fontSize={12} tickFormatter={(value) => format(new Date(value), 'MMM d')} />
              <YAxis stroke={chartTheme.axis} fontSize={12} domain={['auto', 'auto']} />
              <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [`${value} bpm`, name]} />
              <Legend />
              <Area
                type="monotone"
                dataKey="maxHR"
                stroke={chartTheme.colors.secondary.main}
                fill={chartTheme.fills.secondary.main}
                strokeWidth={2}
                name="Max HR"
              />
              <Area
                type="monotone"
                dataKey="avgHR"
                stroke={chartTheme.colors.primary.main}
                fill={chartTheme.fills.primary.main}
                strokeWidth={2}
                name="Avg HR"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
