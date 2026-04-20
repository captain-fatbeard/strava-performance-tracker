import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { format, addDays } from 'date-fns'
import { useDashboard } from '~/lib/dashboard-context'
import { calculateFitnessOverTime, estimateFTPHistory } from '~/lib/performance'

export const Route = createFileRoute('/_dashboard/plan')({
  component: PlanPage,
})

type SessionType = 'z2' | 'rest' | 'opener' | 'test' | 'threshold' | 'vo2' | 'long'

interface DaySession {
  type: SessionType
  label: string
  detail: string
  duration: string
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

function PlanPage() {
  const { activities, stats, maxHR, restingHR } = useDashboard()

  const ftp = stats.ftp || 236

  // Z2 HR ceiling via Karvonen (70% of HR reserve)
  const z2HrCeiling = Math.round(restingHR + 0.7 * (maxHR - restingHR))
  const z2HrFloor = Math.round(restingHR + 0.6 * (maxHR - restingHR))

  const z2PowerLow = Math.round(ftp * 0.64)
  const z2PowerHigh = Math.round(ftp * 0.75)

  const thresholdLow = Math.round(ftp * 0.95)
  const thresholdHigh = Math.round(ftp * 1.0)

  const vo2Low = Math.round(ftp * 1.1)
  const vo2High = Math.round(ftp * 1.15)

  // Pull current CTL/ATL/TSB from fitness history
  const fitnessNow = useMemo(() => {
    const history = estimateFTPHistory(activities)
    if (history.length === 0) return null
    const series = calculateFitnessOverTime(activities, history)
    return series.length > 0 ? series[series.length - 1] : null
  }, [activities])

  const today = new Date()
  const plan: DaySession[] = [
    { type: 'z2', label: 'Recovery Z2', detail: 'Spin, no surges', duration: '60–75 min' },
    { type: 'z2', label: 'Recovery Z2', detail: 'Spin, no surges', duration: '60–75 min' },
    { type: 'z2', label: 'Recovery Z2', detail: 'Spin, no surges', duration: '60–75 min' },
    { type: 'z2', label: 'Recovery Z2', detail: 'Spin, no surges', duration: '60–75 min' },
    { type: 'rest', label: 'Rest', detail: 'Full off day', duration: '—' },
    { type: 'opener', label: 'Opener', detail: `Z2 with 3×1 min @ ${thresholdLow}W near the end`, duration: '45 min' },
    { type: 'test', label: 'Test ride', detail: 'Climb portal or structured workout if legs feel snappy', duration: '60–90 min' },
  ]

  const weeklyTemplate: Array<{ type: SessionType; label: string; detail: string; targets: string }> = [
    { type: 'long', label: 'Long Z2', detail: 'Aerobic base volume', targets: `${z2PowerLow}–${z2PowerHigh}W · HR <${z2HrCeiling} · 90–120 min` },
    { type: 'z2', label: 'Z2 Endurance', detail: 'Easy aerobic', targets: `${z2PowerLow}–${z2PowerHigh}W · HR <${z2HrCeiling} · 60–90 min` },
    { type: 'z2', label: 'Z2 Endurance', detail: 'Easy aerobic', targets: `${z2PowerLow}–${z2PowerHigh}W · HR <${z2HrCeiling} · 60–90 min` },
    { type: 'threshold', label: 'Threshold', detail: '2×20 min at FTP', targets: `${thresholdLow}–${thresholdHigh}W · ~1h total` },
    { type: 'vo2', label: 'VO2max', detail: '5×4 min hard', targets: `${vo2Low}–${vo2High}W · climb portal works well` },
    { type: 'rest', label: 'Rest or easy spin', detail: 'Recovery', targets: '30–45 min very easy, or off' },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Intro / Current status */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-2 max-[480px]:text-xl">
              Training Plan
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed max-w-2xl">
              Recovery-first week to bleed off accumulated fatigue, then a repeatable weekly structure
              that adds real threshold and VO2max work without blowing up CTL.
            </p>
          </div>
          {fitnessNow && (
            <div className="flex items-center gap-5 text-sm">
              <div className="text-center">
                <div className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold">CTL</div>
                <div className="text-xl font-semibold text-accent data-value">{Math.round(fitnessNow.ctl)}</div>
              </div>
              <div className="text-center">
                <div className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold">ATL</div>
                <div className="text-xl font-semibold text-amber-400 data-value">{Math.round(fitnessNow.atl)}</div>
              </div>
              <div className="text-center">
                <div className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold">TSB</div>
                <div className={`text-xl font-semibold data-value ${fitnessNow.tsb < -5 ? 'text-rose-400' : 'text-text-primary'}`}>
                  {Math.round(fitnessNow.tsb)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold">FTP</div>
                <div className="text-xl font-semibold text-text-primary data-value">{ftp}W</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* This week */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">
            This Week — Recovery Consolidation
          </h3>
          <span className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">
            7-day block · starts today
          </span>
        </div>

        <div className="grid grid-cols-7 gap-3 max-lg:grid-cols-4 max-md:grid-cols-2 max-[480px]:grid-cols-1">
          {plan.map((session, i) => {
            const date = addDays(today, i)
            const colors = SESSION_COLORS[session.type]
            return (
              <div
                key={i}
                className={`border ${colors.border} ${colors.bg} rounded-[var(--radius-md)] p-4 flex flex-col gap-2 transition-all duration-150 hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] text-text-muted uppercase tracking-wider font-semibold">
                    {format(date, 'EEE')}
                  </span>
                  <span className="text-[0.65rem] text-text-muted data-value">
                    {format(date, 'd. MMM')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-semibold ${colors.text}`}>{session.label}</span>
                </div>
                <div className="text-xs text-text-secondary leading-relaxed">{session.detail}</div>
                <div className="text-[0.7rem] text-text-muted font-medium mt-auto data-value">
                  {session.duration}
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
              Goal
            </div>
            <div className="text-sm text-text-primary">ATL 73 → ~55</div>
            <div className="text-[0.7rem] text-text-muted mt-0.5">Form rebounds toward 0</div>
          </div>
        </div>
      </div>

      {/* Weekly template */}
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
          {weeklyTemplate.map((session, i) => {
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
                <div className="text-sm text-text-secondary flex-1 max-md:text-xs">
                  {session.detail}
                </div>
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

      {/* Rules / context */}
      <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 max-md:p-4 max-[480px]:p-3.5">
        <h3 className="text-lg font-semibold text-text-primary mb-5 max-[480px]:text-base">
          Non-negotiables
        </h3>

        <ul className="flex flex-col gap-3">
          <li className="flex gap-3 items-start">
            <span className="text-accent font-semibold text-sm mt-0.5 data-value shrink-0">01</span>
            <div>
              <div className="text-sm text-text-primary font-medium">Trust the TSB number</div>
              <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Former high-volume athletes push through fatigue signals. When Form drops below −20, back
                off regardless of how legs feel.
              </div>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-accent font-semibold text-sm mt-0.5 data-value shrink-0">02</span>
            <div>
              <div className="text-sm text-text-primary font-medium">80/20 intensity distribution</div>
              <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
                ~80% of weekly time in Z2 or easier, ~20% at threshold or above. Currently you're at 3%
                threshold+ — that's the gap to close.
              </div>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-accent font-semibold text-sm mt-0.5 data-value shrink-0">03</span>
            <div>
              <div className="text-sm text-text-primary font-medium">Recovery is non-optional</div>
              <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
                1 full rest day per week minimum. Breaking a streak reflex beats grinding into plateau.
              </div>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-accent font-semibold text-sm mt-0.5 data-value shrink-0">04</span>
            <div>
              <div className="text-sm text-text-primary font-medium">Knee-safe cycling defaults</div>
              <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Avoid heavy standing climbs and sudden big-gear mashes. Keep cadence ≥80 rpm on hard
                efforts. Minimal running volume.
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}
