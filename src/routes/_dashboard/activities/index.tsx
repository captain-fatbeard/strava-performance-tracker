import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { ActivityList } from '~/components/ActivityList'

export const Route = createFileRoute('/_dashboard/activities/')({
  component: ActivitiesPage,
})

function ActivitiesPage() {
  const { filteredActivities } = useDashboard()

  return <ActivityList activities={filteredActivities} />
}
