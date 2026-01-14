import { secondsToHMS } from '~/lib/strava'

interface StatsCardsProps {
  stats: {
    totalActivities: number
    totalDistance: number
    totalElevation: number
    totalTime: number
    avgPower: number
    avgHR: number
    rides: number
    runs: number
    ftp: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="stats-cards">
      <div className="stat-card">
        <span className="stat-value">{stats.totalActivities}</span>
        <span className="stat-label">Activities</span>
        <span className="stat-detail">
          {stats.rides} rides, {stats.runs} runs
        </span>
      </div>

      <div className="stat-card">
        <span className="stat-value">{stats.totalDistance.toFixed(0)}</span>
        <span className="stat-label">Kilometers</span>
        <span className="stat-detail">Total distance</span>
      </div>

      <div className="stat-card">
        <span className="stat-value">{stats.totalElevation.toFixed(0)}</span>
        <span className="stat-label">Meters climbed</span>
        <span className="stat-detail">Total elevation</span>
      </div>

      <div className="stat-card">
        <span className="stat-value">{secondsToHMS(stats.totalTime)}</span>
        <span className="stat-label">Time</span>
        <span className="stat-detail">Total moving time</span>
      </div>

      {stats.ftp > 0 && (
        <div className="stat-card highlight">
          <span className="stat-value">{stats.ftp}</span>
          <span className="stat-label">Est. FTP</span>
          <span className="stat-detail">Functional Threshold Power</span>
        </div>
      )}

      {stats.avgPower > 0 && (
        <div className="stat-card">
          <span className="stat-value">{stats.avgPower}</span>
          <span className="stat-label">Avg Watts</span>
          <span className="stat-detail">Average power</span>
        </div>
      )}

      {stats.avgHR > 0 && (
        <div className="stat-card">
          <span className="stat-value">{stats.avgHR}</span>
          <span className="stat-label">Avg HR</span>
          <span className="stat-detail">Average heart rate</span>
        </div>
      )}
    </div>
  )
}
