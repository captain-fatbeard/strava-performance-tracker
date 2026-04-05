/** Shared time range selector button group used across chart components */

export const rangeOptions = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
  { label: 'All', days: 0 },
] as const

interface RangeSelectorProps {
  days: number
  onChange: (days: number) => void
}

export function RangeSelector({ days, onChange }: RangeSelectorProps) {
  return (
    <div className="flex gap-1 bg-bg-tertiary rounded-[var(--radius-sm)] p-0.5">
      {rangeOptions.map((opt) => (
        <button
          key={opt.label}
          onClick={() => onChange(opt.days)}
          className={`text-[0.7rem] font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] transition-colors ${
            days === opt.days
              ? 'bg-accent text-bg-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
