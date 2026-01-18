// Consistent chart theme matching the app's design system

export const chartTheme = {
  // Grid and axes
  grid: '#27272a',
  axis: '#71717a',

  // Tooltip
  tooltip: {
    background: '#18181b',
    border: '#3f3f46',
    text: '#fafafa',
  },

  // Primary colors for data series
  colors: {
    primary: '#f97316',    // Orange (accent)
    secondary: '#06b6d4',  // Cyan
    tertiary: '#a855f7',   // Purple
    quaternary: '#ec4899', // Pink

    // Semantic colors
    success: '#22c55e',
    warning: '#eab308',
    danger: '#ef4444',
    info: '#3b82f6',
  },

  // Gradients (with transparency for areas)
  fills: {
    primary: '#f9731633',
    secondary: '#06b6d433',
    tertiary: '#a855f733',
    success: '#22c55e33',
    warning: '#eab30833',
    danger: '#ef444433',
    info: '#3b82f633',
  },
}

// Power zone colors (warm to hot gradient)
export const zoneColors = [
  '#71717a', // Z1 - Recovery (gray)
  '#3b82f6', // Z2 - Endurance (blue)
  '#22c55e', // Z3 - Tempo (green)
  '#eab308', // Z4 - Threshold (yellow)
  '#f97316', // Z5 - VO2max (orange)
  '#ef4444', // Z6 - Anaerobic (red)
  '#ec4899', // Z7 - Neuromuscular (pink)
]

// Tooltip style object for Recharts
export const tooltipStyle = {
  contentStyle: {
    backgroundColor: chartTheme.tooltip.background,
    border: `1px solid ${chartTheme.tooltip.border}`,
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
  },
  labelStyle: {
    color: chartTheme.tooltip.text,
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemStyle: {
    color: chartTheme.tooltip.text,
  },
}
