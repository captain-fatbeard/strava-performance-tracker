import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  isToday,
  subDays,
  differenceInDays,
} from 'date-fns'
import { da } from 'date-fns/locale'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useDashboard } from '~/lib/dashboard-context'
import { calculateFitnessOverTime, estimateFTPHistory } from '~/lib/performance'
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'
import { type StravaActivity } from '~/lib/strava'

export const Route = createFileRoute('/_dashboard/plan')({
  component: PlanPage,
})

type SessionType = 'z2' | 'rest' | 'opener' | 'test' | 'threshold' | 'vo2' | 'long'

interface PlanSession {
  type: SessionType
  label: string
  detail: string
  duration: string
  durationMinMin: number
  durationMaxMin: number
  /** acceptable power band as fraction of FTP — null if not power-constrained */
  powerFloor: number | null
  powerCeiling: number | null
  /** if true, finishing below powerFloor is acceptable (e.g. Z1 on a recovery day) */
  allowBelow: boolean
}

const RECOVERY_PLAN: PlanSession[] = [
  { type: 'z2', label: 'Recovery Z2', detail: 'Spin, no surges', duration: '60–75 min', durationMinMin: 45, durationMaxMin: 85, powerFloor: 0.5, powerCeiling: 0.8, allowBelow: true },
  { type: 'z2', label: 'Recovery Z2', detail: 'Spin, no surges', duration: '60–75 min', durationMinMin: 45, durationMaxMin: 85, powerFloor: 0.5, powerCeiling: 0.8, allowBelow: true },
  { type: 'z2', label: 'Recovery Z2', detail: 'Spin, no surges', duration: '60–75 min', durationMinMin: 45, durationMaxMin: 85, powerFloor: 0.5, powerCeiling: 0.8, allowBelow: true },
  { type: 'z2', label: 'Recovery Z2', detail: 'Spin, no surges', duration: '60–75 min', durationMinMin: 45, durationMaxMin: 85, powerFloor: 0.5, powerCeiling: 0.8, allowBelow: true },
  { type: 'rest', label: 'Rest', detail: 'Full off day', duration: '—', durationMinMin: 0, durationMaxMin: 30, powerFloor: null, powerCeiling: null, allowBelow: true },
  { type: 'opener', label: 'Opener', detail: 'Z2 with 3×1 min short openers', duration: '45 min', durationMinMin: 30, durationMaxMin: 60, powerFloor: 0.55, powerCeiling: 1.05, allowBelow: true },
  { type: 'test', label: 'Test ride', detail: 'Climb portal or structured effort if legs feel snappy', duration: '60–90 min', durationMinMin: 45, durationMaxMin: 120, powerFloor: null, powerCeiling: null, allowBelow: true },
]

const BUILD_PLAN: PlanSession[] = [
  { type: 'z2', label: 'Z2 Endurance', detail: 'Easy aerobic base', duration: '60–90 min', durationMinMin: 45, durationMaxMin: 100, powerFloor: 0.55, powerCeiling: 0.8, allowBelow: true },
  { type: 'threshold', label: 'Threshold', detail: '2×20 min at FTP', duration: '~60 min', durationMinMin: 40, durationMaxMin: 85, powerFloor: 0.7, powerCeiling: 1.05, allowBelow: false },
  { type: 'z2', label: 'Z2 Endurance', detail: 'Easy aerobic base', duration: '60–90 min', durationMinMin: 45, durationMaxMin: 100, powerFloor: 0.55, powerCeiling: 0.8, allowBelow: true },
  { type: 'rest', label: 'Rest or easy spin', detail: 'Full rest, or 30–45 min Z1', duration: '0–45 min', durationMinMin: 0, durationMaxMin: 50, powerFloor: null, powerCeiling: 0.6, allowBelow: true },
  { type: 'vo2', label: 'VO2max', detail: '5×4 min at 110–115% FTP', duration: '~60 min', durationMinMin: 40, durationMaxMin: 85, powerFloor: 0.65, powerCeiling: 1.1, allowBelow: false },
  { type: 'long', label: 'Long Z2', detail: 'Aerobic volume, flat or rolling', duration: '90–120 min', durationMinMin: 75, durationMaxMin: 150, powerFloor: 0.55, powerCeiling: 0.8, allowBelow: true },
  { type: 'rest', label: 'Rest', detail: 'Full off day', duration: '—', durationMinMin: 0, durationMaxMin: 30, powerFloor: null, powerCeiling: null, allowBelow: true },
]

type PlanPhase = 'recovery' | 'build'
type PlanPhaseSetting = 'auto' | PlanPhase

const PHASE_STORAGE_KEY = 'formlab:plan-phase'
const PLAN_START_STORAGE_KEY = 'formlab:plan-start-date'

/**
 * Recovery when form is still negative OR fatigue is still high.
 * Build only once both have recovered.
 *   - TSB < −3: form hasn't returned to neutral
 *   - ATL ≥ 65: fatigue still in "Heavy" territory
 */
function detectPhase(tsb: number | null, atl: number | null): PlanPhase {
  if (tsb === null) return 'build'
  if (tsb < -3) return 'recovery'
  if (atl !== null && atl >= 65) return 'recovery'
  return 'build'
}

