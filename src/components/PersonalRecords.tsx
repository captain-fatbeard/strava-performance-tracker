import { useMemo } from 'react'
import { format } from 'date-fns'
import { type StravaActivity } from '~/lib/strava'
import { calculatePersonalRecords } from '~/lib/performance'

interface PersonalRecordsProps {
  activities: StravaActivity[]
}

export function PersonalRecords({ activities }: PersonalRecordsProps) {
  const records = useMemo(() => calculatePersonalRecords(activities), [activities])

  if (records.length === 0) {
    return null
  }

  return (
    <div className="personal-records">
      <h3>Personal Records</h3>
      <div className="records-grid">
        {records.map((record, index) => (
          <div key={index} className="record-card">
            <div className="record-type">{record.type}</div>
            <div className="record-value">
              {record.type === 'Best Pace (5km+)' ? record.unit : record.value}
              {record.type !== 'Best Pace (5km+)' && (
                <span className="record-unit">{record.unit}</span>
              )}
            </div>
            <div className="record-activity">
              {record.activity.name}
            </div>
            <div className="record-date">
              {format(new Date(record.date), 'MMM d, yyyy')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
