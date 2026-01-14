import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { type StravaActivity, secondsToHMS } from '~/lib/strava'
import { calculateWeeklySummaries, estimateFTP } from '~/lib/performance'

interface WeeklyProgressProps {
  activities: StravaActivity[]
}

export function WeeklyProgress({ activities }: WeeklyProgressProps) {
  const ftp = useMemo(() => estimateFTP(activities) || 200, [activities])

  const weeklyData = useMemo(
    () => calculateWeeklySummaries(activities, ftp, 12),
    [activities, ftp]
  )

  if (weeklyData.length === 0) {
    return null
  }

  return (
    <div className="chart-section">
      <h3>Weekly Training Load</h3>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="week" stroke="#888" fontSize={12} />
          <YAxis yAxisId="left" stroke="#888" fontSize={12} />
          <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
            formatter={(value: number, name: string) => {
              if (name === 'totalTime') return [secondsToHMS(value), 'Time']
              if (name === 'totalTSS') return [value, 'TSS']
              if (name === 'totalDistance') return [`${value} km`, 'Distance']
              if (name === 'avgPower') return [`${value} W`, 'Avg Power']
              return [value, name]
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="totalTSS"
            fill="#fc4c02"
            name="Training Stress"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="totalDistance"
            fill="#3b82f6"
            name="Distance (km)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgPower"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Avg Power (W)"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="weekly-summary-cards">
        {weeklyData.slice(-4).map((week, i) => (
          <div key={i} className="weekly-card">
            <div className="weekly-card-header">{week.week}</div>
            <div className="weekly-card-stats">
              <div>
                <span className="stat-num">{week.rides + week.runs}</span>
                <span className="stat-label">activities</span>
              </div>
              <div>
                <span className="stat-num">{week.totalDistance}</span>
                <span className="stat-label">km</span>
              </div>
              <div>
                <span className="stat-num">{Math.round(week.totalTime / 3600)}</span>
                <span className="stat-label">hours</span>
              </div>
              <div>
                <span className="stat-num">{week.totalTSS}</span>
                <span className="stat-label">TSS</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
