import { useMemo, useState } from 'react'
import {
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
import { type StravaActivity } from '~/lib/strava'
import { calculateEF } from '~/lib/performance'
import { chartTheme, tooltipStyle, formatDateShort, activityTooltipLabel } from '~/lib/chart-theme'
import { isRide } from '~/lib/activities'
import { calculateTrendLine } from '~/lib/trend'
import { trendClasses } from '~/lib/styles'
import { RangeSelector } from './RangeSelector'

interface EfficiencyChartProps {
  lifetimeActivities: StravaActivity[]
}

export function EfficiencyChart({ lifetimeActivities }: EfficiencyChartProps) {
  const [efDays, setEfDays] = useState(90)

  const allEfficiencyData = useMemo(() => {
    const rides = lifetimeActivities
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
  }, [lifetimeActivities])

  const efficiencyData = useMemo(() => {
    if (efDays === 0) return allEfficiencyData
    const cutoff = Date.now() - efDays * 24 * 60 * 60 * 1000
    return allEfficiencyData.filter((d) => new Date(d.fullDate).getTime() >= cutoff)
  }, [allEfficiencyData, efDays])

  const efTrendLine = useMemo(
    () => calculateTrendLine(efficiencyData.map((d) => d.ef), 0.01),
    [efficiencyData],
  )

  const hasNoData = allEfficiencyData.length === 0
  const hasNoDataInRange = efficiencyData.length === 0

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
      <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Efficiency Factor Over Time</h3>
          {!hasNoData && <RangeSelector days={efDays} onChange={setEfDays} />}
        </div>
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
      ) : hasNoDataInRange ? (
        <div className="text-text-muted text-center py-16 text-[0.9rem]">
          No rides with power and heart rate in the selected range.
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
              <strong className="text-accent">EF = Normalized Power / Avg Heart Rate</strong> — higher is better.
              An improving trend means you're producing more power at the same heart rate.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
