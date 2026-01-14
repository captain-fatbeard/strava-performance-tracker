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

interface FitnessChartProps {
  activities: StravaActivity[]
}

export function FitnessChart({ activities }: FitnessChartProps) {
  const ftp = useMemo(() => estimateFTP(activities), [activities])

  const fitnessData = useMemo(() => {
    if (!ftp) return []
    return calculateFitnessOverTime(activities, ftp, 90)
  }, [activities, ftp])

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
      ? { label: 'Fresh', color: '#22c55e' }
      : latestData.tsb > 0
        ? { label: 'Optimal', color: '#3b82f6' }
        : latestData.tsb > -15
          ? { label: 'Tired', color: '#f97316' }
          : { label: 'Overreached', color: '#ef4444' }

  return (
    <div className="chart-section">
      <div className="chart-header">
        <h3>Fitness & Form</h3>
        <div className="fitness-stats">
          <span className="fitness-stat">
            <span className="label">CTL</span>
            <span className="value">{latestData.ctl}</span>
          </span>
          <span className="fitness-stat">
            <span className="label">ATL</span>
            <span className="value">{latestData.atl}</span>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="date"
            stroke="#888"
            fontSize={12}
            tickFormatter={(date) => format(parseISO(date), 'MMM d')}
            interval="preserveStartEnd"
          />
          <YAxis stroke="#888" fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
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
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="ctl"
            stroke="#3b82f6"
            fill="#3b82f633"
            name="Fitness (CTL)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="atl"
            stroke="#f97316"
            fill="#f9731633"
            name="Fatigue (ATL)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="tsb"
            stroke="#22c55e"
            fill="#22c55e33"
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
