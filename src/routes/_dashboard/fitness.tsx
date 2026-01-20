import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '~/lib/dashboard-context'
import { FitnessChart } from '~/components/FitnessChart'
import { AdvancedMetrics } from '~/components/AdvancedMetrics'
import { EfficiencyChart } from '~/components/EfficiencyChart'
import { PowerZonesChart } from '~/components/PowerZonesChart'
import { FatBurningStats } from '~/components/FatBurningStats'

export const Route = createFileRoute('/_dashboard/fitness')({
  component: FitnessPage,
})

function FitnessPage() {
  const { filteredActivities, weight, maxHR, restingHR, age, gender, timeRangeDays } = useDashboard()

  return (
    <>
      <FatBurningStats
        activities={filteredActivities}
        weight={weight}
        maxHR={maxHR}
        restingHR={restingHR}
        age={age}
        gender={gender}
        periodDays={timeRangeDays}
      />
      <FitnessChart activities={filteredActivities} days={timeRangeDays} />
      <AdvancedMetrics activities={filteredActivities} weight={weight} />
      <EfficiencyChart activities={filteredActivities} weight={weight} />
      <PowerZonesChart activities={filteredActivities} />
    </>
  )
}
