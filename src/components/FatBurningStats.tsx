import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from 'recharts'
import { type StravaActivity, secondsToHMS } from '~/lib/strava'
import {
  calculateFatBurningSummary,
  getHRZones,
  calculateActivityFatStats,
} from '~/lib/performance'
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'

interface FatBurningStatsProps {
  activities: StravaActivity[]
  weight: number
  maxHR: number
  restingHR: number
}

export function FatBurningStats({
  activities,
  weight,
  maxHR,
  restingHR,
}: FatBurningStatsProps) {
  const summary = useMemo(
    () => calculateFatBurningSummary(activities, weight, maxHR, restingHR),
    [activities, weight, maxHR, restingHR]
  )

  const hrZones = useMemo(
    () => getHRZones(maxHR, restingHR),
    [maxHR, restingHR]
  )

  // Calculate time spent in each zone
  const zoneTimeData = useMemo(() => {
    const zoneTime: Record<string, number> = {}
    hrZones.forEach((z) => (zoneTime[z.name] = 0))

    activities
      .filter((a) => a.average_heartrate)
      .forEach((activity) => {
        const stats = calculateActivityFatStats(activity, weight, maxHR, restingHR)
        if (stats) {
          zoneTime[stats.zone] = (zoneTime[stats.zone] || 0) + activity.moving_time
        }
      })

    return hrZones.map((zone) => ({
      zone: zone.name.replace(' (', '\n('),
      shortName: zone.name.split(' ')[0] + ' ' + zone.name.split(' ')[1],
      time: Math.round(zoneTime[zone.name] / 60), // minutes
      color: zone.color,
      fatRatio: zone.fatBurnRatio * 100,
    }))
  }, [activities, hrZones, weight, maxHR, restingHR])

  // Recent activities with fat stats
  const recentFatActivities = useMemo(() => {
    return activities
      .filter((a) => a.average_heartrate)
      .slice(0, 10)
      .map((a) => calculateActivityFatStats(a, weight, maxHR, restingHR))
      .filter(Boolean)
  }, [activities, weight, maxHR, restingHR])

  if (summary.totalActivitiesWithHR === 0) {
    return (
      <div className="chart-section">
        <h3>Fat Burning Stats</h3>
        <div className="no-data">
          Need activities with heart rate data to calculate fat burning stats.
        </div>
      </div>
    )
  }

  const fatMaxZone = hrZones[1] // Zone 2 is optimal for fat burning

  return (
    <div className="charts-container">
      {/* Summary Cards */}
      <div className="chart-section">
        <h3>Fat Burning Summary</h3>
        <div className="fat-burn-cards">
          <div className="stat-card fat-card">
            <div className="stat-value">{summary.totalFatBurned}g</div>
            <div className="stat-label">Total Fat Burned</div>
            <div className="stat-sublabel">≈ {(summary.totalFatBurned / 1000).toFixed(2)} kg</div>
          </div>
          <div className="stat-card fat-card">
            <div className="stat-value">{Math.round(summary.avgFatRatio * 100)}%</div>
            <div className="stat-label">Avg Fat Burn Ratio</div>
            <div className="stat-sublabel">of calories from fat</div>
          </div>
          <div className="stat-card fat-card highlight">
            <div className="stat-value">{secondsToHMS(summary.zone2Time)}</div>
            <div className="stat-label">Time in Fat Burn Zone</div>
            <div className="stat-sublabel">{summary.zone2Percentage}% of total training</div>
          </div>
          <div className="stat-card fat-card">
            <div className="stat-value">{summary.totalCalories.toLocaleString()}</div>
            <div className="stat-label">Total Calories</div>
            <div className="stat-sublabel">{summary.totalActivitiesWithHR} activities</div>
          </div>
        </div>
      </div>

      {/* FatMax Zone Indicator */}
      <div className="chart-section">
        <div className="chart-header">
          <h3>Your FatMax Zone</h3>
          <span className="ftp-badge" style={{ backgroundColor: '#22c55e' }}>
            Optimal Fat Burning
          </span>
        </div>
        <div className="fatmax-indicator">
          <div className="fatmax-range">
            <div className="fatmax-label">Target Heart Rate</div>
            <div className="fatmax-value">
              {fatMaxZone.min} - {fatMaxZone.max} bpm
            </div>
          </div>
          <div className="fatmax-info">
            <p>
              At <strong>60-70% intensity</strong>, your body burns the highest
              percentage of calories from fat (~65%). Train in this zone for
              optimal fat oxidation.
            </p>
            <div className="fatmax-tips">
              <div className="tip">
                <span className="tip-icon">💡</span>
                You can hold a conversation at this intensity
              </div>
              <div className="tip">
                <span className="tip-icon">⏱️</span>
                Aim for 45-90 minute sessions for best results
              </div>
              <div className="tip">
                <span className="tip-icon">🔥</span>
                Fasted training may increase fat oxidation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HR Zones Time Distribution */}
      <div className="chart-section">
        <h3>Time in Each HR Zone</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={zoneTimeData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis type="number" stroke={chartTheme.axis} fontSize={12} unit=" min" />
            <YAxis
              type="category"
              dataKey="shortName"
              stroke={chartTheme.axis}
              fontSize={11}
              width={80}
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number, name: string) => {
                if (name === 'Time') return [`${value} min`, 'Time']
                if (name === 'Fat Burn %') return [`${value}%`, 'Fat from calories']
                return [value, name]
              }}
            />
            <Legend />
            <Bar dataKey="time" name="Time" radius={[0, 4, 4, 0]}>
              {zoneTimeData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="zone-legend">
          {hrZones.map((zone) => (
            <div key={zone.name} className="zone-item">
              <span className="zone-dot" style={{ backgroundColor: zone.color }} />
              <span className="zone-name">{zone.name}</span>
              <span className="zone-range">{zone.min}-{zone.max} bpm</span>
              <span className="zone-fat">{Math.round(zone.fatBurnRatio * 100)}% fat</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Fat Burn Trend */}
      {summary.weeklyFatBurn.length > 0 && (
        <div className="chart-section">
          <h3>Weekly Fat Burn Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={summary.weeklyFatBurn}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="week" stroke={chartTheme.axis} fontSize={12} />
              <YAxis
                yAxisId="fat"
                stroke={chartTheme.axis}
                fontSize={12}
                label={{ value: 'grams', angle: -90, position: 'insideLeft', fill: chartTheme.axis }}
              />
              <YAxis
                yAxisId="time"
                orientation="right"
                stroke={chartTheme.axis}
                fontSize={12}
                label={{ value: 'min', angle: 90, position: 'insideRight', fill: chartTheme.axis }}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, name: string) => {
                  if (name === 'Fat Burned') return [`${value}g`, 'Fat Burned']
                  if (name === 'Zone 2 Time') return [`${value} min`, 'Zone 2 Time']
                  return [value, name]
                }}
              />
              <Legend />
              <Bar
                yAxisId="fat"
                dataKey="fatBurned"
                fill={chartTheme.colors.orange.primary}
                name="Fat Burned"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="time"
                type="monotone"
                dataKey="zone2Time"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4, fill: '#22c55e' }}
                name="Zone 2 Time"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activities Fat Stats */}
      {recentFatActivities.length > 0 && (
        <div className="chart-section">
          <h3>Recent Activities - Fat Burning</h3>
          <div className="fat-activities-table">
            <table>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Avg HR</th>
                  <th>Intensity</th>
                  <th>Calories</th>
                  <th>Fat Burned</th>
                  <th>Zone</th>
                </tr>
              </thead>
              <tbody>
                {recentFatActivities.map((stats) => (
                  <tr key={stats!.activityId} className={stats!.isOptimalFatBurn ? 'optimal' : ''}>
                    <td className="activity-name">{stats!.name}</td>
                    <td>{stats!.avgHR} bpm</td>
                    <td>
                      <span
                        className="intensity-badge"
                        style={{
                          backgroundColor: stats!.isOptimalFatBurn
                            ? '#22c55e'
                            : stats!.intensity > 80
                              ? '#f97316'
                              : '#71717a',
                        }}
                      >
                        {stats!.intensity}%
                      </span>
                    </td>
                    <td>{stats!.calories}</td>
                    <td className="fat-value">{stats!.fatBurned}g</td>
                    <td>
                      <span className={`zone-badge ${stats!.isOptimalFatBurn ? 'fat-burn' : ''}`}>
                        {stats!.zone.split(' ')[0]} {stats!.zone.split(' ')[1]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="chart-section">
        <div className="fitness-legend">
          <p>
            <strong>Fat Burning Zone (Zone 2)</strong> = 60-70% of heart rate reserve.
            At this intensity, ~65% of calories come from fat oxidation.
          </p>
          <p>
            <strong>Fat Burned (grams)</strong> = Estimated based on calories burned ×
            fat ratio at your average HR intensity. 1g fat ≈ 9 calories.
          </p>
          <p>
            <strong>Intensity %</strong> = Your average HR as percentage of heart rate
            reserve (max HR - resting HR). Adjust your Max HR and Resting HR in settings
            for accurate calculations.
          </p>
        </div>
      </div>
    </div>
  )
}
