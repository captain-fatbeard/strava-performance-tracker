import { useMemo } from 'react'
import {
  ComposedChart, Line, Bar, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, ZAxis,
} from 'recharts'
import { type StravaActivity } from '~/lib/strava'
import {
  calculateActivityScores, calculateScoringAverages, estimateFTP,
  type ActivityScore,
} from '~/lib/performance'
import { chartTheme, tooltipStyle, activityTooltipLabel, formatDateShort } from '~/lib/chart-theme'

interface ActivityScoringProps {
  activities: StravaActivity[]
}

// Color for ride score based on value
function scoreColor(score: number): string {
  if (score >= 80) return chartTheme.colors.coral.main
  if (score >= 50) return chartTheme.colors.amber.main
  if (score >= 30) return chartTheme.colors.primary.main
  return chartTheme.colors.neutral[400]
}

function scoreLabel(score: number): string {
  if (score >= 100) return 'Epic'
  if (score >= 80) return 'Hard'
  if (score >= 50) return 'Solid'
  if (score >= 30) return 'Moderate'
  return 'Easy'
}

export function ActivityScoring({ activities }: ActivityScoringProps) {
  const rides = activities.filter(
    (a) => a.type === 'Ride' || a.type === 'VirtualRide'
  )
  const ftp = estimateFTP(rides) || 0

  const scores = useMemo(() => calculateActivityScores(activities, ftp), [activities, ftp])
  const averages = useMemo(() => calculateScoringAverages(scores), [scores])

  if (scores.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-5">
        <h3 className="text-lg font-semibold mb-6">Activity Scoring</h3>
        <p className="text-text-muted text-center py-16 text-[0.9rem]">Need rides with power data to calculate scores</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-5">
        <h3 className="text-lg font-semibold mb-6">Activity Scoring</h3>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 max-md:grid-cols-2 max-[480px]:grid-cols-1">
          {/* Avg Ride Score */}
          <div className="bg-linear-to-br from-accent/10 to-bg-tertiary border border-accent rounded-[var(--radius-md)] p-5 flex flex-col gap-2">
            <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
              <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span className="text-[2rem] font-bold leading-tight text-text-primary">{averages.avgRideScore}</span>
            <span className="text-sm text-text-secondary font-medium">Avg Ride Score</span>
            <span className="text-xs text-text-muted">{scoreLabel(averages.avgRideScore)} intensity</span>
          </div>

          {/* Best Ride Score */}
          <div className="bg-bg-tertiary border border-border-subtle rounded-[var(--radius-md)] p-5 flex flex-col gap-2">
            <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
              <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 8 12 8s5-4 7.5-4a2.5 2.5 0 0 1 0 5H18" />
                <path d="M18 9v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
              </svg>
            </div>
            <span className="text-[2rem] font-bold leading-tight text-text-primary">{averages.bestRideScore}</span>
            <span className="text-sm text-text-secondary font-medium">Best Ride Score</span>
            <span className="text-xs text-text-muted">{scoreLabel(averages.bestRideScore)}</span>
          </div>

          {/* Avg Difficulty */}
          <div className="bg-bg-tertiary border border-border-subtle rounded-[var(--radius-md)] p-5 flex flex-col gap-2">
            <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
              <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            </div>
            <span className="text-[2rem] font-bold leading-tight text-text-primary">{averages.avgDifficulty}</span>
            <span className="text-sm text-text-secondary font-medium">Avg Difficulty</span>
            <span className="text-xs text-text-muted">Equivalent flat km</span>
          </div>

          {/* Power per Difficulty */}
          <div className="bg-bg-tertiary border border-border-subtle rounded-[var(--radius-md)] p-5 flex flex-col gap-2">
            <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
              <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-[2rem] font-bold leading-tight text-text-primary">{averages.avgPowerPerDifficulty}</span>
            <span className="text-sm text-text-secondary font-medium">W / Difficulty</span>
            <span className="text-xs text-text-muted">Higher = stronger on hard terrain</span>
          </div>
        </div>

        <div className="mt-4 p-5 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
          <p className="mb-2"><strong className="text-accent">Ride Score</strong>: Combines your power output, ride duration, and terrain difficulty into a single number. Accounts for the extra effort of climbing and sustaining power over long rides.</p>
          <p className="mb-2"><strong className="text-accent">Difficulty</strong>: Terrain difficulty as equivalent flat km. Each 100m of climbing adds ~8km equivalent flat effort.</p>
          <p><strong className="text-accent">W / Difficulty</strong>: How much power you sustain relative to terrain difficulty. Higher means you maintain strong output on challenging courses.</p>
        </div>
      </div>

      {/* Ride Score Over Time */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Ride Score Over Time</h3>
          <ScoreTrend scores={scores} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={scores}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis
              dataKey="dateKey"
              tickFormatter={(v) => formatDateShort(v.split('_')[0])}
              stroke={chartTheme.axis}
              tick={{ fill: chartTheme.axis, fontSize: 12 }}
            />
            <YAxis stroke={chartTheme.axis} tick={{ fill: chartTheme.axis, fontSize: 12 }} />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(label, payload) => activityTooltipLabel(String(label).split('_')[0], payload)}
              formatter={(value: number, name: string) => {
                if (name === 'rideScore') return [value, 'Ride Score']
                if (name === 'difficultyScore') return [value, 'Difficulty']
                return [value, name]
              }}
            />
            <ReferenceLine y={averages.avgRideScore} stroke={chartTheme.colors.neutral[500]} strokeDasharray="5 5" />
            <Bar dataKey="difficultyScore" fill={chartTheme.fills.primary.main} radius={[3, 3, 0, 0]} barSize={12} />
            <Line
              type="monotone"
              dataKey="rideScore"
              stroke={chartTheme.colors.amber.main}
              strokeWidth={2}
              dot={{ r: 3, fill: chartTheme.colors.amber.main }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 rounded" style={{ background: chartTheme.colors.amber.main }} />
            Ride Score
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-3 rounded-sm" style={{ background: chartTheme.fills.primary.main }} />
            Terrain Difficulty
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 border-t border-dashed" style={{ borderColor: chartTheme.colors.neutral[500] }} />
            Average
          </span>
        </div>
      </div>

      {/* Power vs Distance + Elevation */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-5">
        <h3 className="text-lg font-semibold mb-2">Power Sustainability</h3>
        <p className="text-sm text-text-muted mb-6">How well you maintain power as rides get longer and harder</p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={scores}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis
              dataKey="difficultyScore"
              label={{ value: 'Difficulty (eq. flat km)', position: 'insideBottom', offset: -5, fill: chartTheme.axis, fontSize: 12 }}
              stroke={chartTheme.axis}
              tick={{ fill: chartTheme.axis, fontSize: 12 }}
            />
            <YAxis
              label={{ value: 'Avg Power (W)', angle: -90, position: 'insideLeft', offset: 10, fill: chartTheme.axis, fontSize: 12 }}
              stroke={chartTheme.axis}
              tick={{ fill: chartTheme.axis, fontSize: 12 }}
            />
            <ZAxis dataKey="elevationGain" range={[30, 200]} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number, name: string) => {
                if (name === 'normalizedPower') return [`${value} W`, 'Normalized Power']
                return [value, name]
              }}
              labelFormatter={(_label, payload) => {
                const d = payload?.[0]?.payload as ActivityScore | undefined
                if (!d) return ''
                return `${d.name}\n${d.distanceKm} km · ${d.elevationGain}m ↑ · ${formatDuration(d.durationHours)}`
              }}
            />
            <Scatter dataKey="normalizedPower" fill={chartTheme.colors.primary.main}>
              {scores.map((entry) => (
                <Cell
                  key={entry.activityId}
                  fill={entry.avgGradient >= 2 ? chartTheme.colors.coral.main :
                        entry.avgGradient >= 1 ? chartTheme.colors.amber.main :
                        chartTheme.colors.primary.main}
                />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: chartTheme.colors.primary.main }} />
            Flat (&lt;1%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: chartTheme.colors.amber.main }} />
            Rolling (1-2%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: chartTheme.colors.coral.main }} />
            Hilly (2%+)
          </span>
          <span className="text-text-muted/60">Dot size = elevation gain</span>
        </div>
      </div>
    </div>
  )
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function ScoreTrend({ scores }: { scores: ActivityScore[] }) {
  if (scores.length < 4) return null

  const recent = scores.slice(-Math.ceil(scores.length / 2))
  const older = scores.slice(0, Math.floor(scores.length / 2))

  const recentAvg = recent.reduce((s, a) => s + a.rideScore, 0) / recent.length
  const olderAvg = older.reduce((s, a) => s + a.rideScore, 0) / older.length
  const change = ((recentAvg - olderAvg) / olderAvg) * 100

  if (Math.abs(change) < 5) {
    return <span className="text-xs py-1 px-2.5 rounded-full bg-bg-tertiary text-text-muted font-medium">Stable</span>
  }

  return change > 0 ? (
    <span className="text-xs py-1 px-2.5 rounded-full bg-success-muted text-success font-medium">
      Increasing +{Math.round(change)}%
    </span>
  ) : (
    <span className="text-xs py-1 px-2.5 rounded-full bg-danger-muted text-danger font-medium">
      Decreasing {Math.round(change)}%
    </span>
  )
}
