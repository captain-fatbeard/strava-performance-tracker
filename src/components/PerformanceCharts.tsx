import { useMemo, useState } from 'react'
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
import { type StravaActivity } from '~/lib/strava'
import { chartTheme, tooltipStyle, formatDateShort, activityTooltipLabel } from '~/lib/chart-theme'
import { isRide } from '~/lib/activities'
import { calculateTrendLine } from '~/lib/trend'
import { trendClasses } from '~/lib/styles'
import { RangeSelector } from './RangeSelector'

interface PerformanceChartsProps {
  lifetimeActivities: StravaActivity[]
}

export function PerformanceCharts({ lifetimeActivities }: PerformanceChartsProps) {
  const [powerDays, setPowerDays] = useState(90)
  const [hrDays, setHrDays] = useState(90)

  const allPowerTrendData = useMemo(() => {
    const rides = lifetimeActivities
      .filter((a) => isRide(a) && a.average_watts)
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
  }, [lifetimeActivities])

  const powerTrendData = useMemo(() => {
    if (powerDays === 0) return allPowerTrendData
    const cutoff = Date.now() - powerDays * 24 * 60 * 60 * 1000
    return allPowerTrendData.filter((d) => new Date(d.fullDate).getTime() >= cutoff)
  }, [allPowerTrendData, powerDays])

  const powerTrendLine = useMemo(
    () => calculateTrendLine(powerTrendData.map((d) => d.avgPower)),
    [powerTrendData],
  )

  const allHrTrendData = useMemo(() => {
    return lifetimeActivities
      .filter((a) => isRide(a) && a.average_heartrate)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .map((activity) => ({
        fullDate: activity.start_date_local,
        avgHR: Math.round(activity.average_heartrate || 0),
        maxHR: activity.max_heartrate || 0,
        name: activity.name,
      }))
  }, [lifetimeActivities])

  const hrTrendData = useMemo(() => {
    if (hrDays === 0) return allHrTrendData
    const cutoff = Date.now() - hrDays * 24 * 60 * 60 * 1000
    return allHrTrendData.filter((d) => new Date(d.fullDate).getTime() >= cutoff)
  }, [allHrTrendData, hrDays])

  const hasNoPowerData = allPowerTrendData.length === 0
  const hasNoPowerDataInRange = powerTrendData.length === 0
  const hasNoHRData = allHrTrendData.length === 0
  const hasNoHRDataInRange = hrTrendData.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Power Trend Chart */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-text-primary">Power Trend</h3>
            {!hasNoPowerData && <RangeSelector days={powerDays} onChange={setPowerDays} />}
          </div>
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
        ) : hasNoPowerDataInRange ? (
          <div className="text-text-muted text-center py-16 text-[0.9rem]">No rides with power data in the selected range.</div>
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
        {!hasNoPowerData && !hasNoPowerDataInRange && (
          <div className="mt-5 p-5 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
            <p className="mb-2"><strong className="text-accent">Avg Power</strong> — simple average of your power output over the ride. Doesn't account for intensity spikes.</p>
            <p><strong className="text-accent">Normalized Power</strong> — weighted average that better reflects the true physiological cost of a ride. Accounts for surges and variable effort, so it's always equal to or higher than avg power.</p>
          </div>
        )}
      </div>

      {/* Heart Rate Trend */}
      {!hasNoHRData && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <div className="flex items-center gap-4 mb-5">
            <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Heart Rate Trend</h3>
            <RangeSelector days={hrDays} onChange={setHrDays} />
          </div>
          {hasNoHRDataInRange ? (
            <div className="text-text-muted text-center py-16 text-[0.9rem]">No rides with heart rate data in the selected range.</div>
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
    </div>
  )
}