const PHASE_META: Record<PlanPhase, { title: string; goalLabel: string; goalDetail: string }> = {
  recovery: {
    title: 'Recovery Consolidation',
    goalLabel: 'Goal',
    goalDetail: 'Form rebounds toward 0',
  },
  build: {
    title: 'Build Block',
    goalLabel: 'Goal',
    goalDetail: 'Fitness climbs while form stays neutral',
  },
}

const SESSION_COLORS: Record<SessionType, { bg: string; text: string; border: string; dot: string }> = {
  z2: { bg: 'bg-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/30', dot: 'bg-teal-400' },
  rest: { bg: 'bg-neutral-500/10', text: 'text-neutral-400', border: 'border-neutral-500/30', dot: 'bg-neutral-500' },
  opener: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  test: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  threshold: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  vo2: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  long: { bg: 'bg-sky-500/10', text: 'text-sky-300', border: 'border-sky-500/30', dot: 'bg-sky-400' },
}

type FitVerdict = 'on-target' | 'below' | 'above' | 'over-duration' | 'under-duration' | 'rest-skipped' | 'pending' | 'none' | 'future'

const FIT_META: Record<FitVerdict, { label: string; tone: string; positive: boolean }> = {
  'on-target': { label: 'On target', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', positive: true },
  'below': { label: 'Easier than planned', tone: 'text-sky-300 bg-sky-500/10 border-sky-500/30', positive: true },
  'above': { label: 'Harder than planned', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/30', positive: false },
  'over-duration': { label: 'Over duration', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/30', positive: false },
  'under-duration': { label: 'Short', tone: 'text-sky-300 bg-sky-500/10 border-sky-500/30', positive: true },
  'rest-skipped': { label: 'Rest skipped', tone: 'text-rose-300 bg-rose-500/10 border-rose-500/30', positive: false },
  'pending': { label: 'Pending', tone: 'text-accent bg-accent/10 border-accent/30', positive: true },
  'none': { label: 'Missed', tone: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30', positive: false },
  'future': { label: 'Upcoming', tone: 'text-text-muted bg-bg-tertiary border-border-subtle', positive: true },
}

interface DayActual {
  movingTimeMin: number
  avgPower: number | null
  np: number | null
  avgHr: number | null
  distance: number
  activities: StravaActivity[]
}

function aggregateDay(activities: StravaActivity[], date: Date): DayActual | null {
  const matches = activities.filter((a) => {
    const ad = new Date(a.start_date_local || a.start_date)
    return isSameDay(ad, date)
  })
  if (matches.length === 0) return null

  const totalMovingTime = matches.reduce((s, a) => s + a.moving_time, 0)
  const wattActs = matches.filter((a) => a.average_watts)
  const npActs = matches.filter((a) => a.weighted_average_watts)
  const hrActs = matches.filter((a) => a.average_heartrate)

  const avgPower = wattActs.length
    ? wattActs.reduce((s, a) => s + (a.average_watts! * a.moving_time), 0) /
      wattActs.reduce((s, a) => s + a.moving_time, 0)
    : null
  const np = npActs.length
    ? npActs.reduce((s, a) => s + (a.weighted_average_watts! * a.moving_time), 0) /
      npActs.reduce((s, a) => s + a.moving_time, 0)
    : null
  const avgHr = hrActs.length
    ? hrActs.reduce((s, a) => s + (a.average_heartrate! * a.moving_time), 0) /
      hrActs.reduce((s, a) => s + a.moving_time, 0)
    : null

  return {
    movingTimeMin: totalMovingTime / 60,
    avgPower,
    np,
    avgHr,
    distance: matches.reduce((s, a) => s + a.distance, 0),
    activities: matches,
  }
}

function computeFit(session: PlanSession, actual: DayActual | null, ftp: number): FitVerdict {
  // Rest day
  if (session.type === 'rest') {
    if (!actual) return 'on-target'
    // Short easy spin counts as compliant rest
    if (actual.movingTimeMin <= 30 && (actual.avgPower ?? 0) < ftp * 0.5) return 'on-target'
    return 'rest-skipped'
  }

  // Other sessions: need an activity
  if (!actual) return 'none'

  // Duration checks
  if (actual.movingTimeMin > session.durationMaxMin) return 'over-duration'
  if (actual.movingTimeMin < session.durationMinMin) return 'under-duration'

  // Power checks (when constrained)
  if (session.powerCeiling !== null && actual.avgPower !== null) {
    if (actual.avgPower > ftp * session.powerCeiling) return 'above'
  }
  if (session.powerFloor !== null && actual.avgPower !== null) {
    if (actual.avgPower < ftp * session.powerFloor) return 'below'
  }

  return 'on-target'
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h === 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** Power/HR target string for a planned session, tuned to the user's live FTP. */
function targetPowerLabel(session: PlanSession, ftp: number, z2HrCeiling: number): string | null {
  switch (session.type) {
    case 'z2':
    case 'long':
      return `${Math.round(ftp * 0.64)}–${Math.round(ftp * 0.75)}W · HR <${z2HrCeiling}`
    case 'threshold':
      return `intervals at ${Math.round(ftp * 0.95)}–${ftp}W`
    case 'vo2':
      return `intervals at ${Math.round(ftp * 1.1)}–${Math.round(ftp * 1.15)}W`
    case 'opener':
      return `short surges at ${Math.round(ftp * 0.95)}W near end`
    case 'rest':
    case 'test':
    default:
      return null
  }
}

interface PlanDay {
  session: PlanSession
  date: Date
  actual: DayActual | null
  verdict: FitVerdict
  isToday: boolean
  isPastOrToday: boolean
}

interface WeekSummary {
  weekStart: Date
  weekEnd: Date
  phase: PlanPhase
  days: PlanDay[]
  adherencePct: number
  sessionsLogged: number
  scoredCount: number
  startSnap: { ctl: number; atl: number; tsb: number } | null
  endSnap: { ctl: number; atl: number; tsb: number } | null
  totalTimeMin: number
  totalActivities: number
}

function summarizeWeek(
  weekStart: Date,
  today: Date,
  activities: StravaActivity[],
  fitnessSeries: Array<{ date: string; ctl: number; atl: number; tsb: number }>,
  ftp: number,
  phase: PlanPhase,
): WeekSummary {
  const template = phase === 'recovery' ? RECOVERY_PLAN : BUILD_PLAN

  const days: PlanDay[] = template.map((session, i) => {
    const date = addDays(weekStart, i)
    const isPastOrToday = date <= today
    const thisDayIsToday = isToday(date)
    const actual = isPastOrToday ? aggregateDay(activities, date) : null
    let verdict: FitVerdict
    if (!isPastOrToday) verdict = 'future'
    else if (thisDayIsToday && !actual && session.type !== 'rest') verdict = 'pending'
    else verdict = computeFit(session, actual, ftp)
    return { session, date, actual, verdict, isToday: thisDayIsToday, isPastOrToday }
  })

  const scored = days.filter((d) => d.isPastOrToday && d.verdict !== 'pending')
  const onPlan = scored.filter((d) => {
    if (d.verdict === 'on-target' || d.verdict === 'under-duration') return true
    if (d.verdict === 'below') return d.session.allowBelow
    return false
  }).length
  const adherencePct = scored.length > 0 ? Math.round((onPlan / scored.length) * 100) : 0
  const sessionsLogged = scored.filter((d) => d.actual !== null || d.session.type === 'rest').length

  const weekEnd = addDays(weekStart, 6)
  const startKey = format(subDays(weekStart, 1), 'yyyy-MM-dd')
  const endDate = weekEnd > today ? today : weekEnd
  const endKey = format(endDate, 'yyyy-MM-dd')
  const startSnap = fitnessSeries.find((p) => p.date === startKey) ?? null
  const endSnap =
    fitnessSeries.find((p) => p.date === endKey) ??
    (fitnessSeries.length > 0 ? fitnessSeries[fitnessSeries.length - 1] : null)

  const weekActivities = activities.filter((a) => {
    const ad = new Date(a.start_date_local || a.start_date)
    return ad >= weekStart && ad < addDays(weekStart, 7)
  })
  const totalTimeMin = weekActivities.reduce((s, a) => s + a.moving_time, 0) / 60

  return {
    weekStart,
    weekEnd,
    phase,
    days,
    adherencePct,
    sessionsLogged,
    scoredCount: scored.length,
    startSnap,
    endSnap,
    totalTimeMin,
    totalActivities: weekActivities.length,
  }
}

function PlanPage() {
  const { activities, stats, maxHR, restingHR } = useDashboard()

  const ftp = stats.ftp || 236

  // Derived targets (from user's live FTP and HR)
  const z2HrCeiling = Math.round(restingHR + 0.7 * (maxHR - restingHR))
  const z2HrFloor = Math.round(restingHR + 0.6 * (maxHR - restingHR))
  const z2PowerLow = Math.round(ftp * 0.64)
  const z2PowerHigh = Math.round(ftp * 0.75)
  const thresholdLow = Math.round(ftp * 0.95)
  const thresholdHigh = Math.round(ftp * 1.0)
  const vo2Low = Math.round(ftp * 1.1)
  const vo2High = Math.round(ftp * 1.15)
  const atlTarget = 55

  // Full fitness history (for chart + current/baseline)
  const fitnessSeries = useMemo(() => {
    const history = estimateFTPHistory(activities)
    if (history.length === 0) return []
    return calculateFitnessOverTime(activities, history)
  }, [activities])

  // Plan week — Monday of this week through Sunday
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const dayIdx = differenceInDays(today, weekStart) // 0..6
  const elapsedDays = Math.min(dayIdx + 1, 7) // day-of-plan including today

  // Phase setting (persisted to localStorage, SSR-safe default = auto)
  const [phaseSetting, setPhaseSetting] = useState<PlanPhaseSetting>('auto')
  useEffect(() => {
    const stored = window.localStorage.getItem(PHASE_STORAGE_KEY)
    if (stored === 'auto' || stored === 'recovery' || stored === 'build') {
      setPhaseSetting(stored)
    }
  }, [])
  const updatePhaseSetting = (next: PlanPhaseSetting) => {
    setPhaseSetting(next)
    try {
      window.localStorage.setItem(PHASE_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  // Plan start date — defaults to Monday of current week on first load.
  // Weeks before this are shown as "Pre-plan" in history (no phase/adherence).
  const [planStartDate, setPlanStartDate] = useState<Date | null>(null)
  useEffect(() => {
    const stored = window.localStorage.getItem(PLAN_START_STORAGE_KEY)
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
      setPlanStartDate(new Date(stored))
    } else {
      const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
      const key = format(monday, 'yyyy-MM-dd')
      window.localStorage.setItem(PLAN_START_STORAGE_KEY, key)
      setPlanStartDate(monday)
    }
  }, [])

  // Resolve active phase (from saved setting + TSB/ATL auto-detection)
  const latestTsb = fitnessSeries.length > 0 ? fitnessSeries[fitnessSeries.length - 1].tsb : null
  const latestAtl = fitnessSeries.length > 0 ? fitnessSeries[fitnessSeries.length - 1].atl : null
  const autoPhase: PlanPhase = detectPhase(latestTsb, latestAtl)
  const activePhase: PlanPhase = phaseSetting === 'auto' ? autoPhase : phaseSetting

  // Current week (uses user-selected phase)
  const currentWeek = useMemo(
    () => summarizeWeek(weekStart, today, activities, fitnessSeries, ftp, activePhase),
    [weekStart, today, activities, fitnessSeries, ftp, activePhase],
  )
  const planDays = currentWeek.days
  const baseline = currentWeek.startSnap
  const fitnessNow = currentWeek.endSnap

  // Past weeks (phase auto-detected from TSB/ATL at the start of each week)
  const pastWeeks = useMemo(() => {
    if (fitnessSeries.length === 0) return []
    const out: WeekSummary[] = []
    for (let i = 1; i <= 12; i++) {
      const ws = subDays(weekStart, i * 7)
      const key = format(subDays(ws, 1), 'yyyy-MM-dd')
      const snap = fitnessSeries.find((p) => p.date === key)
      const phase: PlanPhase = detectPhase(snap?.tsb ?? null, snap?.atl ?? null)
      const summary = summarizeWeek(ws, today, activities, fitnessSeries, ftp, phase)
      if (summary.totalActivities > 0) out.push(summary)
    }
    return out
  }, [weekStart, today, activities, fitnessSeries, ftp])

  // Trajectory: 14 days ending today
  const trajectoryData = useMemo(() => {
    if (fitnessSeries.length === 0) return []
    const cutoff = format(subDays(today, 13), 'yyyy-MM-dd')
    return fitnessSeries
      .filter((p) => p.date >= cutoff)
      .map((p) => ({
        date: p.date,
        label: format(new Date(p.date), 'd. MMM', { locale: da }),
        ctl: p.ctl,
        atl: p.atl,
        tsb: p.tsb,
        isWeek: p.date >= format(weekStart, 'yyyy-MM-dd'),
      }))
  }, [fitnessSeries, today, weekStart])

  // Current week adherence (from summary helper)
  const { adherencePct, sessionsLogged, scoredCount } = currentWeek
  const onPlanCount = Math.round((adherencePct / 100) * scoredCount)

  const atlDelta = baseline && fitnessNow ? fitnessNow.atl - baseline.atl : null
  const tsbDelta = baseline && fitnessNow ? fitnessNow.tsb - baseline.tsb : null
  const atlProgressToGoal = baseline && fitnessNow
    ? Math.max(0, Math.min(100, Math.round(
        ((baseline.atl - fitnessNow.atl) / Math.max(1, baseline.atl - atlTarget)) * 100,
      )))
    : 0

  return (
    <div className="flex flex-col gap-8">
      {/* Intro */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
        <h2 className="text-2xl font-semibold text-text-primary mb-2 max-[480px]:text-xl">
          Training Plan
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed max-w-2xl">
          Recovery-first week to bleed off accumulated fatigue, then a repeatable weekly structure
          that adds real threshold and VO2max work without blowing up CTL.
        </p>
      </div>

      {/* Progress summary */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
        <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">
            Plan Progress
          </h3>
          <span className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold data-value">
            Week of {format(weekStart, 'd. MMM', { locale: da })} – {format(weekEnd, 'd. MMM', { locale: da })}
          </span>
        </div>

        {/* Week progress bar */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-text-secondary">
              Day <span className="text-text-primary font-semibold data-value">{elapsedDays}</span> of{' '}
              <span className="text-text-primary font-semibold data-value">7</span>
            </span>
            <span className="text-xs text-text-muted data-value">
              {Math.round((elapsedDays / 7) * 100)}% through the week
            </span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden relative">
            <div
              className="h-full bg-linear-to-r from-accent to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${(elapsedDays / 7) * 100}%` }}
            />
            {/* Day markers */}
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="absolute top-0 h-full w-px bg-bg-secondary/60"
                style={{ left: `${(n / 7) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2 max-[480px]:grid-cols-1">
          <StatTile
            big={scoredCount === 0 ? '—' : `${sessionsLogged}/${scoredCount}`}
            label="Sessions logged"
            hint={
              scoredCount === 0
                ? 'Week just started'
                : `${scoredCount - sessionsLogged} missed · today pending`
            }
            accentPositive={scoredCount > 0 && sessionsLogged === scoredCount}
          />
          <StatTile
            big={scoredCount === 0 ? '—' : `${adherencePct}%`}
            label="On-plan adherence"
            hint={
              scoredCount === 0
                ? 'No completed days yet'
                : `${onPlanCount} of ${scoredCount} within target`
            }
            accentPositive={adherencePct >= 75}
          />
          <StatTile
            big={
              baseline && fitnessNow
                ? `${baseline.atl} → ${fitnessNow.atl}`
                : '—'
            }
            label="ATL this week"
            hint={
              atlDelta !== null
                ? `${atlDelta <= 0 ? '↓' : '↑'} ${Math.abs(atlDelta)} toward target ${atlTarget}`
                : 'No baseline'
            }
            accentPositive={atlDelta !== null && atlDelta < 0}
          />
          <StatTile
            big={
              baseline && fitnessNow
                ? `${baseline.tsb} → ${fitnessNow.tsb}`
                : '—'
            }
            label="Form (TSB)"
            hint={
              tsbDelta !== null
                ? `${tsbDelta >= 0 ? '↑' : '↓'} ${Math.abs(tsbDelta)} toward 0`
                : 'No baseline'
            }
            accentPositive={tsbDelta !== null && tsbDelta > 0}
          />
        </div>

        {/* ATL → goal progress bar */}
        {baseline && fitnessNow && baseline.atl > atlTarget && (
          <div className="mt-6 pt-6 border-t border-border-subtle">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                Recovery goal
              </span>
              <span className="text-xs text-text-muted data-value">
                {atlProgressToGoal}% of the way from ATL {baseline.atl} → {atlTarget}
              </span>
            </div>
            <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${atlProgressToGoal}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recovery trajectory chart */}
      {trajectoryData.length >= 3 && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
          <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">
              Recovery Trajectory
            </h3>
            <span className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">
              14 days · fatigue bleeding off
            </span>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={trajectoryData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="atlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartTheme.colors.amber.main} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={chartTheme.colors.amber.main} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tsbFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartTheme.colors.secondary.main} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartTheme.colors.secondary.main} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.grid }}
                />
                <YAxis
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.grid }}
                  width={32}
                />
                <Tooltip {...tooltipStyle} />
                <ReferenceLine
                  y={atlTarget}
                  stroke={chartTheme.colors.semantic.positive}
                  strokeDasharray="4 4"
                  label={{ value: 'ATL goal', fill: chartTheme.colors.semantic.positive, fontSize: 10, position: 'right' }}
                />
                <ReferenceLine
                  y={0}
                  stroke={chartTheme.colors.neutral[500]}
                  strokeDasharray="2 4"
                />
                <Area
                  type="monotone"
                  dataKey="atl"
                  name="Fatigue (ATL)"
                  stroke={chartTheme.colors.amber.main}
                  strokeWidth={2}
                  fill="url(#atlFill)"
                />
                <Area
                  type="monotone"
                  dataKey="ctl"
                  name="Fitness (CTL)"
                  stroke={chartTheme.colors.primary.main}
                  strokeWidth={2}
                  fill="none"
                />
                <Area
                  type="monotone"
                  dataKey="tsb"
                  name="Form (TSB)"
                  stroke={chartTheme.colors.secondary.main}
                  strokeWidth={2}
                  fill="url(#tsbFill)"
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }}
                  iconType="line"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[0.7rem] text-text-muted leading-relaxed mt-4">
            Fatigue (ATL) coming down while fitness (CTL) holds is the signature of a successful recovery block.
            Form (TSB) climbing toward 0 means you'll be ready to push again.
          </p>
        </div>
      )}

      {/* This Week — enhanced with actuals */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">
            This Week — {PHASE_META[activePhase].title}
          </h3>
          <span className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">
            Planned vs actual
          </span>
        </div>

        {/* Phase toggle */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="inline-flex items-center bg-bg-tertiary border border-border-subtle rounded-[var(--radius-sm)] p-0.5">
            {(['auto', 'recovery', 'build'] as const).map((opt) => {
              const active = phaseSetting === opt
              const label = opt === 'auto' ? 'Auto' : opt === 'recovery' ? 'Recovery' : 'Build'
              return (
                <button
                  key={opt}
                  onClick={() => updatePhaseSetting(opt)}
                  className={`text-xs font-medium py-1.5 px-3 rounded-[var(--radius-xs,4px)] transition-all duration-150 cursor-pointer ${
                    active
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'text-text-muted border border-transparent hover:text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="text-[0.7rem] text-text-muted leading-relaxed flex-1 min-w-0">
            {phaseSetting === 'auto' ? (
              <>
                Auto-selected <span className="text-text-secondary font-medium">{activePhase === 'recovery' ? 'Recovery' : 'Build'}</span>
                {latestTsb !== null && (
                  <> · TSB <span className="data-value text-text-secondary">{latestTsb >= 0 ? '+' : ''}{latestTsb}</span></>
                )}
                {latestAtl !== null && (
                  <> · ATL <span className="data-value text-text-secondary">{latestAtl}</span></>
                )}
                <span className="text-text-muted/70"> · recovery if TSB &lt; −3 or ATL ≥ 65</span>
              </>
            ) : (
              <>
                Manual override active.{' '}
                {activePhase !== autoPhase && (
                  <>Auto would suggest <span className="text-text-secondary font-medium">{autoPhase === 'recovery' ? 'Recovery' : 'Build'}</span>. </>
                )}
                <button
                  onClick={() => updatePhaseSetting('auto')}
                  className="text-accent hover:text-accent-light underline underline-offset-2 cursor-pointer"
                >
                  Reset to auto
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3 max-lg:grid-cols-4 max-md:grid-cols-2 max-[480px]:grid-cols-1">
          {planDays.map(({ session, date, actual, verdict, isToday: thisDayIsToday, isPastOrToday }) => {
            const colors = SESSION_COLORS[session.type]
            const fit = FIT_META[verdict]
            return (
              <div
                key={date.toISOString()}
                className={`border ${colors.border} ${colors.bg} rounded-[var(--radius-md)] p-4 flex flex-col gap-2 transition-all duration-150 relative ${
                  thisDayIsToday ? 'ring-2 ring-accent/60 ring-offset-2 ring-offset-bg-secondary' : ''
                } ${!isPastOrToday ? 'opacity-75' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold">
                    {format(date, 'EEE', { locale: da })}
                    {thisDayIsToday && (
                      <span className="ml-1.5 text-accent">· Today</span>
                    )}
                  </span>
                  <span className="text-[0.65rem] text-text-muted data-value">
                    {format(date, 'd. MMM', { locale: da })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-semibold ${colors.text}`}>{session.label}</span>
                </div>

                {/* ACTUAL — shown when an activity exists */}
                {actual && (
                  <div className="mt-1 pt-2 border-t border-border-subtle flex flex-col gap-1">
                    <div className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold">
                      Actual
                    </div>
                    <div className="text-xs text-text-primary data-value">
                      {formatDuration(actual.movingTimeMin)}
                      {actual.avgPower !== null && (
                        <>
                          <span className="text-text-muted mx-1">·</span>
                          {Math.round(actual.avgPower)}W
                        </>
                      )}
                      {actual.avgHr !== null && (
                        <>
                          <span className="text-text-muted mx-1">·</span>
                          {Math.round(actual.avgHr)} bpm
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* REST kept — past rest day with no activity */}
                {!actual && isPastOrToday && session.type === 'rest' && (
                  <div className="mt-1 pt-2 border-t border-border-subtle">
                    <div className="text-xs text-emerald-300/80 italic">Rested</div>
                  </div>
                )}

                {/* TARGET — future days, today-pending, past-missed non-rest */}
                {!actual && !(isPastOrToday && session.type === 'rest') && (
                  <div className="mt-1 pt-2 border-t border-border-subtle flex flex-col gap-1">
                    <div className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold">
                      Target
                    </div>
                    <div className="text-xs text-text-primary data-value">
                      {session.duration}
                    </div>
                    {targetPowerLabel(session, ftp, z2HrCeiling) && (
                      <div className="text-[0.7rem] text-text-muted data-value">
                        {targetPowerLabel(session, ftp, z2HrCeiling)}
                      </div>
                    )}
                    <div className="text-[0.7rem] text-text-muted leading-relaxed">
                      {session.detail}
                    </div>
                    {thisDayIsToday && !actual && session.type !== 'rest' && (
                      <div className="text-[0.7rem] text-accent italic">
                        Awaiting today's ride
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="text-[0.7rem] text-text-muted data-value">{session.duration}</span>
                  <span
                    className={`text-[0.6rem] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${fit.tone}`}
                  >
                    {fit.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-border-subtle grid grid-cols-3 gap-4 max-md:grid-cols-1">
          <div>
            <div className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold mb-1">
              Power target
            </div>
            <div className="text-sm text-text-primary data-value">
              {z2PowerLow}–{z2PowerHigh}W
            </div>
            <div className="text-[0.7rem] text-text-muted mt-0.5">Endurance zone (64–75% FTP)</div>
          </div>
          <div>
            <div className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold mb-1">
              HR ceiling
            </div>
            <div className="text-sm text-text-primary data-value">{z2HrCeiling} bpm</div>
            <div className="text-[0.7rem] text-text-muted mt-0.5">
              Karvonen 70% · stay in Fat Burn zone
            </div>
          </div>
          <div>
            <div className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold mb-1">
              {PHASE_META[activePhase].goalLabel}
            </div>
            <div className="text-sm text-text-primary">
              {activePhase === 'recovery'
                ? <>ATL {baseline?.atl ?? '—'} → ~{atlTarget}</>
                : <>CTL climbing · TSB −10 to +5</>}
            </div>
            <div className="text-[0.7rem] text-text-muted mt-0.5">
              {PHASE_META[activePhase].goalDetail}
            </div>
          </div>
        </div>
      </div>

      {/* Plan History */}
      {pastWeeks.length > 0 && (
        <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
          <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">
              Plan History
            </h3>
            <span className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">
              Last {pastWeeks.length} week{pastWeeks.length === 1 ? '' : 's'} · retrospective
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {pastWeeks.map((w) => {
              const isPrePlan = planStartDate !== null && w.weekStart < planStartDate
              return (
                <WeekHistoryRow
                  key={w.weekStart.toISOString()}
                  summary={w}
                  isPrePlan={isPrePlan}
                />
              )
            })}
          </div>

          <p className="text-[0.7rem] text-text-muted leading-relaxed mt-4">
            {planStartDate && (
              <>
                Plan started <span className="data-value text-text-secondary">{format(planStartDate, 'd. MMM yyyy', { locale: da })}</span>.{' '}
              </>
            )}
            Weeks before that show raw training load (no adherence scoring). Plan weeks show phase
            and adherence against that week's template.
          </p>
        </div>
      )}

      {/* Weekly template (unchanged) */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">
            Ongoing Weekly Template
          </h3>
          <span className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">
            After recovery week · 5–7 sessions
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { type: 'long' as const, label: 'Long Z2', detail: 'Aerobic base volume · 1× per week', targets: `${z2PowerLow}–${z2PowerHigh}W · HR <${z2HrCeiling} · 90–120 min` },
            { type: 'z2' as const, label: 'Z2 Endurance × 2', detail: 'Easy aerobic · 2× per week', targets: `${z2PowerLow}–${z2PowerHigh}W · HR <${z2HrCeiling} · 60–90 min` },
            { type: 'threshold' as const, label: 'Threshold', detail: '2×20 min at FTP · 1× per week', targets: `${thresholdLow}–${thresholdHigh}W · ~60 min total` },
            { type: 'vo2' as const, label: 'VO2max', detail: '5×4 min hard · 1× per week', targets: `${vo2Low}–${vo2High}W · climb portal works well` },
            { type: 'rest' as const, label: 'Rest or easy spin', detail: 'Recovery · 1–2× per week', targets: '30–45 min very easy, or off' },
          ].map((session, i) => {
            const colors = SESSION_COLORS[session.type]
            return (
              <div
                key={i}
                className={`flex items-center gap-4 border ${colors.border} ${colors.bg} rounded-[var(--radius-md)] p-4 max-md:flex-col max-md:items-start max-md:gap-2`}
              >
                <div className="flex items-center gap-3 min-w-44 shrink-0">
                  <span className={`size-2.5 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-semibold ${colors.text}`}>{session.label}</span>
                </div>
                <div className="text-sm text-text-secondary flex-1 max-md:text-xs">{session.detail}</div>
                <div className="text-xs text-text-muted data-value max-md:text-[0.7rem]">
                  {session.targets}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Zone reference */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
        <h3 className="text-lg font-semibold text-text-primary mb-5 max-[480px]:text-base">
          Training Targets
        </h3>

        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
          <div className="border border-border-subtle bg-bg-tertiary/50 rounded-[var(--radius-md)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="size-2 rounded-full bg-teal-400" />
              <span className="text-sm font-semibold text-teal-300">Z2 Endurance</span>
            </div>
            <div className="text-2xl font-semibold text-text-primary data-value mb-1">
              {z2PowerLow}–{z2PowerHigh}
              <span className="text-sm text-text-muted font-normal ml-1">W</span>
            </div>
            <div className="text-xs text-text-muted">HR {z2HrFloor}–{z2HrCeiling} bpm</div>
            <div className="text-[0.7rem] text-text-muted mt-2 leading-relaxed">
              The bread and butter. Builds aerobic base without fatigue cost. Should feel easy.
            </div>
          </div>

          <div className="border border-border-subtle bg-bg-tertiary/50 rounded-[var(--radius-md)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="size-2 rounded-full bg-orange-400" />
              <span className="text-sm font-semibold text-orange-300">Threshold</span>
            </div>
            <div className="text-2xl font-semibold text-text-primary data-value mb-1">
              {thresholdLow}–{thresholdHigh}
              <span className="text-sm text-text-muted font-normal ml-1">W</span>
            </div>
            <div className="text-xs text-text-muted">95–100% FTP</div>
            <div className="text-[0.7rem] text-text-muted mt-2 leading-relaxed">
              Sustained hard. Intervals 10–20 min. This is the lever that raises FTP.
            </div>
          </div>

          <div className="border border-border-subtle bg-bg-tertiary/50 rounded-[var(--radius-md)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="size-2 rounded-full bg-rose-400" />
              <span className="text-sm font-semibold text-rose-300">VO2max</span>
            </div>
            <div className="text-2xl font-semibold text-text-primary data-value mb-1">
              {vo2Low}–{vo2High}
              <span className="text-sm text-text-muted font-normal ml-1">W</span>
            </div>
            <div className="text-xs text-text-muted">110–115% FTP</div>
            <div className="text-[0.7rem] text-text-muted mt-2 leading-relaxed">
              Short maximal. Intervals 3–6 min. Raises the ceiling — where your current curve is weakest.
            </div>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
        <h3 className="text-lg font-semibold text-text-primary mb-5 max-[480px]:text-base">
          Non-negotiables
        </h3>

        <ul className="flex flex-col gap-3">
          <Rule
            n="01"
            title="Trust the TSB number"
            body="Former high-volume athletes push through fatigue signals. When Form drops below −20, back off regardless of how legs feel."
          />
          <Rule
            n="02"
            title="80/20 intensity distribution"
            body="~80% of weekly time in Z2 or easier, ~20% at threshold or above. Currently you're at 3% threshold+ — that's the gap to close."
          />
          <Rule
            n="03"
            title="Recovery is non-optional"
            body="1 full rest day per week minimum. Breaking a streak reflex beats grinding into plateau."
          />
          <Rule
            n="04"
            title="Knee-safe cycling defaults"
            body="Avoid heavy standing climbs and sudden big-gear mashes. Keep cadence ≥80 rpm on hard efforts. Minimal running volume."
          />
        </ul>
      </div>
    </div>
  )
}

function StatTile({
  big,
  label,
  hint,
  accentPositive,
}: {
  big: string
  label: string
  hint: string
  accentPositive: boolean
}) {
  return (
    <div className="border border-border-subtle bg-bg-tertiary/50 rounded-[var(--radius-md)] p-4 flex flex-col gap-1">
      <div className={`text-2xl font-semibold data-value ${accentPositive ? 'text-accent' : 'text-text-primary'}`}>
        {big}
      </div>
      <div className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">
        {label}
      </div>
      <div className="text-[0.7rem] text-text-muted leading-relaxed">{hint}</div>
    </div>
  )
}

function Rule({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="text-accent font-semibold text-sm mt-0.5 data-value shrink-0">{n}</span>
      <div>
        <div className="text-sm text-text-primary font-medium">{title}</div>
        <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{body}</div>
      </div>
    </li>
  )
}

function WeekHistoryRow({ summary, isPrePlan }: { summary: WeekSummary; isPrePlan: boolean }) {
  const { weekStart, weekEnd, phase, adherencePct, sessionsLogged, scoredCount, startSnap, endSnap, totalTimeMin, totalActivities } = summary

  const ctlDelta = startSnap && endSnap ? endSnap.ctl - startSnap.ctl : null
  const atlDelta = startSnap && endSnap ? endSnap.atl - startSnap.atl : null
  const tsbDelta = startSnap && endSnap ? endSnap.tsb - startSnap.tsb : null

  const phaseTone = isPrePlan
    ? 'text-text-muted bg-bg-tertiary border-border-subtle'
    : phase === 'recovery'
      ? 'text-teal-300 bg-teal-500/10 border-teal-500/30'
      : 'text-orange-300 bg-orange-500/10 border-orange-500/30'

  const adherenceTone =
    adherencePct >= 75
      ? 'bg-linear-to-r from-emerald-500 to-teal-400'
      : adherencePct >= 50
        ? 'bg-linear-to-r from-amber-500 to-amber-400'
        : 'bg-linear-to-r from-rose-500 to-rose-400'

  return (
    <div className="border border-border-subtle bg-bg-tertiary/40 rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-6 flex-wrap max-lg:gap-4 max-md:flex-col max-md:items-stretch max-md:gap-3">
      {/* Date + badge */}
      <div className="min-w-40 shrink-0 flex items-center gap-3 max-md:justify-between">
        <div>
          <div className="text-sm text-text-primary font-medium data-value">
            {format(weekStart, 'd. MMM', { locale: da })} – {format(weekEnd, 'd. MMM', { locale: da })}
          </div>
          <div className="text-[0.7rem] text-text-muted">
            {formatDuration(totalTimeMin)} · {totalActivities} rides
          </div>
        </div>
        <span className={`text-[0.6rem] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${phaseTone}`}>
          {isPrePlan ? 'Pre-plan' : phase === 'recovery' ? 'Recovery' : 'Build'}
        </span>
      </div>

      {/* Middle: adherence bar OR training-load summary for pre-plan */}
      {isPrePlan ? (
        <div className="flex-1 min-w-48 max-md:w-full text-xs text-text-muted leading-relaxed">
          Raw training load — no plan was in effect this week.
        </div>
      ) : (
        <div className="flex-1 min-w-48 max-md:w-full">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm text-text-primary font-semibold data-value">{adherencePct}%</span>
            <span className="text-[0.7rem] text-text-muted">
              {sessionsLogged}/{scoredCount} sessions
            </span>
          </div>
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full ${adherenceTone} rounded-full transition-all duration-300`}
              style={{ width: `${adherencePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Deltas — always shown */}
      <div className="flex gap-5 shrink-0 max-md:justify-between max-md:w-full">
        <DeltaStat label="CTL" delta={ctlDelta} positiveUp />
        <DeltaStat label="ATL" delta={atlDelta} positiveUp={false} />
        <DeltaStat label="TSB" delta={tsbDelta} positiveUp />
      </div>
    </div>
  )
}

function DeltaStat({ label, delta, positiveUp }: { label: string; delta: number | null; positiveUp: boolean }) {
  const isNull = delta === null
  const good = !isNull && (positiveUp ? delta >= 0 : delta <= 0)
  const arrow = isNull ? '' : delta === 0 ? '·' : delta > 0 ? '↑' : '↓'
  const color = isNull
    ? 'text-text-muted'
    : good
      ? 'text-emerald-300'
      : 'text-amber-300'

  return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className="text-[0.6rem] text-text-muted uppercase tracking-wider font-semibold">{label}</span>
      <span className={`text-xs font-semibold data-value ${color}`}>
        {isNull ? '—' : `${arrow} ${Math.abs(delta)}`}
      </span>
    </div>
  )
}
