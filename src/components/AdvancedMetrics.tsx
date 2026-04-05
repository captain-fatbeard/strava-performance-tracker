import { useMemo } from 'react'
import { type StravaActivity } from '~/lib/strava'
import { calculateAdvancedMetrics, estimateFTP, getMotionistBenchmarks } from '~/lib/performance'
import { isRide } from '~/lib/activities'
import { badgeClasses } from '~/lib/styles'
import { ComparisonBar } from './ComparisonBar'
import type { Gender } from '~/lib/dashboard-context'

interface AdvancedMetricsProps {
  activities: StravaActivity[]
  weight: number
  age: number
  gender: Gender
}

export function AdvancedMetrics({ activities, weight, age, gender }: AdvancedMetricsProps) {
  const rides = activities.filter(isRide)
  const ftp = estimateFTP(rides) || 0

  const metrics = useMemo(() => {
    return calculateAdvancedMetrics(activities, ftp, weight)
  }, [activities, ftp, weight])

  const benchmarks = useMemo(() => {
    return getMotionistBenchmarks(age, gender)
  }, [age, gender])

  if (ftp === 0) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 mb-8 max-md:p-5">
        <h3 className="text-lg font-semibold mb-6">Advanced Metrics</h3>
        <p className="text-text-muted text-center py-16 text-[0.9rem]">Need power data to calculate advanced metrics</p>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 mb-8 max-md:p-5">
      <h3 className="text-lg font-semibold mb-6">Advanced Metrics</h3>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5 max-md:grid-cols-1">
        {/* VO2max */}
        <div className="bg-linear-to-br from-accent/10 to-bg-tertiary border border-accent rounded-[var(--radius-md)] p-5 flex flex-col gap-2 relative transition-all duration-200 hover:border-border">
          <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
            <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[2rem] font-bold leading-tight text-text-primary">{metrics.vo2max}</span>
            <span className="text-sm text-text-secondary mt-1 font-medium">Est. VO2max</span>
            <span className="text-xs text-text-muted">ml/kg/min</span>
          </div>
          <span className={`absolute top-4 right-4 text-[0.65rem] py-1 px-2.5 rounded-full font-bold uppercase tracking-wide ${badgeClasses[metrics.vo2maxCategory.toLowerCase().replace(' ', '-')] || ''}`}>
            {metrics.vo2maxCategory}
          </span>
          {metrics.vo2max > 0 && (
            <ComparisonBar
              value={metrics.vo2max}
              benchmark={benchmarks.vo2max}
              goodThreshold={benchmarks.vo2maxGood}
              unit="ml/kg/min"
              label={`Avg age ${age}`}
            />
          )}
        </div>

        {/* Intensity Factor */}
        <div className="bg-bg-tertiary border border-border-subtle rounded-[var(--radius-md)] p-5 flex flex-col gap-2 relative transition-all duration-200 hover:border-border">
          <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
            <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[2rem] font-bold leading-tight text-text-primary">{metrics.avgIF}</span>
            <span className="text-sm text-text-secondary mt-1 font-medium">Avg Intensity Factor</span>
            <span className="text-xs text-text-muted">NP / FTP</span>
          </div>
          <span className="text-xs text-text-muted mt-auto pt-3 border-t border-border-subtle">
            {metrics.avgIF < 0.75 ? 'Recovery/Endurance' :
             metrics.avgIF < 0.9 ? 'Tempo' :
             metrics.avgIF < 1.0 ? 'Threshold' : 'Above Threshold'}
          </span>
        </div>

        {/* Variability Index */}
        <div className="bg-bg-tertiary border border-border-subtle rounded-[var(--radius-md)] p-5 flex flex-col gap-2 relative transition-all duration-200 hover:border-border">
          <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
            <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 5 4-9" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[2rem] font-bold leading-tight text-text-primary">{metrics.avgVI}</span>
            <span className="text-sm text-text-secondary mt-1 font-medium">Avg Variability Index</span>
            <span className="text-xs text-text-muted">NP / Avg Power</span>
          </div>
          <span className="text-xs text-text-muted mt-auto pt-3 border-t border-border-subtle">
            {metrics.avgVI <= 1.05 ? 'Very Steady' :
             metrics.avgVI <= 1.1 ? 'Steady' : 'Variable'}
          </span>
        </div>

        {/* Efficiency Factor */}
        {metrics.avgEF > 0 && (
          <div className="bg-bg-tertiary border border-border-subtle rounded-[var(--radius-md)] p-5 flex flex-col gap-2 relative transition-all duration-200 hover:border-border">
            <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
              <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[2rem] font-bold leading-tight text-text-primary">{metrics.avgEF}</span>
              <span className="text-sm text-text-secondary mt-1 font-medium">Avg Efficiency Factor</span>
              <span className="text-xs text-text-muted">NP / Avg HR</span>
            </div>
            <span className="text-xs text-text-muted mt-auto pt-3 border-t border-border-subtle">Best: {metrics.bestEF}</span>
          </div>
        )}

        {/* Power:HR Ratio */}
        {metrics.avgPowerHR > 0 && (
          <div className="bg-bg-tertiary border border-border-subtle rounded-[var(--radius-md)] p-5 flex flex-col gap-2 relative transition-all duration-200 hover:border-border">
            <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
              <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[2rem] font-bold leading-tight text-text-primary">{metrics.avgPowerHR}</span>
              <span className="text-sm text-text-secondary mt-1 font-medium">Power:HR Ratio</span>
              <span className="text-xs text-text-muted">W per beat</span>
            </div>
            <span className="text-xs text-text-muted mt-auto pt-3 border-t border-border-subtle">Higher = more efficient</span>
          </div>
        )}

        {/* VAM */}
        {metrics.avgVAM > 0 && (
          <div className="bg-bg-tertiary border border-border-subtle rounded-[var(--radius-md)] p-5 flex flex-col gap-2 relative transition-all duration-200 hover:border-border">
            <div className="size-9 bg-bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center mb-2">
              <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[2rem] font-bold leading-tight text-text-primary">{metrics.avgVAM}</span>
              <span className="text-sm text-text-secondary mt-1 font-medium">Avg VAM</span>
              <span className="text-xs text-text-muted">m/hour</span>
            </div>
            <span className="text-xs text-text-muted mt-auto pt-3 border-t border-border-subtle">Best: {metrics.bestVAM} m/h</span>
          </div>
        )}
      </div>

      {/* Motionist Comparison Summary */}
      <div className="mt-6 p-5 bg-linear-to-br from-accent/5 to-bg-tertiary border border-border-subtle rounded-[var(--radius-md)]">
        <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <svg className="size-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Average Motionist (Age {age}, {gender})
        </h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.8rem] text-text-secondary max-md:grid-cols-1">
          <div className="flex justify-between">
            <span>VO2max</span>
            <span className="font-medium text-text-primary">{benchmarks.vo2max} ml/kg/min</span>
          </div>
          <div className="flex justify-between">
            <span>Max Heart Rate</span>
            <span className="font-medium text-text-primary">{benchmarks.maxHR} bpm</span>
          </div>
          <div className="flex justify-between">
            <span>Resting Heart Rate</span>
            <span className="font-medium text-text-primary">{benchmarks.restingHR} bpm</span>
          </div>
          <div className="flex justify-between">
            <span>W/kg (cycling)</span>
            <span className="font-medium text-text-primary">{benchmarks.wPerKg} W/kg</span>
          </div>
          <div className="flex justify-between">
            <span>Est. FTP</span>
            <span className="font-medium text-text-primary">{benchmarks.ftp} W</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-5 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed">
        <p className="mb-2"><strong className="text-accent">IF</strong> (Intensity Factor): How hard workouts are vs FTP. 0.75 = endurance, 1.0 = threshold.</p>
        <p className="mb-2"><strong className="text-accent">VI</strong> (Variability Index): Effort steadiness. 1.0 = perfectly even, higher = more surges.</p>
        <p className="mb-2"><strong className="text-accent">EF</strong> (Efficiency Factor): Aerobic efficiency. Track over time - higher is better!</p>
        <p><strong className="text-accent">VAM</strong>: Climbing speed. Pro cyclists average 1200-1800 m/h on climbs.</p>
      </div>
    </div>
  )
}
