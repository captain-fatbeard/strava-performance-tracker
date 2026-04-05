/** Linear regression trend line calculation shared across chart components */

export interface TrendLine {
  slope: number
  startValue: number
  endValue: number
  trend: 'improving' | 'declining' | 'stable'
}

/**
 * Calculate a linear regression trend line from data points.
 * @param values - Array of numeric values (Y axis)
 * @param slopeThreshold - Absolute slope above which the trend is non-stable (default 0.5)
 * @param invertTrend - If true, negative slope = improving (e.g. pace getting faster)
 */
export function calculateTrendLine(
  values: number[],
  slopeThreshold = 0.5,
  invertTrend = false,
): TrendLine | null {
  const n = values.length
  if (n < 2) return null

  const sumX = values.reduce((sum, _, i) => sum + i, 0)
  const sumY = values.reduce((sum, v) => sum + v, 0)
  const sumXY = values.reduce((sum, v, i) => sum + i * v, 0)
  const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  let trend: TrendLine['trend']
  if (invertTrend) {
    trend = slope < -slopeThreshold ? 'improving' : slope > slopeThreshold ? 'declining' : 'stable'
  } else {
    trend = slope > slopeThreshold ? 'improving' : slope < -slopeThreshold ? 'declining' : 'stable'
  }

  return {
    slope,
    startValue: intercept,
    endValue: slope * (n - 1) + intercept,
    trend,
  }
}
