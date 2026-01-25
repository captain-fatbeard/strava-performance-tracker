import { format } from 'date-fns'
import { type StravaActivity, metersToKm, secondsToHMS } from '~/lib/strava'
import { useDashboard } from '~/lib/dashboard-context'

interface ActivityListProps {
  activities: StravaActivity[]
}

export function ActivityList({ activities }: ActivityListProps) {
  const { excludedActivityIds, toggleActivityExclusion } = useDashboard()

  if (activities.length === 0) {
    return (
      <div className="empty-state">
        <p>No activities found for the selected filters.</p>
      </div>
    )
  }

  return (
    <div className="activity-list">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Type</th>
            <th>Distance</th>
            <th>Time</th>
            <th>Elevation</th>
            <th>Power</th>
            <th>HR</th>
            <th>Stats</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => {
            const isExcluded = excludedActivityIds.includes(activity.id)
            return (
              <tr key={activity.id} className={isExcluded ? 'excluded' : ''}>
                <td>{format(new Date(activity.start_date_local), 'MMM d, yyyy')}</td>
                <td className="activity-name">{activity.name}</td>
                <td>
                  <span className={`activity-type ${activity.type.toLowerCase()}`}>
                    {activity.type === 'VirtualRide' ? 'Zwift' : activity.type}
                  </span>
                </td>
                <td>{metersToKm(activity.distance).toFixed(1)} km</td>
                <td>{secondsToHMS(activity.moving_time)}</td>
                <td>{activity.total_elevation_gain.toFixed(0)} m</td>
                <td>
                  {activity.average_watts ? `${Math.round(activity.average_watts)} W` : '-'}
                </td>
                <td>
                  {activity.average_heartrate
                    ? `${Math.round(activity.average_heartrate)} bpm`
                    : '-'}
                </td>
                <td>
                  <button
                    className={`exclude-btn ${isExcluded ? 'excluded' : ''}`}
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
