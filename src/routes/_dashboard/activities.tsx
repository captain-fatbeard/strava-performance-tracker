import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/activities')({
  component: ActivitiesLayout,
})

function ActivitiesLayout() {
  return <Outlet />
}
