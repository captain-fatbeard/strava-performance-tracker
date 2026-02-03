import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { AdvancedMetrics } from '~/components/AdvancedMetrics'
import { EfficiencyChart } from '~/components/EfficiencyChart'
import { PerformanceCharts } from '~/components/PerformanceCharts'

export const Route = createFileRoute('/_dashboard/performance')({
  component: PerformancePage,
})

function PerformancePage() {
  const { filteredActivities, statsActivities, weight } = useDashboard()

  return (
    <div className="performance-page">
      <AdvancedMetrics activities={statsActivities} weight={weight} />
      <EfficiencyChart activities={filteredActivities} weight={weight} />
      <PerformanceCharts activities={filteredActivities} showAllCharts />
    </div>
  )
}
