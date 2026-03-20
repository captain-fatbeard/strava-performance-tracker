import { useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { type StravaActivity, metersToKm, secondsToHMS } from '~/lib/strava'
import { useDashboard } from '~/lib/dashboard-context'
import { formatDateFull } from '~/lib/chart-theme'
import { calculateActivityScores, estimateFTP } from '~/lib/performance'

interface ActivityListProps {
  activities: StravaActivity[]
}

const activityTypeClasses: Record<string, string> = {
  ride: 'bg-info-muted text-[#60a5fa]',
  virtualride: 'bg-info-muted text-[#60a5fa]',
  run: 'bg-success-muted text-[#4ade80]',
}

const scoreLabelClasses: Record<string, string> = {
  Epic: 'bg-[#f97316]/15 text-[#f97316]',
  Hard: 'bg-[#ef4444]/15 text-[#ef4444]',
  Solid: 'bg-[#3b82f6]/15 text-[#3b82f6]',
  Moderate: 'bg-[#a78bfa]/15 text-[#a78bfa]',
  Easy: 'bg-bg-tertiary text-text-muted',
}

function getScoreLabel(score: number): string {
  if (score >= 100) return 'Epic'
  if (score >= 80) return 'Hard'
  if (score >= 50) return 'Solid'
  if (score >= 30) return 'Moderate'
  return 'Easy'
}

export function ActivityList({ activities }: ActivityListProps) {
  const { excludedActivityIds, toggleActivityExclusion } = useDashboard()
  const navigate = useNavigate()

  const scoreMap = useMemo(() => {
    const rides = activities.filter((a) => a.type === 'Ride' || a.type === 'VirtualRide')
    const ftp = estimateFTP(rides) || 0
    const scores = calculateActivityScores(activities, ftp)
    const map = new Map<number, number>()
    for (const s of scores) map.set(s.activityId, s.rideScore)
    return map
  }, [activities])

  if (activities.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted text-[0.9rem]">
        <p>No activities found for the selected filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-bg-secondary rounded-[var(--radius-lg)] border border-border-subtle max-md:text-[0.8rem]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider first:rounded-tl-[var(--radius-lg)] last:rounded-tr-[var(--radius-lg)] max-md:px-2 max-md:py-2.5">Date</th>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider max-md:px-2 max-md:py-2.5">Name</th>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider max-md:px-2 max-md:py-2.5">Type</th>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider max-md:px-2 max-md:py-2.5">Distance</th>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider max-md:px-2 max-md:py-2.5">Time</th>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider max-md:px-2 max-md:py-2.5">Elevation</th>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider max-md:px-2 max-md:py-2.5">Power</th>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider max-md:px-2 max-md:py-2.5">HR</th>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider max-md:px-2 max-md:py-2.5">Ride Score</th>
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider last:rounded-tr-[var(--radius-lg)] max-md:px-2 max-md:py-2.5">Performance</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => {
            const isExcluded = excludedActivityIds.includes(activity.id)
            return (
              <tr
                key={activity.id}
                className={`transition-colors duration-150 hover:[&_td]:bg-bg-tertiary last:[&_td]:border-b-0 cursor-pointer ${isExcluded ? '[&_td]:opacity-50' : ''}`}
                onClick={(e) => {
                  // Don't navigate when clicking the exclude button
                  if ((e.target as HTMLElement).closest('button')) return
                  navigate({ to: '/activities/$activityId', params: { activityId: String(activity.id) } })
                }}
              >
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">{formatDateFull(activity.start_date_local)}</td>
                <td className={`p-4 px-5 border-b border-border-subtle font-semibold max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap max-md:px-2 max-md:py-2.5 max-md:max-w-[140px] ${isExcluded ? 'line-through' : ''}`}>
                  <Link
                    to="/activities/$activityId"
                    params={{ activityId: String(activity.id) }}
                    className="text-text-primary no-underline hover:text-accent transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {activity.name}
                  </Link>
                </td>
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">
                  <span className={`inline-block py-1.5 px-3 rounded-[var(--radius-sm)] text-[0.7rem] font-semibold uppercase tracking-wide ${activityTypeClasses[activity.type.toLowerCase()] || 'bg-bg-tertiary text-text-secondary'}`}>
                    {activity.type === 'VirtualRide' ? 'Zwift' : activity.type}
                  </span>
                </td>
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">{metersToKm(activity.distance).toFixed(1)} km</td>
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">{secondsToHMS(activity.moving_time)}</td>
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">{activity.total_elevation_gain.toFixed(0)} m</td>
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">
                  {activity.average_watts ? `${Math.round(activity.average_watts)} W` : '-'}
                </td>
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">
                  {activity.average_heartrate
                    ? `${Math.round(activity.average_heartrate)} bpm`
                    : '-'}
                </td>
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">
                  {scoreMap.has(activity.id) ? (() => {
                    const score = scoreMap.get(activity.id)!
                    const label = getScoreLabel(score)
                    return (
                      <span className={`inline-block py-1.5 px-3 rounded-[var(--radius-sm)] text-[0.7rem] font-semibold ${scoreLabelClasses[label]}`}>
                        {score} · {label}
                      </span>
                    )
                  })() : '-'}
                </td>
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">
                  <button
                    className={`py-1.5 px-3 rounded-[var(--radius-sm)] text-[0.7rem] font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap ${
                      isExcluded
                        ? 'bg-danger-muted border border-red-500/30 text-danger hover:bg-red-500/25 hover:border-danger'
                        : 'bg-bg-tertiary border border-border text-text-secondary hover:bg-bg-elevated hover:border-text-muted hover:text-text-primary'
                    }`}
                    onClick={() => toggleActivityExclusion(activity.id)}
                    title={isExcluded ? 'Include in stats' : 'Exclude from stats'}
                  >
                    {isExcluded ? 'Excluded' : 'Include'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
