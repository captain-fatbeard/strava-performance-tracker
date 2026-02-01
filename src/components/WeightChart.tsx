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
import { format, parseISO } from 'date-fns'
import { chartTheme, tooltipStyle } from '~/lib/chart-theme'
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

    return [...entries]
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((entry) => ({
        date: entry.recordedAt,
        weight: entry.weight,
      }))
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
    <div className="chart-section">
      <div className="chart-header">
        <h3>Weight History</h3>
        <div className="weight-header-right">
          {entries.length > 0 && (
            <div className="weight-stats">
              <span className="weight-stat">
                <span className="label">Current</span>
                <span className="value" style={{ color: chartTheme.colors.primary.main }}>
                  {latestEntry.weight.toFixed(1)} kg
                </span>
              </span>
              {entries.length > 1 && (
                <span className="weight-stat">
                  <span className="label">Change</span>
                  <span
                    className="value"
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
            className="weight-add-btn-icon"
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
        <div className="no-data">
          No weight entries yet. Click the + button to add your first entry.
        </div>
      ) : (
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
              tickFormatter={(date) => format(parseISO(date), 'MMM d')}
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
              labelFormatter={(date) => format(parseISO(date as string), 'MMM d, yyyy HH:mm')}
              formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)} kg`, 'Weight']}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke={chartTheme.colors.primary.main}
              strokeWidth={2}
              dot={{ fill: chartTheme.colors.primary.main, strokeWidth: 0, r: 4 }}
              activeDot={{ fill: chartTheme.colors.primary.light, strokeWidth: 0, r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {isModalOpen && (
        <>
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)} />
          <div className="weight-modal">
            <div className="weight-modal-header">
              <h4>Add Weight Entry</h4>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="weight-modal-form">
              <div className="weight-modal-inputs">
                <div className="filter-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="40"
                    max="150"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="75.0"
                    className="weight-input"
                    autoFocus
                  />
                </div>
                <div className="filter-group">
                  <label>Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newWeightDate}
                    onChange={(e) => setNewWeightDate(e.target.value)}
                    max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    className="weight-input"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="weight-add-btn"
                disabled={isSubmitting || !newWeight}
              >
                {isSubmitting ? 'Adding...' : 'Add Entry'}
              </button>
            </form>

            {entries.length > 0 && (
              <div className="weight-modal-entries">
                <label>Recent Entries</label>
                <ul className="weight-entries-list">
                  {entries.slice(0, 5).map((entry) => (
                    <li key={entry.id} className="weight-entry-item">
                      <span className="weight-entry-date">
                        {format(new Date(entry.recordedAt), 'MMM d, HH:mm')}
                      </span>
                      <span className="weight-entry-value">
                        {entry.weight.toFixed(1)} kg
                      </span>
                      <button
                        type="button"
                        className="weight-entry-delete"
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
