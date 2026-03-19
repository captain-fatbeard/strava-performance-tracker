import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { useDashboard } from '~/lib/dashboard-context'
import { AdvancedMetrics } from '~/components/AdvancedMetrics'
import { ActivityScoring } from '~/components/ActivityScoring'
import { EfficiencyChart } from '~/components/EfficiencyChart'
import { PerformanceCharts } from '~/components/PerformanceCharts'
import { RunningMetrics } from '~/components/RunningMetrics'
import { RunningCharts } from '~/components/RunningCharts'
import { fetchCachedSegmentData, isSupabaseConfigured, type SegmentEffortWithActivity } from '~/lib/storage/supabase-client'

export const Route = createFileRoute('/_dashboard/performance')({
  component: PerformancePage,
})

function PerformancePage() {
  const { athlete, statsActivities, weight, age, gender, weightEntries, timeRangeDays } = useDashboard()
  const [allSegmentData, setAllSegmentData] = useState<SegmentEffortWithActivity[]>([])

  useEffect(() => {
    if (athlete && isSupabaseConfigured()) {
      fetchCachedSegmentData(athlete.id).then(setAllSegmentData)
    }
  }, [athlete])

  const segmentData = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - timeRangeDays)
    return allSegmentData.filter((s) => new Date(s.activityDate) >= cutoff)
  }, [allSegmentData, timeRangeDays])

  return (
    <div className="flex flex-col gap-8">
      {/* Cycling Performance */}
      <h2 className="text-xl font-bold flex items-center gap-3">
        <span className="size-8 bg-bg-secondary border border-border-subtle rounded-[var(--radius-sm)] flex items-center justify-center">
          <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="18" r="3" />
            <circle cx="19" cy="18" r="3" />
            <path d="M12 18V6l-3 4" />
            <path d="M12 6l3 4" />
          </svg>
        </span>
        <span className="bg-linear-to-br from-accent to-teal-300 bg-clip-text text-transparent">Cycling Performance</span>
      </h2>
      <AdvancedMetrics activities={statsActivities} weight={weight} age={age} gender={gender} />
      <ActivityScoring activities={statsActivities} />
      <EfficiencyChart activities={statsActivities} weight={weight} weightEntries={weightEntries} segmentData={segmentData} />
      <PerformanceCharts activities={statsActivities} showAllCharts />

      {/* Running Performance */}
      <h2 className="text-xl font-bold flex items-center gap-3 mt-4">
        <span className="size-8 bg-bg-secondary border border-border-subtle rounded-[var(--radius-sm)] flex items-center justify-center">
          <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
            <path d="M7 21l3-4" />
            <path d="M16 21l-2-4-3-1-1.5-3.5L13 8l4 1 2 3" />
            <path d="M6 12l2-1 3 1" />
          </svg>
        </span>
        <span className="bg-linear-to-br from-accent to-teal-300 bg-clip-text text-transparent">Running Performance</span>
      </h2>
      <RunningMetrics activities={statsActivities} age={age} gender={gender} />
      <RunningCharts activities={statsActivities} />
    </div>
  )
}
