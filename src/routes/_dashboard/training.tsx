import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { FitnessChart } from '~/components/FitnessChart'
import { PowerZonesChart } from '~/components/PowerZonesChart'
import { WeeklyProgress } from '~/components/WeeklyProgress'

export const Route = createFileRoute('/_dashboard/training')({
  component: TrainingPage,
})

function TrainingPage() {
  const { activities, filteredActivities } = useDashboard()

  return (
    <div className="flex flex-col gap-8">
      <FitnessChart activities={activities} />
      <PowerZonesChart activities={filteredActivities} />
      <WeeklyProgress activities={filteredActivities} />
    </div>
  )
}
