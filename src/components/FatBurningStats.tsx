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
  Cell,
  ComposedChart,
  Line,
} from 'recharts'
import { type StravaActivity, secondsToHMS } from '~/lib/strava'
import {
  calculateCompleteFatBurningSummary,
  getHRZones,
  calculateActivityFatStats,
  calculateBMR,
} from '~/lib/performance'
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'
import { statCard, statCardAccent, statValue, statValueAccent } from '~/lib/styles'

interface FatBurningStatsProps {
  activities: StravaActivity[]
  weight: number
  maxHR: number
  restingHR: number
  age: number
  gender: 'male' | 'female'
  periodDays: number
}

export function FatBurningStats({
  activities,
  weight,
  maxHR,
  restingHR,
  age,
  gender,
  periodDays,
}: FatBurningStatsProps) {
  const summary = useMemo(
    () => calculateCompleteFatBurningSummary(
      activities, weight, maxHR, restingHR, age, gender, periodDays
    ),
    [activities, weight, maxHR, restingHR, age, gender, periodDays]
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

  const fatMaxZone = hrZones[1] // Zone 2 is optimal for fat burning

  return (
    <div className="flex flex-col gap-8">
      {/* Total Fat Burn Summary - Including Resting */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
          <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Total Fat Burning</h3>
          <span className="bg-linear-to-br from-accent to-accent-dark text-white py-1.5 px-4 rounded-full text-sm font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.3)]">Last {periodDays} days</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
          <div className={`${statCardAccent} text-center`}>
            <div className={statValueAccent}>{(summary.totalFatBurnWithResting / 1000).toFixed(2)} kg</div>
            <div className="text-sm text-text-secondary font-medium">Total Fat Burned</div>
            <div className="text-xs text-text-muted mt-1">{summary.totalFatBurnWithResting}g (resting + activity)</div>
          </div>
          <div className={`${statCard} text-center`}>
            <div className={statValue}>{(summary.periodRestingFatBurn / 1000).toFixed(2)} kg</div>
            <div className="text-sm text-text-secondary font-medium">Resting Fat Burn</div>
            <div className="text-xs text-text-muted mt-1">{summary.dailyRestingFatBurn}g/day × {periodDays} days</div>
          </div>
          <div className={`${statCard} text-center bg-linear-to-br from-success/15 to-success/5 border-success/30`}>
            <div className={statValueAccent}>{(summary.totalFatBurned / 1000).toFixed(2)} kg</div>
            <div className="text-sm text-text-secondary font-medium">Activity Fat Burn</div>
            <div className="text-xs text-text-muted mt-1">{summary.totalFatBurned}g from {summary.totalActivitiesWithHR} activities</div>
          </div>
          <div className={`${statCard} text-center`}>
            <div className={statValue}>{summary.bmr}</div>
            <div className="text-sm text-text-secondary font-medium">BMR (cal/day)</div>
            <div className="text-xs text-text-muted mt-1">Basal Metabolic Rate</div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Daily Fat Burn Breakdown</h3>
        <div className="flex flex-col gap-4 p-4 bg-bg-secondary rounded-[var(--radius-md)]">
          <div className="flex items-center gap-4 p-4 bg-bg-tertiary rounded-[var(--radius-md)] max-[480px]:gap-2 max-[480px]:p-3">
            <div className="text-2xl w-10 text-center">😴</div>
            <div className="flex-1">
              <div className="text-sm text-text-secondary mb-1">Resting (BMR)</div>
              <div className="text-xl font-bold text-text-primary max-[480px]:text-base">{summary.dailyRestingFatBurn}g/day</div>
              <div className="text-xs text-text-muted mt-1">~77% of BMR calories come from fat while at rest</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-bg-tertiary rounded-[var(--radius-md)] max-[480px]:gap-2 max-[480px]:p-3">
            <div className="text-2xl w-10 text-center">+</div>
            <div className="flex-1">
              <div className="text-sm text-text-secondary mb-1">Average Daily Activity</div>
              <div className="text-xl font-bold text-text-primary max-[480px]:text-base">
                {periodDays > 0 ? Math.round(summary.totalFatBurned / periodDays) : 0}g/day
              </div>
              <div className="text-xs text-text-muted mt-1">From your {summary.totalActivitiesWithHR} recorded activities</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-linear-to-br from-accent/15 to-accent/5 border border-accent/30 rounded-[var(--radius-md)] max-[480px]:gap-2 max-[480px]:p-3">
            <div className="text-2xl w-10 text-center">=</div>
            <div className="flex-1">
              <div className="text-sm text-text-secondary mb-1">Estimated Daily Total</div>
              <div className="text-xl font-bold text-accent max-[480px]:text-base">
                {summary.dailyRestingFatBurn + (periodDays > 0 ? Math.round(summary.totalFatBurned / periodDays) : 0)}g/day
              </div>
              <div className="text-xs text-text-muted mt-1">
                ≈ {((summary.dailyRestingFatBurn + (periodDays > 0 ? Math.round(summary.totalFatBurned / periodDays) : 0)) * 7 / 1000).toFixed(2)} kg/week
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity-Only Stats */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Activity Fat Burning Stats</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <div className={`${statCard} text-center`}>
            <div className={statValue}>{Math.round(summary.avgFatRatio * 100)}%</div>
            <div className="text-sm text-text-secondary font-medium">Avg Fat Burn Ratio</div>
            <div className="text-xs text-text-muted mt-1">of exercise calories from fat</div>
          </div>
          <div className={`${statCard} text-center bg-linear-to-br from-success/15 to-success/5 border-success/30`}>
            <div className={statValueAccent}>{secondsToHMS(summary.zone2Time)}</div>
            <div className="text-sm text-text-secondary font-medium">Time in Fat Burn Zone</div>
            <div className="text-xs text-text-muted mt-1">{summary.zone2Percentage}% of training time</div>
          </div>
          <div className={`${statCard} text-center`}>
            <div className={statValue}>{summary.totalCalories.toLocaleString()}</div>
            <div className="text-sm text-text-secondary font-medium">Activity Calories</div>
            <div className="text-xs text-text-muted mt-1">{summary.totalActivitiesWithHR} activities with HR</div>
          </div>
          <div className={`${statCard} text-center`}>
            <div className={statValue}>{summary.optimalFatBurnActivities}</div>
            <div className="text-sm text-text-secondary font-medium">Zone 2 Workouts</div>
            <div className="text-xs text-text-muted mt-1">Optimal fat burning sessions</div>
          </div>
        </div>
      </div>

      {/* FatMax Zone Indicator */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
          <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Your FatMax Zone</h3>
          <span className="py-1.5 px-4 rounded-full text-sm font-semibold text-white shadow-[0_2px_8px_rgba(20,184,166,0.3)]" style={{ backgroundColor: '#34d399' }}>
            Optimal Fat Burning
          </span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-8 p-6 bg-bg-secondary rounded-[var(--radius-md)] border border-success/20 max-md:grid-cols-1 max-md:gap-4">
          <div className="flex flex-col items-center justify-center py-4 px-8 bg-success/10 rounded-[var(--radius-md)] max-md:p-4 max-[480px]:p-3">
            <div className="text-sm text-text-secondary mb-2">Target Heart Rate</div>
            <div className="text-[1.75rem] font-bold text-[#34d399] max-[480px]:text-2xl">
              {fatMaxZone.min} - {fatMaxZone.max} bpm
            </div>
          </div>
          <div>
            <p className="text-text-secondary mb-4 leading-relaxed">
              At <strong className="text-accent">60-70% intensity</strong>, your body burns the highest
              percentage of calories from fat (~65%). Train in this zone for
              optimal fat oxidation.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="text-base">💡</span>
                You can hold a conversation at this intensity
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="text-base">⏱️</span>
                Aim for 45-90 minute sessions for best results
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="text-base">🔥</span>
                Fasted training may increase fat oxidation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HR Zones Time Distribution */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Time in Each HR Zone</h3>
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
        <div className="flex flex-wrap gap-4 mt-4 p-4 bg-bg-secondary rounded-[var(--radius-md)] max-md:flex-col">
          {hrZones.map((zone) => (
            <div key={zone.name} className="flex items-center gap-2 text-[0.8rem]">
              <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
              <span className="text-text-primary font-medium">{zone.name}</span>
              <span className="text-text-muted">{zone.min}-{zone.max} bpm</span>
              <span className="text-[#34d399] font-medium">{Math.round(zone.fatBurnRatio * 100)}% fat</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Fat Burn Trend - Stacked */}
      {summary.weeklyTotalFatBurn.length > 0 && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Weekly Fat Burn (Activity + Resting)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={summary.weeklyTotalFatBurn}>
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
                  if (name === 'Activity Fat') return [`${value}g`, 'From Activities']
                  if (name === 'Resting Fat') return [`${value}g`, 'From Resting']
                  if (name === 'Zone 2 Time') return [`${value} min`, 'Zone 2 Time']
                  return [value, name]
                }}
              />
              <Legend />
              <Bar
                yAxisId="fat"
                dataKey="restingFatBurn"
                stackId="fat"
                fill={chartTheme.colors.neutral[600]}
                name="Resting Fat"
              />
              <Bar
                yAxisId="fat"
                dataKey="activityFatBurn"
                stackId="fat"
                fill={chartTheme.colors.neutral[500]}
                name="Activity Fat"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="time"
                type="monotone"
                dataKey="zone2Time"
                stroke={chartTheme.colors.primary.main}
                strokeWidth={2}
                dot={{ r: 4, fill: chartTheme.colors.primary.main }}
                name="Zone 2 Time"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activities Fat Stats */}
      {recentFatActivities.length > 0 && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
          <h3 className="text-lg font-semibold mb-5 text-text-primary max-[480px]:text-base">Recent Activities - Fat Burning</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left p-3 bg-bg-tertiary text-text-secondary font-medium border-b border-border">Activity</th>
                  <th className="text-left p-3 bg-bg-tertiary text-text-secondary font-medium border-b border-border">Avg HR</th>
                  <th className="text-left p-3 bg-bg-tertiary text-text-secondary font-medium border-b border-border">Intensity</th>
                  <th className="text-left p-3 bg-bg-tertiary text-text-secondary font-medium border-b border-border">Calories</th>
                  <th className="text-left p-3 bg-bg-tertiary text-text-secondary font-medium border-b border-border">Fat Burned</th>
                  <th className="text-left p-3 bg-bg-tertiary text-text-secondary font-medium border-b border-border">Zone</th>
                </tr>
              </thead>
              <tbody>
                {recentFatActivities.map((stats) => (
                  <tr key={stats!.activityId} className={stats!.isOptimalFatBurn ? 'bg-success/5' : ''}>
                    <td className="p-3 border-b border-border-subtle text-text-primary max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{stats!.name}</td>
                    <td className="p-3 border-b border-border-subtle text-text-primary">{stats!.avgHR} bpm</td>
                    <td className="p-3 border-b border-border-subtle">
                      <span
                        className="inline-block py-1 px-2 rounded-[var(--radius-sm)] text-xs font-semibold text-white"
                        style={{
                          backgroundColor: stats!.isOptimalFatBurn
                            ? '#34d399'
                            : stats!.intensity > 80
                              ? '#14b8a6'
                              : '#71717a',
                        }}
                      >
                        {stats!.intensity}%
                      </span>
                    </td>
                    <td className="p-3 border-b border-border-subtle text-text-primary">{stats!.calories}</td>
                    <td className="p-3 border-b border-border-subtle text-accent font-semibold">{stats!.fatBurned}g</td>
                    <td className="p-3 border-b border-border-subtle">
                      <span className={`inline-block py-1 px-2 rounded-[var(--radius-sm)] text-xs ${stats!.isOptimalFatBurn ? 'bg-success/20 text-[#34d399]' : 'bg-bg-tertiary text-text-secondary'}`}>
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
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
        <div className="p-5 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
          <p className="mb-2">
            <strong className="text-accent">BMR (Basal Metabolic Rate)</strong> = Calories your body burns at rest,
            calculated using Mifflin-St Jeor formula based on your weight, age, and gender.
          </p>
          <p className="mb-2">
            <strong className="text-accent">Resting Fat Burn</strong> = ~77% of BMR calories come from fat while sleeping/resting.
            This is your baseline fat burning that happens 24/7.
          </p>
          <p>
            <strong className="text-accent">Activity Fat Burn</strong> = Fat burned during exercise, varies by intensity.
            Zone 2 (60-70% effort) maximizes fat as fuel source (~65% of calories from fat).
          </p>
        </div>
      </div>
    </div>
  )
}
