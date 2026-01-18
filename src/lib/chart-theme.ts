// Cohesive chart theme using orange/amber palette with subtle variations

export const chartTheme = {
  // Grid and axes
  grid: '#27272a',
  axis: '#52525b',

  // Tooltip
  tooltip: {
    background: '#18181b',
    border: '#3f3f46',
    text: '#fafafa',
  },

  // Orange/Amber palette - primary data colors
  colors: {
    // Main series - warm orange tones
    orange: {
      primary: '#f97316',   // Main orange
      light: '#fb923c',     // Lighter orange
      lighter: '#fdba74',   // Even lighter
      dark: '#ea580c',      // Darker orange
      muted: '#c2410c',     // Muted/deep orange
    },
    // Secondary series - warm amber/yellow tones
    amber: {
      primary: '#f59e0b',   // Main amber
      light: '#fbbf24',     // Lighter amber
      dark: '#d97706',      // Darker amber
    },
    // Neutral grays for backgrounds/secondary data
    neutral: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
    },
    // Minimal accent colors - only for specific semantic meaning
    semantic: {
      positive: '#10b981',  // Teal-green for positive/form
      negative: '#ef4444',  // Red for negative/danger
      info: '#6366f1',      // Indigo for reference lines
    },
  },

  // Fill colors with transparency
  fills: {
    orange: {
      primary: 'rgba(249, 115, 22, 0.2)',
      light: 'rgba(251, 146, 60, 0.2)',
      lighter: 'rgba(253, 186, 116, 0.15)',
    },
    amber: {
      primary: 'rgba(245, 158, 11, 0.2)',
      light: 'rgba(251, 191, 36, 0.15)',
    },
    semantic: {
      positive: 'rgba(16, 185, 129, 0.2)',
      negative: 'rgba(239, 68, 68, 0.2)',
    },
  },
}

// Power zone colors - gradient from cool to hot
export const zoneColors = [
  '#71717a', // Z1 - Recovery (gray)
  '#a1a1aa', // Z2 - Endurance (light gray)
  '#fbbf24', // Z3 - Tempo (amber)
  '#f59e0b', // Z4 - Threshold (dark amber)
  '#f97316', // Z5 - VO2max (orange)
  '#ea580c', // Z6 - Anaerobic (dark orange)
  '#c2410c', // Z7 - Neuromuscular (deep orange)
]

// Tooltip style object for Recharts
export const tooltipStyle = {
  contentStyle: {
    backgroundColor: chartTheme.tooltip.background,
    border: `1px solid ${chartTheme.tooltip.border}`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    padding: '12px',
  },
  labelStyle: {
    color: chartTheme.tooltip.text,
    fontWeight: 600,
    marginBottom: '8px',
  },
  itemStyle: {
    color: chartTheme.colors.neutral[300],
    padding: '2px 0',
  },
}
