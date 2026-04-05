import { type StravaActivity } from './strava'

/** Check if an activity is a cycling activity */
export function isRide(a: StravaActivity): boolean {
  return a.type === 'Ride' || a.type === 'VirtualRide'
}

/** Check if an activity is a running activity */
export function isRun(a: StravaActivity): boolean {
  return a.type === 'Run'
}

/** Get a human-readable score label from a numeric ride score */
export function getScoreLabel(score: number): string {
  if (score >= 100) return 'Epic'
  if (score >= 80) return 'Hard'
  if (score >= 50) return 'Solid'
  if (score >= 30) return 'Moderate'
  return 'Easy'
}

/** CSS classes for score label badges */
export const scoreLabelClasses: Record<string, string> = {
  Epic: 'bg-[#f97316]/15 text-[#f97316]',
  Hard: 'bg-[#ef4444]/15 text-[#ef4444]',
  Solid: 'bg-[#3b82f6]/15 text-[#3b82f6]',
  Moderate: 'bg-[#a78bfa]/15 text-[#a78bfa]',
  Easy: 'bg-bg-tertiary text-text-muted',
}

/** CSS classes for activity type badges */
export const activityTypeClasses: Record<string, string> = {
  ride: 'bg-info-muted text-[#60a5fa]',
  virtualride: 'bg-info-muted text-[#60a5fa]',
  run: 'bg-success-muted text-[#4ade80]',
}
