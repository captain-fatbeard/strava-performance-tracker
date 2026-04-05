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
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { type StravaActivity } from '~/lib/strava'
import type { SegmentEffortWithActivity } from '~/lib/storage/supabase-client'
import { calculateEF, estimateVO2max, classifyGradeBand, GRADE_BAND_ORDER } from '~/lib/performance'
import { chartTheme, tooltipStyle, formatDateShort, activityTooltipLabel } from '~/lib/chart-theme'
import { isRide } from '~/lib/activities'
import { calculateTrendLine } from '~/lib/trend'
import { trendClasses } from '~/lib/styles'
import type { WeightEntry } from '~/lib/dashboard-context'

interface EfficiencyChartProps {
  activities: StravaActivity[]
  weight: number
  weightEntries: WeightEntry[]
  segmentData?: SegmentEffortWithActivity[]
}

interface SegmentSpeedData {
  gradeBand: string
  avgSpeed: number
  bestSpeed: number
  count: number
}

// Find the weight entry closest to a given date (most recent entry on or before)
function getWeightForDate(date: Date, weightEntries: WeightEntry[], fallback: number): number {
  if (weightEntries.length === 0) return fallback

  // weightEntries are sorted DESC by recordedAt
  for (const entry of weightEntries) {
    if (new Date(entry.recordedAt) <= date) {
      return entry.weight
    }
  }

  // If no entry is on or before the date, use the earliest entry
  return weightEntries[weightEntries.length - 1].weight
}

const BAND_COLORS = [
  chartTheme.colors.primary.main,
  chartTheme.colors.sky.main,
  chartTheme.colors.secondary.main,
  chartTheme.colors.amber.main,
  chartTheme.colors.coral.main,
]

