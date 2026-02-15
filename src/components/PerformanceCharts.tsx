import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  AreaChart,
  Area,
  Legend,
  ReferenceLine,
  ComposedChart,
} from 'recharts'
import { type StravaActivity } from '~/lib/strava'
import { chartTheme, tooltipStyle, formatDateShort, activityTooltipLabel } from '~/lib/chart-theme'

interface PerformanceChartsProps {
  activities: StravaActivity[]
  showAllCharts?: boolean
}

const trendClasses: Record<string, string> = {
  improving: 'bg-success-muted text-success',
  declining: 'bg-danger-muted text-danger',
  stable: 'bg-warning-muted text-warning',
}

export function PerformanceCharts({ activities, showAllCharts }: PerformanceChartsProps) {
  const powerTrendData = useMemo(() => {
    const rides = activities
      .filter((a) => (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_watts)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    return rides
      .map((ride) => ({
        fullDate: ride.start_date_local,
        avgPower: Math.round(ride.average_watts || 0),
        maxPower: ride.max_watts || 0,
        normalizedPower: ride.weighted_average_watts || undefined,
        name: ride.name,
      }))
      .filter((d) => d.avgPower > 0)
  }, [activities])

  const powerTrendLine = useMemo(() => {
    if (powerTrendData.length < 2) return null

    const n = powerTrendData.length
    const sumX = powerTrendData.reduce((sum, _, i) => sum + i, 0)
    const sumY = powerTrendData.reduce((sum, d) => sum + d.avgPower, 0)
    const sumXY = powerTrendData.reduce((sum, d, i) => sum + i * d.avgPower, 0)
    const sumX2 = powerTrendData.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return {
      slope,
      intercept,
      startValue: intercept,
      endValue: slope * (n - 1) + intercept,
      trend: slope > 0.5 ? 'improving' : slope < -0.5 ? 'declining' : 'stable',
    }
  }, [powerTrendData])

  const hrTrendData = useMemo(() => {
    return activities
      .filter((a) => (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_heartrate)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .map((activity) => ({
        fullDate: activity.start_date_local,
                avgHR: Math.round(activity.average_heartrate || 0),
        maxHR: activity.max_heartrate || 0,
        name: activity.name,
      }))
  }, [activities])

  const speedTrendData = useMemo(() => {
    return activities
      .filter((a) => (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_speed > 0)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .map((activity) => ({
        fullDate: activity.start_date_local,
                speed: Math.round((activity.average_speed * 3.6) * 10) / 10,
        maxSpeed: Math.round((activity.max_speed * 3.6) * 10) / 10,
        elevation: Math.round(activity.total_elevation_gain),
        name: activity.name,
      }))
  }, [activities])

  const hasNoPowerData = powerTrendData.length === 0
  const hasNoHRData = hrTrendData.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Power Trend Chart */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
          <h3 className="text-lg font-semibold text-text-primary">Power Trend</h3>
          {powerTrendLine && (
            <span className={`text-xs py-1.5 px-3.5 rounded-full font-semibold ${trendClasses[powerTrendLine.trend]}`}>
              {powerTrendLine.trend === 'improving' && '↑ Improving'}
              {powerTrendLine.trend === 'declining' && '↓ Declining'}
              {powerTrendLine.trend === 'stable' && '→ Stable'}
            </span>
          )}
        </div>
        {hasNoPowerData ? (
          <div className="text-text-muted text-center py-16 text-[0.9rem]">No power data available. Use a power meter or smart trainer.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={powerTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="fullDate" stroke={chartTheme.axis} fontSize={12} tickFormatter={(value) => formatDateShort(value)} />
              <YAxis stroke={chartTheme.axis} fontSize={12} domain={['auto', 'auto']} />
              <Tooltip {...tooltipStyle} labelFormatter={activityTooltipLabel} formatter={(value: number, name: string) => [`${value} W`, name]} />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgPower"
                stroke={chartTheme.colors.primary.main}
                strokeWidth={2}
                dot={{ r: 4, fill: chartTheme.colors.primary.main }}
                activeDot={{ r: 6, stroke: chartTheme.colors.primary.main, strokeWidth: 2 }}
                name="Avg Power"
              />
              {powerTrendData.some((d) => d.normalizedPower) && (
                <Line
                  type="monotone"
                  dataKey="normalizedPower"
                  stroke={chartTheme.colors.secondary.main}
                  strokeWidth={2}
                  dot={{ r: 3, fill: chartTheme.colors.secondary.main }}
                  name="Normalized Power"
                />
              )}
              {powerTrendLine && (
                <ReferenceLine
                  segment={[
                    { x: powerTrendData[0]?.fullDate, y: powerTrendLine.startValue },
                    { x: powerTrendData[powerTrendData.length - 1]?.fullDate, y: powerTrendLine.endValue },
                  ]}
                  stroke={chartTheme.colors.amber.main}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
        {!hasNoPowerData && (
          <div className="mt-5 p-5 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
            <p className="mb-2"><strong className="text-accent">Avg Power</strong> — simple average of your power output over the ride. Doesn't account for intensity spikes.</p>
            <p><strong className="text-accent">Normalized Power</strong> — weighted average that better reflects the true physiological cost of a ride. Accounts for surges and variable effort, so it's always equal to or higher than avg power.</p>
          </div>
        )}
      </div>

      {/* Heart Rate Trend */}
      {(showAllCharts || !hasNoHRData) && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Heart Rate Trend</h3>
          {hasNoHRData ? (
            <div className="text-text-muted text-center py-16 text-[0.9rem]">No heart rate data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={hrTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="fullDate" stroke={chartTheme.axis} fontSize={12} tickFormatter={(value) => formatDateShort(value)} />
                <YAxis stroke={chartTheme.axis} fontSize={12} domain={['auto', 'auto']} />
                <Tooltip {...tooltipStyle} labelFormatter={activityTooltipLabel} formatter={(value: number, name: string) => [`${value} bpm`, name]} />
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
          )}
        </div>
      )}

      {/* Speed & Elevation Trend */}
      {showAllCharts && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Speed & Elevation Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={speedTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="fullDate" stroke={chartTheme.axis} fontSize={12} tickFormatter={(value) => formatDateShort(value)} />
              <YAxis yAxisId="speed" stroke={chartTheme.axis} fontSize={12} unit=" km/h" />
              <YAxis yAxisId="elevation" orientation="right" stroke={chartTheme.axis} fontSize={12} unit=" m" />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={activityTooltipLabel}
                formatter={(value: number, name: string) => {
                  if (name === 'Elevation') return [`${value} m`, name]
                  return [`${value} km/h`, name]
                }}
              />
              <Legend />
              <Bar
                yAxisId="elevation"
                dataKey="elevation"
                fill={chartTheme.colors.neutral[600]}
                radius={[4, 4, 0, 0]}
                name="Elevation"
              />
              <Line
                yAxisId="speed"
                type="monotone"
                dataKey="speed"
                stroke={chartTheme.colors.primary.main}
                strokeWidth={2}
                dot={{ r: 3, fill: chartTheme.colors.primary.main }}
                name="Avg Speed"
              />
              <Line
                yAxisId="speed"
                type="monotone"
                dataKey="maxSpeed"
                stroke={chartTheme.colors.secondary.main}
                strokeWidth={2}
                dot={{ r: 3, fill: chartTheme.colors.secondary.main }}
                name="Max Speed"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
