import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { FitnessChart } from '~/components/FitnessChart'
import { PowerZonesChart } from '~/components/PowerZonesChart'
import { WeeklyProgress } from '~/components/WeeklyProgress'

export const Route = createFileRoute('/_dashboard/training')({
  component: TrainingPage,
})

function TrainingPage() {
  const { filteredActivities, timeRangeDays } = useDashboard()

  return (
    <div className="training-page">
      <FitnessChart activities={filteredActivities} days={timeRangeDays} />
      <PowerZonesChart activities={filteredActivities} />
      <WeeklyProgress activities={filteredActivities} />
    </div>
  )
}