export function EfficiencyChart({ activities, weight, weightEntries, segmentData }: EfficiencyChartProps) {
  // Calculate EF for each ride over time
  const efficiencyData = useMemo(() => {
    const rides = activities
      .filter((a) => isRide(a) && a.average_watts && a.average_heartrate)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    return rides.map((ride) => {
      const np = ride.weighted_average_watts || ride.average_watts || 0
      const ef = calculateEF(np, ride.average_heartrate || 0)

      return {
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
      .filter((a) => isRide(a) && a.average_watts && a.moving_time >= 1200)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    if (rides.length === 0) return []

    // Calculate rolling 6-week best power for FTP estimation
    const result: { fullDate: string; vo2max: number; rollingFTP: number; weight: number }[] = []

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
        const dateWeight = getWeightForDate(rideDate, weightEntries, weight)
        const vo2max = estimateVO2max(rollingFTP, dateWeight)

        result.push({
          fullDate: ride.start_date_local,
          vo2max,
          rollingFTP,
          weight: dateWeight,
        })
      }
    })

    return result
  }, [activities, weight, weightEntries])

  // Calculate climbing speed (road km/h) for rides with significant climbing
  const climbSpeedData = useMemo(() => {
    const rides = activities
      .filter((a) => isRide(a) && a.total_elevation_gain >= 100)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    return rides.map((ride) => {
      const speed = Math.round(ride.average_speed * 3.6 * 10) / 10 // m/s → km/h
      return {
        fullDate: ride.start_date_local,
        speed,
        elevation: Math.round(ride.total_elevation_gain),
        name: ride.name,
      }
    })
  }, [activities])

  const climbSpeedTrendLine = useMemo(
    () => calculateTrendLine(climbSpeedData.map((d) => d.speed), 0.3),
    [climbSpeedData],
  )

  const efTrendLine = useMemo(
    () => calculateTrendLine(efficiencyData.map((d) => d.ef), 0.01),
    [efficiencyData],
  )

  // Compute segment climbing speed (road km/h) grouped by gradient band
  const segmentSpeedData = useMemo((): SegmentSpeedData[] | null => {
    if (!segmentData || segmentData.length === 0) return null

    const bandMap = new Map<string, { total: number; best: number; count: number }>()

    for (const effort of segmentData) {
      const seg = effort.segment
      if (!seg || seg.average_grade < 1) continue
      if (!effort.moving_time || effort.moving_time <= 0) continue
      // Skip very short segments (< 200m) — momentum-dominated, not representative of climbing ability
      if (seg.distance < 200) continue

      // Road speed = segment distance / time → km/h
      const speedKmh = (seg.distance / effort.moving_time) * 3.6
      if (speedKmh <= 0) continue

      // Sanity check: filter out segments with bad elevation data (e.g. below-sea-level GPS glitches).
      // At steep grades there's a physical speed limit. Using generous 600W / 80kg model:
      // max_speed_kmh ≈ (600 * 3.6) / (80 * 9.81 * grade) ≈ 2.75 / grade
      // This gives ~46 km/h at 6%, ~31 km/h at 9%, ~23 km/h at 12%, ~12 km/h at 23%
      const grade = seg.average_grade / 100
      if (speedKmh > 2.75 / grade) continue

      const band = classifyGradeBand(seg.average_grade)
      const existing = bandMap.get(band) || { total: 0, best: 0, count: 0 }
      existing.total += speedKmh
      existing.best = Math.max(existing.best, speedKmh)
      existing.count++
      bandMap.set(band, existing)
    }

    if (bandMap.size === 0) return null

    return GRADE_BAND_ORDER
      .filter((band) => bandMap.has(band))
      .map((band) => {
        const d = bandMap.get(band)!
        return {
          gradeBand: band,
          avgSpeed: Math.round((d.total / d.count) * 10) / 10,
          bestSpeed: Math.round(d.best * 10) / 10,
          count: d.count,
        }
      })
  }, [segmentData])

  // Compute climbing speed over time — one line per gradient band
  const segmentSpeedOverTime = useMemo(() => {
    if (!segmentData || segmentData.length === 0) return null

    // Collect valid efforts with date
    const efforts: { date: string; band: string; speed: number; activityName: string }[] = []

    for (const effort of segmentData) {
      const seg = effort.segment
      if (!seg || seg.average_grade < 1) continue
      if (!effort.moving_time || effort.moving_time <= 0) continue
      if (seg.distance < 200) continue

      const speedKmh = (seg.distance / effort.moving_time) * 3.6
      if (speedKmh <= 0) continue

      const grade = seg.average_grade / 100
      if (speedKmh > 2.75 / grade) continue

      efforts.push({
        date: effort.activityDate,
        band: classifyGradeBand(seg.average_grade),
        speed: speedKmh,
        activityName: effort.activityName,
      })
    }

    if (efforts.length === 0) return null

    // Group by activity date, average speed per band per date
    const dateMap = new Map<string, { bands: Map<string, { total: number; count: number }>; activityName: string }>()

    for (const e of efforts) {
      if (!dateMap.has(e.date)) {
        dateMap.set(e.date, { bands: new Map(), activityName: e.activityName })
      }
      const entry = dateMap.get(e.date)!
      const bandEntry = entry.bands.get(e.band) || { total: 0, count: 0 }
      bandEntry.total += e.speed
      bandEntry.count++
      entry.bands.set(e.band, bandEntry)
    }

    // Build sorted time series
    const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    return sorted.map(([date, { bands, activityName }]) => {
      const point: Record<string, number | string | undefined> = { fullDate: date, name: activityName }
      for (const band of GRADE_BAND_ORDER) {
        const b = bands.get(band)
        point[band] = b ? Math.round((b.total / b.count) * 10) / 10 : undefined
      }
      return point
    })
  }, [segmentData])

  // Which bands actually have data in the time series?
  const activeBands = useMemo(() => {
    if (!segmentSpeedOverTime) return []
    return GRADE_BAND_ORDER.filter((band) =>
      segmentSpeedOverTime.some((point) => point[band] !== undefined)
    )
  }, [segmentSpeedOverTime])

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
                <XAxis dataKey="fullDate" stroke={chartTheme.axis} fontSize={12} tickFormatter={(value) => formatDateShort(value)} />
                <YAxis
                  yAxisId="ef"
                  stroke={chartTheme.axis}
                  fontSize={12}
                  domain={['auto', 'auto']}
                  label={{ value: 'EF', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
                />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={activityTooltipLabel}
                  formatter={(value: number, name: string) => {
                    if (name === 'Efficiency Factor') return [value.toFixed(2), 'Efficiency Factor']
                    return [value, name]
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
                      { x: efficiencyData[0]?.fullDate, y: efTrendLine.startValue },
                      { x: efficiencyData[efficiencyData.length - 1]?.fullDate, y: efTrendLine.endValue },
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
            <span className="bg-linear-to-br from-accent to-accent-dark text-white py-1.5 px-4 rounded-full text-sm font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.3)]">Based on rolling FTP & weight history</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vo2maxData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="fullDate" stroke={chartTheme.axis} fontSize={12} tickFormatter={(value) => formatDateShort(value)} />
              <YAxis
                stroke={chartTheme.axis}
                fontSize={12}
                domain={['auto', 'auto']}
                label={{ value: 'ml/kg/min', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
              />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={activityTooltipLabel}
                formatter={(value: number, name: string, props: { payload?: { weight?: number } }) => {
                  if (name === 'Est. VO2max') return [`${value.toFixed(1)} ml/kg/min (@ ${props.payload?.weight ?? weight}kg)`, 'Est. VO2max']
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

      {/* Climbing Speed Charts — Segment mode or Activity fallback */}
      {segmentSpeedData ? (
        <>
          {/* Bar chart: average by gradient band */}
          <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
            <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
              <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Climbing Speed by Gradient</h3>
              <span className="bg-linear-to-br from-accent to-accent-dark text-white py-1.5 px-4 rounded-full text-sm font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.3)]">Segment-based</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={segmentSpeedData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="gradeBand" stroke={chartTheme.axis} fontSize={12} />
                <YAxis
                  stroke={chartTheme.axis}
                  fontSize={12}
                  label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string, props: { payload?: SegmentSpeedData }) => {
                    const count = props.payload?.count
                    if (name === 'Avg Speed') return [`${value} km/h (${count} segments)`, name]
                    if (name === 'Best Speed') return [`${value} km/h`, name]
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="avgSpeed" name="Avg Speed" radius={[4, 4, 0, 0]}>
                  {segmentSpeedData.map((_, i) => (
                    <Cell key={i} fill={BAND_COLORS[i % BAND_COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="bestSpeed" name="Best Speed" radius={[4, 4, 0, 0]} fillOpacity={0.4}>
                  {segmentSpeedData.map((_, i) => (
                    <Cell key={i} fill={BAND_COLORS[i % BAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-5 p-4 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
              <p>
                <strong className="text-accent">Climbing Speed</strong> — Road speed (km/h) during climbing segments grouped by
                average gradient. Steeper gradients naturally produce lower speeds.
              </p>
            </div>
          </div>

          {/* Line chart: climbing speed over time per gradient band */}
          {segmentSpeedOverTime && segmentSpeedOverTime.length > 1 && (
            <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
              <h3 className="text-lg font-semibold text-text-primary mb-5 max-[480px]:text-base">Climbing Speed Over Time</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={segmentSpeedOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="fullDate" stroke={chartTheme.axis} fontSize={12} tickFormatter={(value) => formatDateShort(value)} />
                  <YAxis
                    stroke={chartTheme.axis}
                    fontSize={12}
                    domain={['auto', 'auto']}
                    label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={activityTooltipLabel}
                    formatter={(value: number, name: string) => [`${value} km/h`, name]}
                  />
                  <Legend />
                  {activeBands.map((band, i) => (
                    <Line
                      key={band}
                      type="monotone"
                      dataKey={band}
                      stroke={BAND_COLORS[GRADE_BAND_ORDER.indexOf(band) % BAND_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: BAND_COLORS[GRADE_BAND_ORDER.indexOf(band) % BAND_COLORS.length] }}
                      connectNulls
                      name={band}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-5 p-4 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-accent">Climbing speed per activity</strong> — Average road speed for each gradient band per ride.
                  Track how your climbing speed at different gradients changes over time.
                </p>
              </div>
            </div>
          )}
        </>
      ) : climbSpeedData.length > 0 ? (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
            <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Climbing Speed Over Time</h3>
            {climbSpeedTrendLine && (
              <span className={`text-xs py-1.5 px-3.5 rounded-full font-semibold ${trendClasses[climbSpeedTrendLine.trend]}`}>
                {climbSpeedTrendLine.trend === 'improving' && '↑ Improving'}
                {climbSpeedTrendLine.trend === 'declining' && '↓ Declining'}
                {climbSpeedTrendLine.trend === 'stable' && '→ Stable'}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={climbSpeedData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="fullDate" stroke={chartTheme.axis} fontSize={12} tickFormatter={(value) => formatDateShort(value)} />
              <YAxis
                yAxisId="speed"
                stroke={chartTheme.axis}
                fontSize={12}
                domain={['auto', 'auto']}
                label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
              />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={activityTooltipLabel}
                formatter={(value: number, name: string) => {
                  if (name === 'Speed') return [`${value} km/h`, 'Speed']
                  return [value, name]
                }}
              />
              <Legend />
              <Area
                yAxisId="speed"
                type="monotone"
                dataKey="speed"
                stroke={chartTheme.colors.secondary.main}
                fill={chartTheme.fills.secondary.main}
                strokeWidth={2}
                dot={{ r: 4, fill: chartTheme.colors.secondary.main }}
                name="Speed"
              />
              {climbSpeedTrendLine && (
                <ReferenceLine
                  yAxisId="speed"
                  segment={[
                    { x: climbSpeedData[0]?.fullDate, y: climbSpeedTrendLine.startValue },
                    { x: climbSpeedData[climbSpeedData.length - 1]?.fullDate, y: climbSpeedTrendLine.endValue },
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
              <strong className="text-accent">Climbing Speed</strong> — Average road speed (km/h) for rides with 100m+ elevation gain.
              Use "Sync All" in settings to unlock segment-based climbing speed grouped by gradient.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
