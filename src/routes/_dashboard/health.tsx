import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { WeightChart } from '~/components/WeightChart'
import { FatBurningStats } from '~/components/FatBurningStats'

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
    <div className="health-page">
      <WeightChart
        entries={weightEntries}
        onAddEntry={addWeightEntry}
        onDeleteEntry={deleteWeightEntry}
      />
      <FatBurningStats
        activities={filteredActivities}
        weight={weight}
        maxHR={maxHR}
        restingHR={restingHR}
        age={age}
        gender={gender}
        periodDays={timeRangeDays}
      />
    </div>
  )
}
