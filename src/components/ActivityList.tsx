import { format } from 'date-fns'
import { type StravaActivity, metersToKm, secondsToHMS } from '~/lib/strava'
import { useDashboard } from '~/lib/dashboard-context'

interface ActivityListProps {
  activities: StravaActivity[]
}

const activityTypeClasses: Record<string, string> = {
  ride: 'bg-info-muted text-[#60a5fa]',
  virtualride: 'bg-info-muted text-[#60a5fa]',
  run: 'bg-success-muted text-[#4ade80]',
}

export function ActivityList({ activities }: ActivityListProps) {
  const { excludedActivityIds, toggleActivityExclusion } = useDashboard()

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
            <th className="text-left p-4 px-5 bg-bg-tertiary text-text-muted font-semibold uppercase text-[0.7rem] tracking-wider last:rounded-tr-[var(--radius-lg)] max-md:px-2 max-md:py-2.5">Stats</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => {
            const isExcluded = excludedActivityIds.includes(activity.id)
            return (
              <tr key={activity.id} className={`transition-colors duration-150 hover:[&_td]:bg-bg-tertiary last:[&_td]:border-b-0 ${isExcluded ? '[&_td]:opacity-50' : ''}`}>
                <td className="p-4 px-5 border-b border-border-subtle max-md:px-2 max-md:py-2.5">{format(new Date(activity.start_date_local), 'MMM d, yyyy')}</td>
                <td className={`p-4 px-5 border-b border-border-subtle font-semibold max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap text-text-primary max-md:px-2 max-md:py-2.5 max-md:max-w-[140px] ${isExcluded ? 'line-through' : ''}`}>{activity.name}</td>
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
                  <button
                    className={`py-1.5 px-3 rounded-[var(--radius-sm)] text-[0.7rem] font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap ${
                      isExcluded
                        ? 'bg-danger-muted border border-red-500/30 text-danger hover:bg-red-500/25 hover:border-danger'
                        : 'bg-bg-tertiary border border-border text-text-secondary hover:bg-bg-elevated hover:border-text-muted hover:text-text-primary'
                    }`}
                    onClick={() => toggleActivityExclusion(activity.id)}
                    title={isExcluded ? 'Include in stats' : 'Exclude from stats'}
                  >
                    {isExcluded ? 'Excluded' : 'Included'}
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
