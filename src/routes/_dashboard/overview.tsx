import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { StatsCards } from '~/components/StatsCards'
import { PersonalRecords } from '~/components/PersonalRecords'

export const Route = createFileRoute('/_dashboard/overview')({
  component: OverviewPage,
})

function OverviewPage() {
  const { lifetimeStats, lifetimeMergedActivities } = useDashboard()

  return (
    <>
      <StatsCards stats={lifetimeStats} />
      <PersonalRecords activities={lifetimeMergedActivities} />
    </>
  )
}
