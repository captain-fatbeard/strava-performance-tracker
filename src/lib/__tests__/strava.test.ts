import { describe, it, expect } from 'vitest'
import {
  getStravaAuthUrl,
  metersToKm,
  metersToMiles,
  secondsToHMS,
  calculatePace,
  formatPace,
  computePowerPerKm,
} from '~/lib/strava'

// ===================================================================
// Unit conversions
// ===================================================================

describe('metersToKm', () => {
  it('converts meters to kilometers', () => {
    expect(metersToKm(1000)).toBe(1)
    expect(metersToKm(42195)).toBe(42.195)
    expect(metersToKm(0)).toBe(0)
  })
})

describe('metersToMiles', () => {
  it('converts meters to miles', () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 5)
    expect(metersToMiles(0)).toBe(0)
  })
})

// ===================================================================
// secondsToHMS
// ===================================================================

describe('secondsToHMS', () => {
  it('formats seconds only', () => {
    expect(secondsToHMS(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(secondsToHMS(125)).toBe('2:05')
  })

  it('formats hours, minutes, and seconds', () => {
    expect(secondsToHMS(3661)).toBe('1:01:01')
  })

  it('pads minutes and seconds with leading zeros when hours present', () => {
    expect(secondsToHMS(3600)).toBe('1:00:00')
  })

  it('handles zero', () => {
    expect(secondsToHMS(0)).toBe('0:00')
  })
})

// ===================================================================
// calculatePace / formatPace
// ===================================================================

describe('calculatePace', () => {
  it('returns seconds per km', () => {
    // 10km in 3000s = 300 s/km
    expect(calculatePace(10000, 3000)).toBe(300)
  })

  it('returns 0 for zero distance', () => {
    expect(calculatePace(0, 3000)).toBe(0)
  })
})

describe('formatPace', () => {
  it('formats pace as min:sec/km', () => {
    expect(formatPace(300)).toBe('5:00/km')
    expect(formatPace(323)).toBe('5:23/km')
  })
})

// ===================================================================
// computePowerPerKm
// ===================================================================

describe('computePowerPerKm', () => {
  it('returns empty for empty streams', () => {
    expect(computePowerPerKm([], [])).toEqual([])
    expect(computePowerPerKm([100], [])).toEqual([])
    expect(computePowerPerKm([], [200])).toEqual([])
  })

  it('computes average power per km boundary', () => {
    // Simulate 2 km: points at 0, 500, 1000, 1500, 2000
    const distance = [0, 500, 1000, 1500, 2000]
    const watts = [200, 200, 200, 300, 300]
    // Km 1 boundary at index 2 (dist >= 1000): avg of [200, 200, 200] = 200
    // Remaining: [300, 300] → avg = 300 (partial km)
    const result = computePowerPerKm(distance, watts)
    expect(result).toEqual([200, 300])
  })

  it('handles null/zero watts by excluding from average', () => {
    const distance = [0, 500, 1000]
    const watts = [200, 0, 200]
    // Only watts > 0 count: index 0 (200) before boundary
    // At index 2, dist >= 1000: accumulated watts = [200, 200(from i=2 before push)]
    // Actually: i=0: 200 counted. i=1: 0 skipped. i=2: 200 counted. dist>=1000 → (200+200)/2=200
    const result = computePowerPerKm(distance, watts)
    expect(result).toEqual([200])
  })

  it('pushes final partial km', () => {
    const distance = [0, 500, 800]
    const watts = [200, 200, 200]
    // Never reaches 1000m boundary, so only final partial
    expect(computePowerPerKm(distance, watts)).toEqual([200])
  })
})

// ===================================================================
// getStravaAuthUrl
// ===================================================================

describe('getStravaAuthUrl', () => {
  it('builds correct OAuth URL', () => {
    const url = getStravaAuthUrl('12345', 'http://localhost:3000/callback')
    expect(url).toContain('https://www.strava.com/oauth/authorize')
    expect(url).toContain('client_id=12345')
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback')
    expect(url).toContain('response_type=code')
    expect(url).toContain('scope=read%2Cactivity%3Aread_all%2Cprofile%3Aread_all')
  })
})
