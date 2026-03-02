import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO, startOfWeek } from 'date-fns'
import { chartTheme, tooltipStyle, formatDateShort, formatDateFull } from '~/lib/chart-theme'
import type { WeightEntry } from '~/lib/storage/supabase-client'

interface WeightChartProps {
  entries: WeightEntry[]
  onAddEntry: (weight: number, recordedAt: Date) => Promise<boolean>
  onDeleteEntry: (id: string) => Promise<boolean>
}

export function WeightChart({ entries, onAddEntry, onDeleteEntry }: WeightChartProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newWeightDate, setNewWeightDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const chartData = useMemo(() => {
    if (entries.length === 0) return []

    const sorted = [...entries].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )

    // Group by week and compute averages
    const weekGroups = new Map<string, number[]>()
    for (const entry of sorted) {
      const weekKey = startOfWeek(new Date(entry.recordedAt), { weekStartsOn: 1 }).toISOString()
      const group = weekGroups.get(weekKey)
      if (group) {
        group.push(entry.weight)
      } else {
        weekGroups.set(weekKey, [entry.weight])
      }
    }

    const weekAvgs = new Map<string, number>()
    for (const [key, weights] of weekGroups) {
      weekAvgs.set(key, weights.reduce((sum, w) => sum + w, 0) / weights.length)
    }

    return sorted.map((entry) => {
      const weekKey = startOfWeek(new Date(entry.recordedAt), { weekStartsOn: 1 }).toISOString()
      return {
        date: entry.recordedAt,
        weight: entry.weight,
        weeklyAvg: weekAvgs.get(weekKey),
      }
    })
  }, [entries])

  const { minWeight, maxWeight } = useMemo(() => {
    if (chartData.length === 0) return { minWeight: 60, maxWeight: 90 }
    const weights = chartData.map((d) => d.weight)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const padding = (max - min) * 0.1 || 2
    return {
      minWeight: Math.floor(min - padding),
      maxWeight: Math.ceil(max + padding),
    }
  }, [chartData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const weightValue = parseFloat(newWeight)
    if (isNaN(weightValue) || weightValue < 40 || weightValue > 150) return

    setIsSubmitting(true)
    const success = await onAddEntry(weightValue, new Date(newWeightDate))
    if (success) {
      setNewWeight('')
      setNewWeightDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setIsModalOpen(false)
    }
    setIsSubmitting(false)
  }

  const latestEntry = entries[0]
  const oldestEntry = entries[entries.length - 1]
  const weightChange = entries.length > 1 ? latestEntry.weight - oldestEntry.weight : 0

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[var(--radius-lg)] p-7 transition-all duration-200 hover:border-border max-md:p-4 max-[480px]:p-3.5">
      <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
        <h3 className="text-lg font-semibold text-text-primary max-[480px]:text-base">Weight History</h3>
        <div className="flex items-center gap-6">
          {entries.length > 0 && (
            <div className="flex gap-8 flex-wrap max-md:gap-4">
              <span className="flex flex-col items-center">
                <span className="text-[0.7rem] text-text-muted uppercase font-semibold tracking-wide">Current</span>
                <span className="text-xl font-bold" style={{ color: chartTheme.colors.primary.main }}>
                  {latestEntry.weight.toFixed(1)} kg
                </span>
              </span>
              {entries.length > 1 && (
                <span className="flex flex-col items-center">
                  <span className="text-[0.7rem] text-text-muted uppercase font-semibold tracking-wide">Change</span>
                  <span
                    className="text-xl font-bold"
                    style={{
                      color: weightChange < 0
                        ? chartTheme.colors.semantic.positive
                        : weightChange > 0
                          ? chartTheme.colors.semantic.negative
                          : chartTheme.colors.neutral[400],
                    }}
                  >
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                  </span>
                </span>
              )}
            </div>
          )}
          <button
            className="flex items-center justify-center bg-bg-tertiary border border-border text-text-secondary size-9 rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 hover:bg-accent hover:border-accent hover:text-white"
            onClick={() => setIsModalOpen(true)}
            aria-label="Add weight entry"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-text-muted text-center py-16 text-[0.9rem]">
          No weight entries yet. Click the + button to add your first entry.
        </div>
      ) : (
        <>
        <div className="flex justify-end gap-5 mb-2 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded-full" style={{ backgroundColor: chartTheme.colors.primary.main }} />
            Weight
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded-full border-t-2 border-dashed" style={{ borderColor: chartTheme.colors.amber.main }} />
            Weekly Avg
          </span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartTheme.colors.primary.main} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chartTheme.colors.primary.main} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis
              dataKey="date"
              stroke={chartTheme.axis}
              fontSize={12}
              tickFormatter={(date) => formatDateShort(date)}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke={chartTheme.axis}
              fontSize={12}
              domain={[minWeight, maxWeight]}
              tickFormatter={(value) => `${value} kg`}
            />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(date) => formatDateFull(date as string)}
              formatter={(value: number | undefined, name: string) => [
                `${(value ?? 0).toFixed(1)} kg`,
                name === 'weeklyAvg' ? 'Weekly Avg' : 'Weight',
              ]}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke={chartTheme.colors.primary.main}
              strokeWidth={2}
              dot={{ fill: chartTheme.colors.primary.main, strokeWidth: 0, r: 4 }}
              activeDot={{ fill: chartTheme.colors.primary.light, strokeWidth: 0, r: 6 }}
            />
            <Line
              type="stepAfter"
              dataKey="weeklyAvg"
              name="weeklyAvg"
              stroke={chartTheme.colors.amber.main}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ fill: chartTheme.colors.amber.main, strokeWidth: 0, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
        </>
      )}

      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] animate-fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="modal-center bg-bg-secondary border border-border rounded-[var(--radius-lg)] p-6 w-[90%] max-w-[400px] z-[101] shadow-lg animate-modal-slide-in">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-border-subtle">
              <h4 className="text-lg font-semibold text-text-primary m-0">Add Weight Entry</h4>
              <button
                className="flex items-center justify-center bg-bg-tertiary border border-border text-text-secondary size-8 rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 hover:bg-bg-elevated hover:text-text-primary hover:border-text-muted"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-[1fr_1.5fr] gap-3 max-[480px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="40"
                    max="150"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="75.0"
                    className="w-full bg-bg-tertiary border border-border text-text-primary py-2.5 px-3.5 rounded-[var(--radius-sm)] text-sm transition-all duration-150 placeholder:text-text-muted hover:border-text-muted focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newWeightDate}
                    onChange={(e) => setNewWeightDate(e.target.value)}
                    max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    className="w-full bg-bg-tertiary border border-border text-text-primary py-2.5 px-3.5 rounded-[var(--radius-sm)] text-sm transition-all duration-150 hover:border-text-muted focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-linear-to-br from-accent to-accent-dark text-white border-none py-2.5 px-4 text-sm font-semibold rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[0_2px_8px_rgba(20,184,166,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !newWeight}
              >
                {isSubmitting ? 'Adding...' : 'Add Entry'}
              </button>
            </form>

            {entries.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border-subtle">
                <label className="block text-[0.7rem] text-text-muted uppercase tracking-wider font-semibold mb-3">Recent Entries</label>
                <ul className="list-none flex flex-col gap-2">
                  {entries.slice(0, 5).map((entry) => (
                    <li key={entry.id} className="flex items-center gap-3 py-2 px-3 bg-bg-tertiary rounded-[var(--radius-sm)] text-sm">
                      <span className="text-text-secondary min-w-[50px]">
                        {formatDateFull(entry.recordedAt)}
                      </span>
                      <span className="flex-1 text-text-primary font-medium">
                        {entry.weight.toFixed(1)} kg
                      </span>
                      <button
                        type="button"
                        className="bg-transparent border-none text-text-muted p-1 rounded-[var(--radius-sm)] cursor-pointer flex items-center justify-center transition-all duration-150 hover:text-danger hover:bg-danger-muted"
                        onClick={() => onDeleteEntry(entry.id)}
                        aria-label="Delete entry"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
