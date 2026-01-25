import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { StatsCards } from '~/components/StatsCards'
import { PersonalRecords } from '~/components/PersonalRecords'
import { WeeklyProgress } from '~/components/WeeklyProgress'

export const Route = createFileRoute('/_dashboard/overview')({
  component: OverviewPage,
})

function OverviewPage() {
  const { statsActivities, stats } = useDashboard()

  return (
    <>
      <StatsCards stats={stats} />
      <PersonalRecords activities={statsActivities} />
      <WeeklyProgress activities={statsActivities} />
    </>
  )
}
