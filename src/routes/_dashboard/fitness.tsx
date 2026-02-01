import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { FitnessChart } from '~/components/FitnessChart'
import { AdvancedMetrics } from '~/components/AdvancedMetrics'
import { EfficiencyChart } from '~/components/EfficiencyChart'
import { PowerZonesChart } from '~/components/PowerZonesChart'
import { FatBurningStats } from '~/components/FatBurningStats'
import { WeightChart } from '~/components/WeightChart'

export const Route = createFileRoute('/_dashboard/fitness')({
  component: FitnessPage,
})

function FitnessPage() {
  const { statsActivities, weight, maxHR, restingHR, age, gender, timeRangeDays, weightEntries, addWeightEntry, deleteWeightEntry } = useDashboard()

  return (
    <div className="fitness-page">
      <FatBurningStats
        activities={statsActivities}
        weight={weight}
        maxHR={maxHR}
        restingHR={restingHR}
        age={age}
        gender={gender}
        periodDays={timeRangeDays}
      />
      <WeightChart
        entries={weightEntries}
        onAddEntry={addWeightEntry}
        onDeleteEntry={deleteWeightEntry}
      />
      <FitnessChart activities={statsActivities} days={timeRangeDays} />
      <AdvancedMetrics activities={statsActivities} weight={weight} />
      <EfficiencyChart activities={statsActivities} weight={weight} />
      <PowerZonesChart activities={statsActivities} />
    </div>
  )
}
