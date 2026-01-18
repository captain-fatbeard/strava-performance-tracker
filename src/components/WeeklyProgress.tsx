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
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'

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
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis dataKey="week" stroke={chartTheme.axis} fontSize={12} />
          <YAxis yAxisId="left" stroke={chartTheme.axis} fontSize={12} />
          <YAxis yAxisId="right" orientation="right" stroke={chartTheme.axis} fontSize={12} />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: number, name: string) => {
              if (name === 'Training Stress') return [value, 'TSS']
              if (name === 'Distance (km)') return [`${value} km`, 'Distance']
              if (name === 'Avg Power (W)') return [`${value} W`, 'Avg Power']
              return [value, name]
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="totalTSS"
            fill={chartTheme.colors.orange.primary}
            name="Training Stress"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="totalDistance"
            fill={chartTheme.colors.amber.primary}
            name="Distance (km)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgPower"
            stroke={chartTheme.colors.orange.light}
            strokeWidth={2}
            dot={{ r: 4, fill: chartTheme.colors.orange.light }}
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
