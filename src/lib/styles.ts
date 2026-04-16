/** Shared CSS class constants used across multiple components */

/** Standard stat card container */
export const statCard =
  'bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-6 flex flex-col gap-2 transition-all duration-200 card-accent-top hover:border-border hover:-translate-y-0.5 hover:shadow-md max-md:p-4 max-[480px]:p-3.5'

/** Accent-highlighted stat card (primary metric) */
export const statCardAccent =
  `${statCard} bg-linear-to-br from-accent/15 to-accent/5 border-accent/30`

/** Large gradient stat value text — monospace for data precision */
export const statValue =
  'data-value text-[2rem] font-medium leading-tight bg-linear-to-br from-text-primary to-text-secondary bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl'

/** Accent gradient stat value text — monospace */
export const statValueAccent =
  'data-value text-[2rem] font-medium leading-tight bg-linear-to-br from-accent-light to-accent bg-clip-text text-transparent max-md:text-2xl max-[480px]:text-xl'

/** Standard section/card container */
export const sectionCard =
  'bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5'

/** Info/help box at the bottom of a section */
export const infoBox =
  'p-5 bg-bg-tertiary rounded-[var(--radius-md)] text-[0.8rem] text-text-secondary leading-relaxed'

/** Trend direction badge classes */
export const trendClasses: Record<string, string> = {
  improving: 'bg-success-muted text-success',
  declining: 'bg-danger-muted text-danger',
  stable: 'bg-warning-muted text-warning',
}

/** Performance level badge classes */
export const badgeClasses: Record<string, string> = {
  elite: 'bg-accent/20 text-accent',
  excellent: 'bg-success-muted text-success',
  good: 'bg-info-muted text-[#60a5fa]',
  average: 'bg-warning-muted text-warning',
  'below-average': 'bg-danger-muted text-danger',
}
