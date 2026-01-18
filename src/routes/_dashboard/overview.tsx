import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '../_dashboard'
import { StatsCards } from '~/components/StatsCards'
import { PersonalRecords } from '~/components/PersonalRecords'
import { WeeklyProgress } from '~/components/WeeklyProgress'

export const Route = createFileRoute('/_dashboard/overview')({
  component: OverviewPage,
})

function OverviewPage() {
  const { filteredActivities, stats } = useDashboard()

  return (
    <>
      <StatsCards stats={stats} />
      <PersonalRecords activities={filteredActivities} />
      <WeeklyProgress activities={filteredActivities} />
    </>
  )
}
