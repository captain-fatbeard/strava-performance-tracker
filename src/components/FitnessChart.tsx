import { useMemo, useState } from 'react'
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
import { type StravaActivity } from '~/lib/strava'
import { calculateFitnessOverTime, estimateFTP } from '~/lib/performance'
import { chartTheme, tooltipStyle, formatDateShort, formatDateFull } from '~/lib/chart-theme'

interface FitnessChartProps {
  activities: StravaActivity[]
}

const rangeOptions = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
] as const

function getCTLLevel(ctl: number): { label: string; color: string } {
  if (ctl >= 100) return { label: 'Elite', color: chartTheme.colors.semantic.positive }
  if (ctl >= 70) return { label: 'Well-Trained', color: chartTheme.colors.primary.main }
  if (ctl >= 40) return { label: 'Trained', color: chartTheme.colors.primary.light }
  if (ctl >= 20) return { label: 'Building', color: chartTheme.colors.amber.main }
  return { label: 'Getting Started', color: chartTheme.colors.neutral[400] }
}

function getATLLevel(atl: number): { label: string; color: string } {
  if (atl >= 100) return { label: 'Very Heavy', color: chartTheme.colors.semantic.negative }
  if (atl >= 60) return { label: 'Heavy', color: chartTheme.colors.amber.main }
  if (atl >= 30) return { label: 'Moderate', color: chartTheme.colors.primary.main }
  return { label: 'Light', color: chartTheme.colors.neutral[400] }
}

export function FitnessChart({ activities }: FitnessChartProps) {
  const [days, setDays] = useState(30)
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
  const ctlLevel = getCTLLevel(latestData.ctl)
  const atlLevel = getATLLevel(latestData.atl)
  const formStatus =
    latestData.tsb > 25
      ? { label: 'Detraining', color: chartTheme.colors.neutral[500], hint: 'You may be losing fitness' }
      : latestData.tsb > 15
        ? { label: 'Fresh', color: chartTheme.colors.amber.main, hint: 'Great for race day' }
        : latestData.tsb > 5
          ? { label: 'Optimal', color: chartTheme.colors.semantic.positive, hint: 'Peak performance zone' }
          : latestData.tsb > -10
            ? { label: 'Neutral', color: chartTheme.colors.amber.light, hint: 'Normal training load' }
            : latestData.tsb > -25
              ? { label: 'Tired', color: chartTheme.colors.neutral[400], hint: 'Absorbing training' }
              : { label: 'Overreached', color: chartTheme.colors.semantic.negative, hint: 'Risk of overtraining' }

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
      <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Fitness & Form</h3>
          <div className="flex gap-1 bg-bg-tertiary rounded-[var(--radius-sm)] p-0.5">
            {rangeOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setDays(opt.days)}
                className={`text-[0.7rem] font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] transition-colors ${
                  days === opt.days
                    ? 'bg-accent text-bg-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-8 flex-wrap max-md:gap-4">
          <span className="flex flex-col items-center">
            <span className="text-[0.7rem] text-text-muted uppercase font-semibold tracking-wide">CTL</span>
            <span className="text-2xl font-bold" style={{ color: chartTheme.colors.primary.main }}>{latestData.ctl}</span>
            <span className="text-[0.65rem] font-medium mt-0.5 rounded-full px-2 py-0.5" style={{ color: ctlLevel.color, backgroundColor: `${ctlLevel.color}18` }}>{ctlLevel.label}</span>
          </span>
          <span className="flex flex-col items-center">
            <span className="text-[0.7rem] text-text-muted uppercase font-semibold tracking-wide">ATL</span>
            <span className="text-2xl font-bold" style={{ color: chartTheme.colors.secondary.main }}>{latestData.atl}</span>
            <span className="text-[0.65rem] font-medium mt-0.5 rounded-full px-2 py-0.5" style={{ color: atlLevel.color, backgroundColor: `${atlLevel.color}18` }}>{atlLevel.label}</span>
          </span>
          <span className="flex flex-col items-center">
            <span className="text-[0.7rem] text-text-muted uppercase font-semibold tracking-wide">Form</span>
            <span className="text-2xl font-bold" style={{ color: formStatus.color }}>
              {latestData.tsb}
            </span>
            <span className="text-[0.65rem] font-medium mt-0.5 rounded-full px-2 py-0.5" style={{ color: formStatus.color, backgroundColor: `${formStatus.color}18` }}>{formStatus.label}</span>
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
            tickFormatter={(date) => formatDateShort(date)}
            interval="preserveStartEnd"
          />
          <YAxis stroke={chartTheme.axis} fontSize={12} />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(date) => formatDateFull(date as string)}
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
        <div className="mb-4">
          <p className="mb-1">
            <strong className="text-accent">CTL</strong> (Fitness) — built over ~6 weeks of training
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-text-muted ml-3">
            <span>0–20 Getting Started</span>
            <span>20–40 Building</span>
            <span>40–70 Trained</span>
            <span>70–100 Well-Trained</span>
            <span>100+ Elite</span>
          </div>
        </div>
        <div className="mb-4">
          <p className="mb-1">
            <strong className="text-accent">ATL</strong> (Fatigue) — recent load from the last ~week
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-text-muted ml-3">
            <span>0–30 Light</span>
            <span>30–60 Moderate</span>
            <span>60–100 Heavy</span>
            <span>100+ Very Heavy</span>
          </div>
        </div>
        <div>
          <p className="mb-1">
            <strong className="text-accent">Form</strong> (TSB = CTL − ATL) — {formStatus.hint}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-text-muted ml-3">
            <span>&gt;25 Detraining</span>
            <span>15–25 Fresh</span>
            <span>5–15 Optimal</span>
            <span>−10–5 Neutral</span>
            <span>−25–−10 Tired</span>
            <span>&lt;−25 Overreached</span>
          </div>
        </div>
      </div>
    </div>
  )
}
