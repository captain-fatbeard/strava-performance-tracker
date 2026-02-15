// Chart theme with distinct, high-contrast color palette

export const chartTheme = {
  // Grid and axes
  grid: '#1e2e2e',
  axis: '#5f7a7a',

  // Tooltip
  tooltip: {
    background: '#111919',
    border: '#2a3f3f',
    text: '#f0fdfa',
  },

  // Distinct color palette - each color is visually different
  colors: {
    // Primary - Teal (main brand color)
    primary: {
      main: '#14b8a6',
      light: '#2dd4bf',
      lighter: '#5eead4',
      dark: '#0d9488',
      muted: '#0f766e',
    },
    // Secondary - Violet (high contrast with teal)
    secondary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    // Tertiary - Rose/Pink
    tertiary: {
      main: '#f472b6',
      light: '#f9a8d4',
      dark: '#ec4899',
    },
    // Fourth - Amber/Gold (muted warm contrast)
    amber: {
      main: '#d4a574',
      light: '#e2bc94',
      dark: '#c49460',
    },
    // Fifth - Sky Blue
    sky: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0ea5e9',
    },
    // Sixth - Coral/Orange
    coral: {
      main: '#fb7185',
      light: '#fda4af',
      dark: '#f43f5e',
    },
    // Neutral grays
    neutral: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#99b3b3',
      500: '#5f7a7a',
      600: '#3d5555',
      700: '#2a3f3f',
      800: '#1e2e2e',
    },
    // Semantic colors
    semantic: {
      positive: '#34d399',
      negative: '#f87171',
      warning: '#fbbf24',
      info: '#38bdf8',
    },
  },

  // Fill colors with transparency
  fills: {
    primary: {
      main: 'rgba(20, 184, 166, 0.25)',
      light: 'rgba(45, 212, 191, 0.2)',
      lighter: 'rgba(94, 234, 212, 0.15)',
    },
    secondary: {
      main: 'rgba(139, 92, 246, 0.25)',
      light: 'rgba(167, 139, 250, 0.2)',
    },
    tertiary: {
      main: 'rgba(244, 114, 182, 0.25)',
      light: 'rgba(249, 168, 212, 0.2)',
    },
    amber: {
      main: 'rgba(212, 165, 116, 0.25)',
      light: 'rgba(226, 188, 148, 0.2)',
    },
    sky: {
      main: 'rgba(56, 189, 248, 0.25)',
      light: 'rgba(125, 211, 252, 0.2)',
    },
    coral: {
      main: 'rgba(251, 113, 133, 0.25)',
      light: 'rgba(253, 164, 175, 0.2)',
    },
    semantic: {
      positive: 'rgba(52, 211, 153, 0.2)',
      negative: 'rgba(248, 113, 113, 0.2)',
    },
  },
}

// Power zone colors - subtle progression
export const zoneColors = [
  '#4a5568', // Z1 - Recovery (cool gray)
  '#5a7a6b', // Z2 - Endurance (muted green-gray)
  '#6a7a5a', // Z3 - Tempo (olive gray)
  '#7a7a5a', // Z4 - Threshold (warm gray)
  '#8a6a5a', // Z5 - VO2max (muted brown)
  '#8a5a6a', // Z6 - Anaerobic (muted mauve)
  '#7a5a6a', // Z7 - Neuromuscular (dusty rose)
]

// HR zone colors - subtle, muted progression
export const hrZoneColors = [
  '#4a5568', // Z1 - Recovery (cool gray)
  '#5a7a6b', // Z2 - Fat Burn (muted green-gray)
  '#7a7a5a', // Z3 - Aerobic (warm gray)
  '#8a6a5a', // Z4 - Threshold (muted brown)
  '#7a5a6a', // Z5 - Maximum (muted mauve)
]

// Danish date formatters for charts
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'd. MMM', { locale: da })
}

export function formatDateFull(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'd. MMM yyyy', { locale: da })
}

// Shared tooltip label formatter: shows activity name as title, date as subtitle
// Works with any chart data that has a `name` field in the payload
export function activityTooltipLabel(label: string, payload?: Array<{ payload?: { name?: string } }>) {
  const name = payload?.[0]?.payload?.name
  const date = formatDateFull(label)
  if (name) return `${name}\n${date}`
  return date
}

// Tooltip style object for Recharts
export const tooltipStyle = {
  contentStyle: {
    backgroundColor: chartTheme.tooltip.background,
    border: `1px solid ${chartTheme.tooltip.border}`,
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    padding: '12px 16px',
  },
  labelStyle: {
    color: chartTheme.tooltip.text,
    fontWeight: 600,
    marginBottom: '8px',
    whiteSpace: 'pre-line' as const,
  },
  itemStyle: {
    color: chartTheme.colors.neutral[400],
    padding: '3px 0',
  },
}
