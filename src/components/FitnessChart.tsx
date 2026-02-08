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
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Fitness & Form</h3>
        <div className="text-text-muted text-center py-16 text-[0.9rem]">
          Need more rides with power data to calculate fitness trends.
        </div>
      </div>
    )
  }

  const latestData = fitnessData[fitnessData.length - 1]
  const formStatus =
    latestData.tsb > 15
      ? { label: 'Fresh', color: chartTheme.colors.amber.main }
      : latestData.tsb > 0
        ? { label: 'Optimal', color: chartTheme.colors.amber.light }
        : latestData.tsb > -15
          ? { label: 'Tired', color: chartTheme.colors.neutral[400] }
          : { label: 'Overreached', color: chartTheme.colors.semantic.negative }

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
      <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
        <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Fitness & Form</h3>
        <div className="flex gap-8 flex-wrap max-md:gap-4">
          <span className="flex flex-col items-center">
            <span className="text-[0.7rem] text-text-muted uppercase font-semibold tracking-wide">CTL</span>
            <span className="text-2xl font-bold" style={{ color: chartTheme.colors.primary.main }}>{latestData.ctl}</span>
          </span>
          <span className="flex flex-col items-center">
            <span className="text-[0.7rem] text-text-muted uppercase font-semibold tracking-wide">ATL</span>
            <span className="text-2xl font-bold" style={{ color: chartTheme.colors.secondary.main }}>{latestData.atl}</span>
          </span>
          <span className="flex flex-col items-center">
            <span className="text-[0.7rem] text-text-muted uppercase font-semibold tracking-wide">Form</span>
            <span className="text-2xl font-bold" style={{ color: formStatus.color }}>
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
          <ReferenceLine y={0} stroke={chartTheme.colors.neutral[500]} strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="ctl"
            stroke={chartTheme.colors.primary.main}
            fill={chartTheme.fills.primary.main}
            name="Fitness (CTL)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="atl"
            stroke={chartTheme.colors.secondary.main}
            fill={chartTheme.fills.secondary.main}
            name="Fatigue (ATL)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="tsb"
            stroke={chartTheme.colors.amber.main}
            fill={chartTheme.fills.amber.main}
            name="Form (TSB)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-5 p-5 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
        <p className="mb-2">
          <strong className="text-accent">CTL</strong> (Chronic Training Load) = your fitness level built over ~6 weeks
        </p>
        <p className="mb-2">
          <strong className="text-accent">ATL</strong> (Acute Training Load) = recent fatigue from the last ~week
        </p>
        <p>
          <strong className="text-accent">TSB</strong> (Training Stress Balance) = CTL - ATL = your current form
        </p>
      </div>
    </div>
  )
}
