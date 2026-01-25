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
import { format } from 'date-fns'
import { type StravaActivity } from '~/lib/strava'
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'

interface PerformanceChartsProps {
  activities: StravaActivity[]
  showAllCharts?: boolean
}

export function PerformanceCharts({ activities, showAllCharts }: PerformanceChartsProps) {
  const powerTrendData = useMemo(() => {
    const rides = activities
      .filter((a) => (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_watts)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    return rides.map((ride) => ({
      date: format(new Date(ride.start_date_local), 'MMM d'),
      fullDate: ride.start_date_local,
      avgPower: Math.round(ride.average_watts || 0),
      maxPower: ride.max_watts || 0,
      normalizedPower: ride.weighted_average_watts || 0,
      name: ride.name,
    }))
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
    const withHR = activities
      .filter((a) => a.average_heartrate)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    return withHR.map((activity) => ({
      date: format(new Date(activity.start_date_local), 'MMM d'),
      avgHR: Math.round(activity.average_heartrate || 0),
      maxHR: activity.max_heartrate || 0,
      name: activity.name,
      type: activity.type,
    }))
  }, [activities])

  const speedTrendData = useMemo(() => {
    return activities
      .filter((a) => a.average_speed > 0)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .map((activity) => ({
        date: format(new Date(activity.start_date_local), 'MMM d'),
        speed: Math.round((activity.average_speed * 3.6) * 10) / 10,
        maxSpeed: Math.round((activity.max_speed * 3.6) * 10) / 10,
        elevation: Math.round(activity.total_elevation_gain),
        type: activity.type,
        name: activity.name,
      }))
  }, [activities])

  const hasNoPowerData = powerTrendData.length === 0
  const hasNoHRData = hrTrendData.length === 0

  return (
    <div className="charts-container">
      {/* Power Trend Chart */}
      <div className="chart-section">
        <div className="chart-header">
          <h3>Power Trend</h3>
          {powerTrendLine && (
            <span className={`trend-badge ${powerTrendLine.trend}`}>
              {powerTrendLine.trend === 'improving' && '↑ Improving'}
              {powerTrendLine.trend === 'declining' && '↓ Declining'}
              {powerTrendLine.trend === 'stable' && '→ Stable'}
            </span>
          )}
        </div>
        {hasNoPowerData ? (
          <div className="no-data">No power data available. Use a power meter or smart trainer.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={powerTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={12} />
              <YAxis stroke={chartTheme.axis} fontSize={12} domain={['auto', 'auto']} />
              <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [`${value} W`, name]} />
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
              {powerTrendData.some((d) => d.normalizedPower > 0) && (
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
                    { x: powerTrendData[0]?.date, y: powerTrendLine.startValue },
                    { x: powerTrendData[powerTrendData.length - 1]?.date, y: powerTrendLine.endValue },
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

      {/* Heart Rate Trend */}
      {(showAllCharts || !hasNoHRData) && (
        <div className="chart-section">
          <h3>Heart Rate Trend</h3>
          {hasNoHRData ? (
            <div className="no-data">No heart rate data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={hrTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={12} />
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
          )}
        </div>
      )}

      {/* Speed & Elevation Trend */}
      {showAllCharts && (
        <div className="chart-section">
          <h3>Speed & Elevation Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={speedTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={12} />
              <YAxis yAxisId="speed" stroke={chartTheme.axis} fontSize={12} unit=" km/h" />
              <YAxis yAxisId="elevation" orientation="right" stroke={chartTheme.axis} fontSize={12} unit=" m" />
              <Tooltip
                {...tooltipStyle}
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
