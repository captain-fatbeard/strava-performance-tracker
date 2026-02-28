import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { WeightChart } from '~/components/WeightChart'
import { HeartRateInsights } from '~/components/HeartRateInsights'
import { ActivityInsights } from '~/components/ActivityInsights'

export const Route = createFileRoute('/_dashboard/health')({
  component: HealthPage,
})

function HealthPage() {
  const {
    filteredActivities,
    weight,
    maxHR,
    restingHR,
    age,
    gender,
    timeRangeDays,
    weightEntries,
    addWeightEntry,
    deleteWeightEntry,
  } = useDashboard()

  return (
    <div className="flex flex-col gap-8">
      <WeightChart
        entries={weightEntries}
        onAddEntry={addWeightEntry}
        onDeleteEntry={deleteWeightEntry}
      />
      <HeartRateInsights
        activities={filteredActivities}
        maxHR={maxHR}
        restingHR={restingHR}
      />
      <ActivityInsights
        activities={filteredActivities}
        weight={weight}
        age={age}
        gender={gender}
        timeRangeDays={timeRangeDays}
      />
    </div>
  )
}
