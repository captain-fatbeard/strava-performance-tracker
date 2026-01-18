import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { type StravaActivity } from '~/lib/strava'
import {
  estimateFTP,
  getPowerZones,
  calculateZoneDistribution,
} from '~/lib/performance'
import { secondsToHMS } from '~/lib/strava'
import { zoneColors, tooltipStyle } from '~/lib/chart-theme'

interface PowerZonesChartProps {
  activities: StravaActivity[]
}

export function PowerZonesChart({ activities }: PowerZonesChartProps) {
  const ftp = useMemo(() => estimateFTP(activities), [activities])

  const zoneData = useMemo(() => {
    if (!ftp) return []
    const data = calculateZoneDistribution(activities, ftp)
    // Override colors with theme colors
    return data.map((d, i) => ({
      ...d,
      color: zoneColors[i] || d.color,
    }))
  }, [activities, ftp])

  const zones = useMemo(() => {
    if (!ftp) return []
    const z = getPowerZones(ftp)
    // Override colors with theme colors
    return z.map((zone, i) => ({
      ...zone,
      color: zoneColors[i] || zone.color,
    }))
  }, [ftp])

  if (!ftp || zoneData.length === 0) {
    return (
      <div className="chart-section">
        <h3>Power Zones</h3>
        <div className="no-data">
          Need rides with power data to show zone distribution.
        </div>
      </div>
    )
  }

  return (
    <div className="chart-section">
      <div className="chart-header">
        <h3>Power Zones</h3>
        <span className="ftp-badge">FTP: {ftp}W</span>
      </div>

      <div className="zones-container">
        <div className="zones-chart">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={zoneData}
                dataKey="time"
                nameKey="zone"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
                label={({ zone, percentage }) =>
                  percentage > 5 ? `${percentage}%` : ''
                }
                labelLine={false}
              >
                {zoneData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, name: string) => [
                  secondsToHMS(value),
                  name,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="zones-table">
          <table>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Power</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => {
                const data = zoneData.find((d) => d.zone === zone.name)
                return (
                  <tr key={zone.name}>
                    <td>
                      <span
                        className="zone-dot"
                        style={{ backgroundColor: zone.color }}
                      />
                      {zone.name}
                    </td>
                    <td>
                      {zone.min}-{zone.max === 9999 ? '∞' : zone.max}W
                    </td>
                    <td>{data ? secondsToHMS(data.time) : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
