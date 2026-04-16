import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { type StravaActivity, secondsToHMS } from '~/lib/strava'
import { getHRZones, getHRZoneForBPM } from '~/lib/performance'
import {
  chartTheme,
  hrZoneColors,
  tooltipStyle,
  formatDateShort,
  activityTooltipLabel,
} from '~/lib/chart-theme'

interface HeartRateInsightsProps {
  activities: StravaActivity[]
  maxHR: number
  restingHR: number
}

// Calculate 5-activity rolling average
function rollingAverage(data: { avgHR: number }[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null
    const slice = data.slice(i - window + 1, i + 1)
    return Math.round(slice.reduce((sum, d) => sum + d.avgHR, 0) / window)
  })
}

// Determine trend from rolling average slope
function getTrend(data: (number | null)[]): 'Improving' | 'Stable' | 'Declining' {
  const valid = data.filter((v): v is number => v !== null)
  if (valid.length < 4) return 'Stable'

  // Compare first and last quarter averages
  const quarter = Math.max(2, Math.floor(valid.length / 4))
  const firstAvg = valid.slice(0, quarter).reduce((s, v) => s + v, 0) / quarter
  const lastAvg = valid.slice(-quarter).reduce((s, v) => s + v, 0) / quarter
  const diff = lastAvg - firstAvg

  if (diff < -2) return 'Improving' // lower avg HR = improving fitness
  if (diff > 2) return 'Declining'
  return 'Stable'
}

const trendBadgeClass: Record<string, string> = {
  Improving: 'bg-success-muted text-success',
  Stable: 'bg-bg-tertiary text-text-secondary',
  Declining: 'bg-danger-muted text-danger',
}

export function HeartRateInsights({ activities, maxHR, restingHR }: HeartRateInsightsProps) {
  // --- Heart Rate Trends Data ---
  const hrTrendData = useMemo(() => {
    const withHR = activities
      .filter((a) => a.average_heartrate && a.max_heartrate)
      .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime())

    const data = withHR.map((a) => ({
      date: a.start_date_local.split('T')[0],
      name: a.name,
      avgHR: a.average_heartrate!,
      maxHR: a.max_heartrate!,
    }))

    const rolling = rollingAverage(data, 5)

    return data.map((d, i) => ({
      ...d,
      rollingAvg: rolling[i],
    }))
  }, [activities])

  const trend = useMemo(
    () => getTrend(hrTrendData.map((d) => d.rollingAvg)),
    [hrTrendData]
  )

  // --- HR Zone Distribution Data ---
  const zoneDistribution = useMemo(() => {
    if (!maxHR || !restingHR) return []

    const zones = getHRZones(maxHR, restingHR)
    const zoneTime: Record<string, number> = {}
    zones.forEach((z) => (zoneTime[z.name] = 0))

    activities
      .filter((a) => a.average_heartrate)
      .forEach((a) => {
        const zone = getHRZoneForBPM(a.average_heartrate!, maxHR, restingHR)
        if (zone) {
          zoneTime[zone.name] += a.moving_time
        }
      })

    const totalTime = Object.values(zoneTime).reduce((sum, t) => sum + t, 0)
    if (totalTime === 0) return []

    return zones.map((z, i) => ({
      name: z.name.replace(/Zone \d+ \(/, '').replace(')', ''),
      fullName: z.name,
      time: zoneTime[z.name],
      percentage: Math.round((zoneTime[z.name] / totalTime) * 100),
      color: hrZoneColors[i],
      bpmRange: `${z.min}-${z.max}`,
    })).filter((z) => z.time > 0)
  }, [activities, maxHR, restingHR])

  const hrZones = useMemo(
    () => (maxHR && restingHR ? getHRZones(maxHR, restingHR) : []),
    [maxHR, restingHR]
  )

  const hasHRData = hrTrendData.length > 0
  const hasZoneData = zoneDistribution.length > 0

  if (!hasHRData && !hasZoneData) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Heart Rate Insights</h3>
        <div className="text-text-muted text-center py-16 text-[0.9rem]">
          No heart rate data available. Use a heart rate monitor during activities to see insights here.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Heart Rate Trends */}
      {hasHRData && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
            <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Heart Rate Trends</h3>
            <span className={`py-1.5 px-4 rounded-full text-sm font-semibold ${trendBadgeClass[trend]}`}>
              {trend}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={hrTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis
                dataKey="date"
                stroke={chartTheme.axis}
                fontSize={12}
                tickFormatter={formatDateShort}
              />
              <YAxis
                stroke={chartTheme.axis}
                fontSize={12}
                domain={['auto', 'auto']}
                label={{ value: 'bpm', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
              />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={activityTooltipLabel}
                formatter={(value: number, name: string) => {
                  if (value === null) return [null, null]
                  return [`${value} bpm`, name]
                }}
              />
              <Area
                type="monotone"
                dataKey="maxHR"
                fill={chartTheme.fills.coral.light}
                stroke={chartTheme.colors.coral.main}
                strokeWidth={1}
                name="Max HR"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgHR"
                stroke={chartTheme.colors.primary.main}
                strokeWidth={2}
                dot={{ r: 3, fill: chartTheme.colors.primary.main }}
                name="Avg HR"
              />
              <Line
                type="monotone"
                dataKey="rollingAvg"
                stroke={chartTheme.colors.amber.main}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name="5-Activity Avg"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HR Zone Distribution */}
      {hasZoneData && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">HR Zone Distribution</h3>
          <div className="grid grid-cols-2 gap-8 items-start max-md:grid-cols-1">
            <div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={zoneDistribution}
                    dataKey="time"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ name, percentage }) =>
                      percentage > 5 ? `${percentage}%` : ''
                    }
                    labelLine={false}
                  >
                    {zoneDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number) => [secondsToHMS(value), 'Time']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-3 text-text-muted font-semibold text-[0.7rem] uppercase tracking-wide border-b border-border">Zone</th>
                    <th className="text-left p-3 text-text-muted font-semibold text-[0.7rem] uppercase tracking-wide border-b border-border">BPM</th>
                    <th className="text-left p-3 text-text-muted font-semibold text-[0.7rem] uppercase tracking-wide border-b border-border">Time</th>
                    <th className="text-right p-3 text-text-muted font-semibold text-[0.7rem] uppercase tracking-wide border-b border-border">%</th>
                  </tr>
                </thead>
                <tbody>
                  {hrZones.map((zone, i) => {
                    const data = zoneDistribution.find((d) => d.fullName === zone.name)
                    return (
                      <tr key={zone.name}>
                        <td className="p-3 border-b border-border-subtle">
                          <span
                            className="inline-block size-3 rounded-full mr-2"
                            style={{ backgroundColor: hrZoneColors[i] }}
                          />
                          {zone.name.replace(/Zone \d+ \(/, '').replace(')', '')}
                        </td>
                        <td className="p-3 border-b border-border-subtle text-text-secondary">
                          {zone.min}-{zone.max}
                        </td>
                        <td className="p-3 border-b border-border-subtle text-text-primary">
                          {data ? secondsToHMS(data.time) : '-'}
                        </td>
                        <td className="p-3 border-b border-border-subtle text-right text-text-primary font-medium">
                          {data ? `${data.percentage}%` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
