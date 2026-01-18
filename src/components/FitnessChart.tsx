import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { type StravaActivity } from '~/lib/strava'
import { calculateFitnessOverTime, estimateFTP } from '~/lib/performance'
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'

interface FitnessChartProps {
  activities: StravaActivity[]
  days?: number
}

export function FitnessChart({ activities, days = 90 }: FitnessChartProps) {
  const ftp = useMemo(() => estimateFTP(activities), [activities])

  const fitnessData = useMemo(() => {
    if (!ftp) return []
    return calculateFitnessOverTime(activities, ftp, days)
  }, [activities, ftp, days])

  if (!ftp || fitnessData.length === 0) {
    return (
      <div className="chart-section">
        <h3>Fitness & Form</h3>
        <div className="no-data">
          Need more rides with power data to calculate fitness trends.
        </div>
      </div>
    )
  }

  const latestData = fitnessData[fitnessData.length - 1]
  const formStatus =
    latestData.tsb > 15
      ? { label: 'Fresh', color: chartTheme.colors.success }
      : latestData.tsb > 0
        ? { label: 'Optimal', color: chartTheme.colors.info }
        : latestData.tsb > -15
          ? { label: 'Tired', color: chartTheme.colors.primary }
          : { label: 'Overreached', color: chartTheme.colors.danger }

  return (
    <div className="chart-section">
      <div className="chart-header">
        <h3>Fitness & Form</h3>
        <div className="fitness-stats">
          <span className="fitness-stat">
            <span className="label">CTL</span>
            <span className="value" style={{ color: chartTheme.colors.info }}>{latestData.ctl}</span>
          </span>
          <span className="fitness-stat">
            <span className="label">ATL</span>
            <span className="value" style={{ color: chartTheme.colors.primary }}>{latestData.atl}</span>
          </span>
          <span className="fitness-stat">
            <span className="label">Form</span>
            <span className="value" style={{ color: formStatus.color }}>
              {latestData.tsb} ({formStatus.label})
            </span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={fitnessData}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis
            dataKey="date"
            stroke={chartTheme.axis}
            fontSize={12}
            tickFormatter={(date) => format(parseISO(date), 'MMM d')}
            interval="preserveStartEnd"
          />
          <YAxis stroke={chartTheme.axis} fontSize={12} />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(date) => format(parseISO(date as string), 'MMM d, yyyy')}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                ctl: 'Fitness (CTL)',
                atl: 'Fatigue (ATL)',
                tsb: 'Form (TSB)',
              }
              return [value, labels[name] || name]
            }}
          />
          <Legend />
          <ReferenceLine y={0} stroke={chartTheme.axis} strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="ctl"
            stroke={chartTheme.colors.info}
            fill={chartTheme.fills.info}
            name="Fitness (CTL)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="atl"
            stroke={chartTheme.colors.primary}
            fill={chartTheme.fills.primary}
            name="Fatigue (ATL)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="tsb"
            stroke={chartTheme.colors.success}
            fill={chartTheme.fills.success}
            name="Form (TSB)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="fitness-legend">
        <p>
          <strong>CTL</strong> (Chronic Training Load) = your fitness level built over ~6 weeks
        </p>
        <p>
          <strong>ATL</strong> (Acute Training Load) = recent fatigue from the last ~week
        </p>
        <p>
          <strong>TSB</strong> (Training Stress Balance) = CTL - ATL = your current form
        </p>
      </div>
    </div>
  )
}
