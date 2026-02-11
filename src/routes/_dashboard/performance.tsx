import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { AdvancedMetrics } from '~/components/AdvancedMetrics'
import { EfficiencyChart } from '~/components/EfficiencyChart'
import { PerformanceCharts } from '~/components/PerformanceCharts'

export const Route = createFileRoute('/_dashboard/performance')({
  component: PerformancePage,
})

function PerformancePage() {
  const { statsActivities, weight, age, gender } = useDashboard()

  return (
    <div className="flex flex-col gap-8">
      <AdvancedMetrics activities={statsActivities} weight={weight} age={age} gender={gender} />
      <EfficiencyChart activities={statsActivities} weight={weight} />
      <PerformanceCharts activities={statsActivities} showAllCharts />
    </div>
  )
}
