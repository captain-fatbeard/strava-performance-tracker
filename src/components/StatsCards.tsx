import { secondsToHMS } from '~/lib/strava'
import type { DashboardStats } from '~/lib/dashboard-context'

interface StatsCardsProps {
  stats: DashboardStats
}

const numberFormat = new Intl.NumberFormat('da-DK')
const formatInt = (n: number) => numberFormat.format(Math.round(n))

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="card-stagger grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5 mb-10 max-md:grid-cols-2 max-md:gap-3 max-[480px]:gap-2">
      <div className="card-accent-top bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-6 flex flex-col gap-2 transition-all duration-200 hover:border-border hover:-translate-y-0.5 hover:shadow-md max-md:p-4 max-[480px]:p-3.5">
        <span className="data-value text-[2rem] font-medium leading-tight bg-linear-to-br from-text-primary to-text-secondary bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl">{formatInt(stats.totalActivities)}</span>
        <span className="text-sm text-text-secondary font-medium">Activities</span>
        <span className="data-value text-xs text-text-muted">
          {formatInt(stats.rides)} rides, {formatInt(stats.runs)} runs
        </span>
      </div>

      <div className="card-accent-top bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-6 flex flex-col gap-2 transition-all duration-200 hover:border-border hover:-translate-y-0.5 hover:shadow-md max-md:p-4 max-[480px]:p-3.5">
        <span className="data-value text-[2rem] font-medium leading-tight bg-linear-to-br from-text-primary to-text-secondary bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl">{formatInt(stats.totalDistance)}</span>
        <span className="text-sm text-text-secondary font-medium">Kilometers</span>
        <span className="text-xs text-text-muted">Total distance</span>
      </div>

      <div className="card-accent-top bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-6 flex flex-col gap-2 transition-all duration-200 hover:border-border hover:-translate-y-0.5 hover:shadow-md max-md:p-4 max-[480px]:p-3.5">
        <span className="data-value text-[2rem] font-medium leading-tight bg-linear-to-br from-text-primary to-text-secondary bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl">{formatInt(stats.totalElevation)}</span>
        <span className="text-sm text-text-secondary font-medium">Meters climbed</span>
        <span className="text-xs text-text-muted">Total elevation</span>
      </div>

      <div className="card-accent-top bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-6 flex flex-col gap-2 transition-all duration-200 hover:border-border hover:-translate-y-0.5 hover:shadow-md max-md:p-4 max-[480px]:p-3.5">
        <span className="data-value text-[1.375rem] font-medium leading-tight tabular-nums whitespace-nowrap bg-linear-to-br from-text-primary to-text-secondary bg-clip-text text-transparent max-md:text-lg max-[480px]:text-base">{secondsToHMS(stats.totalTime)}</span>
        <span className="text-sm text-text-secondary font-medium">Time</span>
        <span className="text-xs text-text-muted">Total moving time</span>
      </div>

      {stats.ftp > 0 && (
        <div className="relative bg-linear-to-br from-accent/[0.1] to-bg-secondary border border-accent/40 rounded-[var(--radius-lg)] p-6 flex flex-col gap-2 transition-all duration-200 shadow-[0_0_30px_rgba(20,184,166,0.08)] hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(20,184,166,0.15)] max-md:p-4 max-[480px]:p-3.5 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-accent to-transparent" />
          <span className="data-value text-[2rem] font-medium leading-tight bg-linear-to-br from-accent-light to-accent bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl">{stats.ftp}</span>
          <span className="text-sm text-text-secondary font-medium">Est. FTP</span>
          <span className="text-xs text-text-muted">Functional Threshold Power</span>
        </div>
      )}

      {stats.wattsPerKilo > 0 && (
        <div className="relative bg-linear-to-br from-accent/[0.1] to-bg-secondary border border-accent/40 rounded-[var(--radius-lg)] p-6 flex flex-col gap-2 transition-all duration-200 shadow-[0_0_30px_rgba(20,184,166,0.08)] hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(20,184,166,0.15)] max-md:p-4 max-[480px]:p-3.5 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-accent to-transparent" />
          <span className="data-value text-[2rem] font-medium leading-tight bg-linear-to-br from-accent-light to-accent bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl">{stats.wattsPerKilo.toFixed(2)}</span>
          <span className="text-sm text-text-secondary font-medium">W/kg</span>
          <span className="text-xs text-text-muted">Watts per kilogram</span>
        </div>
      )}

      {stats.avgPower > 0 && (
        <div className="card-accent-top bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-6 flex flex-col gap-2 transition-all duration-200 hover:border-border hover:-translate-y-0.5 hover:shadow-md max-md:p-4 max-[480px]:p-3.5">
          <span className="data-value text-[2rem] font-medium leading-tight bg-linear-to-br from-text-primary to-text-secondary bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl">{stats.avgPower}</span>
          <span className="text-sm text-text-secondary font-medium">Avg Watts</span>
          <span className="text-xs text-text-muted">Average power</span>
        </div>
      )}

      {stats.avgHR > 0 && (
        <div className="card-accent-top bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-6 flex flex-col gap-2 transition-all duration-200 hover:border-border hover:-translate-y-0.5 hover:shadow-md max-md:p-4 max-[480px]:p-3.5">
          <span className="data-value text-[2rem] font-medium leading-tight bg-linear-to-br from-text-primary to-text-secondary bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl">{stats.avgHR}</span>
          <span className="text-sm text-text-secondary font-medium">Avg HR</span>
          <span className="text-xs text-text-muted">Average heart rate</span>
        </div>
      )}
    </div>
  )
}
