import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ComposedChart,
  Area,
} from 'recharts'
import { format } from 'date-fns'
import { type StravaActivity } from '~/lib/strava'
import { calculateEF, estimateVO2max, calculateVAM } from '~/lib/performance'
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'

interface EfficiencyChartProps {
  activities: StravaActivity[]
  weight: number
}

const trendClasses: Record<string, string> = {
  improving: 'bg-success-muted text-success',
  declining: 'bg-danger-muted text-danger',
  stable: 'bg-warning-muted text-warning',
}

export function EfficiencyChart({ activities, weight }: EfficiencyChartProps) {
  // Calculate EF for each ride over time
  const efficiencyData = useMemo(() => {
    const rides = activities
      .filter(
        (a) =>
          (a.type === 'Ride' || a.type === 'VirtualRide') &&
          a.average_watts &&
          a.average_heartrate
      )
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    return rides.map((ride) => {
      const np = ride.weighted_average_watts || ride.average_watts || 0
      const ef = calculateEF(np, ride.average_heartrate || 0)

      return {
        date: format(new Date(ride.start_date_local), 'MMM d'),
        fullDate: ride.start_date_local,
        ef,
        np,
        avgHR: ride.average_heartrate,
        name: ride.name,
      }
    })
  }, [activities])

  // Calculate rolling VO2max based on rolling FTP estimate
  const vo2maxData = useMemo(() => {
    const rides = activities
      .filter(
        (a) =>
          (a.type === 'Ride' || a.type === 'VirtualRide') &&
          a.average_watts &&
          a.moving_time >= 1200 // 20+ min rides for FTP estimation
      )
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    if (rides.length === 0) return []

    // Calculate rolling 6-week best power for FTP estimation
    const result: { date: string; vo2max: number; rollingFTP: number }[] = []

    rides.forEach((ride, index) => {
      const rideDate = new Date(ride.start_date)
      const sixWeeksAgo = new Date(rideDate.getTime() - 42 * 24 * 60 * 60 * 1000)

      // Get rides in the last 6 weeks
      const recentRides = rides.filter((r, i) => {
        const d = new Date(r.start_date)
        return i <= index && d >= sixWeeksAgo && d <= rideDate
      })

      if (recentRides.length >= 3) {
        // Get best average power from recent rides
        const bestPower = Math.max(...recentRides.map((r) => r.average_watts || 0))
        const rollingFTP = Math.round(bestPower * 0.95)
        const vo2max = estimateVO2max(rollingFTP, weight)

        result.push({
          date: format(rideDate, 'MMM d'),
          vo2max,
          rollingFTP,
        })
      }
    })

    return result
  }, [activities, weight])

  // Calculate VAM for rides with significant climbing
  const vamData = useMemo(() => {
    const rides = activities
      .filter(
        (a) =>
          (a.type === 'Ride' || a.type === 'VirtualRide') &&
          a.total_elevation_gain >= 100 // At least 100m climbing
      )
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    return rides.map((ride) => {
      const vam = calculateVAM(ride.total_elevation_gain, ride.moving_time)
      return {
        date: format(new Date(ride.start_date_local), 'MMM d'),
        fullDate: ride.start_date_local,
        vam,
        elevation: Math.round(ride.total_elevation_gain),
        name: ride.name,
      }
    })
  }, [activities])

  // Calculate VAM trend line
  const vamTrendLine = useMemo(() => {
    if (vamData.length < 2) return null

    const n = vamData.length
    const sumX = vamData.reduce((sum, _, i) => sum + i, 0)
    const sumY = vamData.reduce((sum, d) => sum + d.vam, 0)
    const sumXY = vamData.reduce((sum, d, i) => sum + i * d.vam, 0)
    const sumX2 = vamData.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return {
      slope,
      startValue: intercept,
      endValue: slope * (n - 1) + intercept,
      trend: slope > 5 ? 'improving' : slope < -5 ? 'declining' : 'stable',
    }
  }, [vamData])

  // Calculate EF trend line
  const efTrendLine = useMemo(() => {
    if (efficiencyData.length < 2) return null

    const n = efficiencyData.length
    const sumX = efficiencyData.reduce((sum, _, i) => sum + i, 0)
    const sumY = efficiencyData.reduce((sum, d) => sum + d.ef, 0)
    const sumXY = efficiencyData.reduce((sum, d, i) => sum + i * d.ef, 0)
    const sumX2 = efficiencyData.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return {
      slope,
      startValue: intercept,
      endValue: slope * (n - 1) + intercept,
      trend: slope > 0.01 ? 'improving' : slope < -0.01 ? 'declining' : 'stable',
    }
  }, [efficiencyData])

  const hasNoData = efficiencyData.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Efficiency Factor Chart */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
          <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Efficiency Factor Over Time</h3>
          {efTrendLine && (
            <span className={`text-xs py-1.5 px-3.5 rounded-full font-semibold ${trendClasses[efTrendLine.trend]}`}>
              {efTrendLine.trend === 'improving' && '↑ Improving'}
              {efTrendLine.trend === 'declining' && '↓ Declining'}
              {efTrendLine.trend === 'stable' && '→ Stable'}
            </span>
          )}
        </div>
        {hasNoData ? (
          <div className="text-text-muted text-center py-16 text-[0.9rem]">
            Need rides with both power and heart rate data to calculate efficiency.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={12} />
                <YAxis
                  yAxisId="ef"
                  stroke={chartTheme.axis}
                  fontSize={12}
                  domain={['auto', 'auto']}
                  label={{ value: 'EF', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string) => {
                    if (name === 'Efficiency Factor') return [value.toFixed(2), 'Efficiency Factor']
                    return [value, name]
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return `${payload[0].payload.name} - ${label}`
                    }
                    return label
                  }}
                />
                <Legend />
                <Area
                  yAxisId="ef"
                  type="monotone"
                  dataKey="ef"
                  stroke={chartTheme.colors.primary.main}
                  fill={chartTheme.fills.primary.main}
                  strokeWidth={2}
                  dot={{ r: 4, fill: chartTheme.colors.primary.main }}
                  name="Efficiency Factor"
                />
                {efTrendLine && (
                  <ReferenceLine
                    yAxisId="ef"
                    segment={[
                      { x: efficiencyData[0]?.date, y: efTrendLine.startValue },
                      { x: efficiencyData[efficiencyData.length - 1]?.date, y: efTrendLine.endValue },
                    ]}
                    stroke={chartTheme.colors.amber.main}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-5 p-4 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
              <p>
                <strong className="text-accent">EF = Normalized Power / Avg Heart Rate</strong> — Higher is better!
                Track this over time to see aerobic fitness improvements. An improving trend
                means you're producing more power at the same heart rate.
              </p>
            </div>
          </>
        )}
      </div>

      {/* VO2max Trend Chart */}
      {vo2maxData.length > 0 && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
            <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Estimated VO2max Trend</h3>
            <span className="bg-linear-to-br from-accent to-accent-dark text-white py-1.5 px-4 rounded-full text-sm font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.3)]">Based on rolling FTP @ {weight}kg</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vo2maxData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={12} />
              <YAxis
                stroke={chartTheme.axis}
                fontSize={12}
                domain={['auto', 'auto']}
                label={{ value: 'ml/kg/min', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, name: string) => {
                  if (name === 'Est. VO2max') return [`${value.toFixed(1)} ml/kg/min`, 'Est. VO2max']
                  if (name === 'Rolling FTP') return [`${value} W`, 'Rolling FTP']
                  return [value, name]
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="vo2max"
                stroke={chartTheme.colors.primary.main}
                strokeWidth={3}
                dot={{ r: 4, fill: chartTheme.colors.primary.main }}
                activeDot={{ r: 6, stroke: chartTheme.colors.primary.main, strokeWidth: 2 }}
                name="Est. VO2max"
              />
              {/* Reference lines for fitness categories */}
              <ReferenceLine y={60} stroke={chartTheme.colors.primary.light} strokeDasharray="3 3" label={{ value: 'Elite', fill: chartTheme.colors.primary.light, fontSize: 10 }} />
              <ReferenceLine y={52} stroke={chartTheme.colors.neutral[400]} strokeDasharray="3 3" label={{ value: 'Excellent', fill: chartTheme.colors.neutral[400], fontSize: 10 }} />
              <ReferenceLine y={45} stroke={chartTheme.colors.neutral[500]} strokeDasharray="3 3" label={{ value: 'Good', fill: chartTheme.colors.neutral[500], fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-5 p-4 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
            <p>
              <strong className="text-accent">VO2max</strong> estimated from your rolling 6-week best power output.
              Adjust the weight slider to see how body composition affects your estimated VO2max.
              The formula is: <code className="bg-bg-secondary px-2 py-0.5 rounded-[var(--radius-sm)] font-mono text-xs">(10.8 × W/kg) + 7</code>
            </p>
          </div>
        </div>
      )}

      {/* VAM Chart */}
      {vamData.length > 0 && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
            <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">VAM (Climbing Speed) Over Time</h3>
            {vamTrendLine && (
              <span className={`text-xs py-1.5 px-3.5 rounded-full font-semibold ${trendClasses[vamTrendLine.trend]}`}>
                {vamTrendLine.trend === 'improving' && '↑ Improving'}
                {vamTrendLine.trend === 'declining' && '↓ Declining'}
                {vamTrendLine.trend === 'stable' && '→ Stable'}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={vamData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={12} />
              <YAxis
                yAxisId="vam"
                stroke={chartTheme.axis}
                fontSize={12}
                domain={['auto', 'auto']}
                label={{ value: 'm/hr', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, name: string) => {
                  if (name === 'VAM') return [`${value} m/hr`, 'VAM']
                  if (name === 'Elevation') return [`${value} m`, 'Elevation']
                  return [value, name]
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return `${payload[0].payload.name} - ${label}`
                  }
                  return label
                }}
              />
              <Legend />
              <Area
                yAxisId="vam"
                type="monotone"
                dataKey="vam"
                stroke={chartTheme.colors.secondary.main}
                fill={chartTheme.fills.secondary.main}
                strokeWidth={2}
                dot={{ r: 4, fill: chartTheme.colors.secondary.main }}
                name="VAM"
              />
              {vamTrendLine && (
                <ReferenceLine
                  yAxisId="vam"
                  segment={[
                    { x: vamData[0]?.date, y: vamTrendLine.startValue },
                    { x: vamData[vamData.length - 1]?.date, y: vamTrendLine.endValue },
                  ]}
                  stroke={chartTheme.colors.amber.main}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
              {/* Reference lines for climbing categories */}
              <ReferenceLine yAxisId="vam" y={1500} stroke={chartTheme.colors.primary.light} strokeDasharray="3 3" label={{ value: 'Pro', fill: chartTheme.colors.primary.light, fontSize: 10 }} />
              <ReferenceLine yAxisId="vam" y={1200} stroke={chartTheme.colors.neutral[400]} strokeDasharray="3 3" label={{ value: 'Elite Amateur', fill: chartTheme.colors.neutral[400], fontSize: 10 }} />
              <ReferenceLine yAxisId="vam" y={900} stroke={chartTheme.colors.neutral[500]} strokeDasharray="3 3" label={{ value: 'Strong', fill: chartTheme.colors.neutral[500], fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-5 p-4 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
            <p>
              <strong className="text-accent">VAM (Velocità Ascensionale Media)</strong> = Vertical meters climbed per hour.
              Only rides with 100m+ elevation shown. Pro climbers: 1500-1800 m/hr on major climbs.
              Elite amateurs: 1200-1500 m/hr. Strong recreational: 900-1200 m/hr.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
