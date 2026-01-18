import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { PerformanceCharts } from '~/components/PerformanceCharts'

export const Route = createFileRoute('/_dashboard/trends')({
  component: TrendsPage,
})

function TrendsPage() {
  const { filteredActivities } = useDashboard()

  return <PerformanceCharts activities={filteredActivities} showAllCharts />
}
