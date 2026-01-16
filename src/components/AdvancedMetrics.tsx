import { useMemo } from 'react'
import { type StravaActivity } from '~/lib/strava'
import { calculateAdvancedMetrics, estimateFTP } from '~/lib/performance'

interface AdvancedMetricsProps {
  activities: StravaActivity[]
  weight: number
}

export function AdvancedMetrics({ activities, weight }: AdvancedMetricsProps) {
  const rides = activities.filter(
    (a) => a.type === 'Ride' || a.type === 'VirtualRide'
  )
  const ftp = estimateFTP(rides) || 0

  const metrics = useMemo(() => {
    return calculateAdvancedMetrics(activities, ftp, weight)
  }, [activities, ftp, weight])

  if (ftp === 0) {
    return (
      <div className="advanced-metrics">
        <h3>Advanced Metrics</h3>
        <p className="no-data">Need power data to calculate advanced metrics</p>
      </div>
    )
  }

  return (
    <div className="advanced-metrics">
      <h3>Advanced Metrics</h3>

      <div className="metrics-grid">
        {/* VO2max */}
        <div className="metric-card vo2max">
          <div className="metric-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-value">{metrics.vo2max}</span>
            <span className="metric-label">Est. VO2max</span>
            <span className="metric-unit">ml/kg/min</span>
          </div>
          <span className={`metric-badge ${metrics.vo2maxCategory.toLowerCase().replace(' ', '-')}`}>
            {metrics.vo2maxCategory}
          </span>
        </div>

        {/* Intensity Factor */}
        <div className="metric-card">
          <div className="metric-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-value">{metrics.avgIF}</span>
            <span className="metric-label">Avg Intensity Factor</span>
            <span className="metric-unit">NP / FTP</span>
          </div>
          <span className="metric-detail">
            {metrics.avgIF < 0.75 ? 'Recovery/Endurance' :
             metrics.avgIF < 0.9 ? 'Tempo' :
             metrics.avgIF < 1.0 ? 'Threshold' : 'Above Threshold'}
          </span>
        </div>

        {/* Variability Index */}
        <div className="metric-card">
          <div className="metric-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 5 4-9" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-value">{metrics.avgVI}</span>
            <span className="metric-label">Avg Variability Index</span>
            <span className="metric-unit">NP / Avg Power</span>
          </div>
          <span className="metric-detail">
            {metrics.avgVI <= 1.05 ? 'Very Steady' :
             metrics.avgVI <= 1.1 ? 'Steady' : 'Variable'}
          </span>
        </div>

        {/* Efficiency Factor */}
        {metrics.avgEF > 0 && (
          <div className="metric-card">
            <div className="metric-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-value">{metrics.avgEF}</span>
              <span className="metric-label">Avg Efficiency Factor</span>
              <span className="metric-unit">NP / Avg HR</span>
            </div>
            <span className="metric-detail">Best: {metrics.bestEF}</span>
          </div>
        )}

        {/* Power:HR Ratio */}
        {metrics.avgPowerHR > 0 && (
          <div className="metric-card">
            <div className="metric-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-value">{metrics.avgPowerHR}</span>
              <span className="metric-label">Power:HR Ratio</span>
              <span className="metric-unit">W per beat</span>
            </div>
            <span className="metric-detail">Higher = more efficient</span>
          </div>
        )}

        {/* VAM */}
        {metrics.avgVAM > 0 && (
          <div className="metric-card">
            <div className="metric-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-value">{metrics.avgVAM}</span>
              <span className="metric-label">Avg VAM</span>
              <span className="metric-unit">m/hour</span>
            </div>
            <span className="metric-detail">Best: {metrics.bestVAM} m/h</span>
          </div>
        )}
      </div>

      <div className="metrics-legend">
        <p><strong>IF</strong> (Intensity Factor): How hard workouts are vs FTP. 0.75 = endurance, 1.0 = threshold.</p>
        <p><strong>VI</strong> (Variability Index): Effort steadiness. 1.0 = perfectly even, higher = more surges.</p>
        <p><strong>EF</strong> (Efficiency Factor): Aerobic efficiency. Track over time - higher is better!</p>
        <p><strong>VAM</strong>: Climbing speed. Pro cyclists average 1200-1800 m/h on climbs.</p>
      </div>
    </div>
  )
}
