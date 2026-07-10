import { describe, it, expect } from 'vitest'
import {
  INTERVALS_ID_OFFSET,
  isIntervalsActivityId,
  toIntervalsApiId,
  fromIntervalsApiId,
  mapIntervalsActivity,
  dedupeAgainstExisting,
  encodePolyline,
  computeSplitsFromStreams,
  type IntervalsActivity,
} from '~/lib/intervals'
import type { StravaActivity } from '~/lib/strava'

function makeIntervalsActivity(overrides: Partial<IntervalsActivity> = {}): IntervalsActivity {
  return {
    id: 'i164403937',
    name: 'Morning Ride',
    type: 'Ride',
    sub_type: null,
    start_date: '2026-07-09T09:15:02Z',
    start_date_local: '2026-07-09T11:15:02',
    distance: 44380.99,
    moving_time: 5771,
    elapsed_time: 5952,
    total_elevation_gain: 280,
    average_speed: 7.678,
    max_speed: 15.34,
    icu_average_watts: null,
    icu_weighted_avg_watts: null,
    icu_joules: null,
    device_watts: null,
    average_heartrate: 145,
    max_heartrate: 169,
    average_cadence: 79.77,
    icu_training_load: 102,
    calories: 1127,
    device_name: 'Garmin Edge 830',
    description: null,
    average_temp: null,
    perceived_exertion: null,
    icu_rpe: null,
    trainer: null,
    strava_id: null,
    stream_types: ['time', 'heartrate', 'distance'],
    ...overrides,
  }
}

function makeStravaActivity(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 19113368753,
    name: 'Løb om aftenen',
    type: 'Run',
    sport_type: 'Run',
    start_date: '2026-06-29T17:12:56Z',
    start_date_local: '2026-06-29T19:12:56Z',
    distance: 5000,
    moving_time: 1500,
    elapsed_time: 1550,
    total_elevation_gain: 30,
    average_speed: 3.3,
    max_speed: 4.1,
    ...overrides,
  }
}

describe('intervals id mapping', () => {
  it('round-trips an intervals api id', () => {
    const id = fromIntervalsApiId('i164403937')
    expect(id).toBe(INTERVALS_ID_OFFSET + 164403937)
    expect(toIntervalsApiId(id)).toBe('i164403937')
  })

  it('classifies ids by source', () => {
    expect(isIntervalsActivityId(fromIntervalsApiId('i164403937'))).toBe(true)
    expect(isIntervalsActivityId(19113368753)).toBe(false) // recent Strava id
    expect(isIntervalsActivityId(563166268)).toBe(false) // 2014-era Strava id
  })
})

describe('mapIntervalsActivity', () => {
  it('maps core fields onto the StravaActivity shape', () => {
    const mapped = mapIntervalsActivity(makeIntervalsActivity())
    expect(mapped.id).toBe(INTERVALS_ID_OFFSET + 164403937)
    expect(mapped.type).toBe('Ride')
    expect(mapped.start_date).toBe('2026-07-09T09:15:02Z')
    expect(mapped.distance).toBeCloseTo(44380.99)
    expect(mapped.average_heartrate).toBe(145)
    expect(mapped.suffer_score).toBe(102)
    expect(mapped.average_watts).toBeUndefined()
  })

  it('prefers the strava id when intervals knows it', () => {
    const mapped = mapIntervalsActivity(makeIntervalsActivity({ strava_id: '19113368753' }))
    expect(mapped.id).toBe(19113368753)
  })

  it('converts joules to kilojoules', () => {
    const mapped = mapIntervalsActivity(makeIntervalsActivity({ icu_joules: 479146 }))
    expect(mapped.kilojoules).toBeCloseTo(479.146)
  })
})

describe('dedupeAgainstExisting', () => {
  it('drops a fetched activity that matches an existing one by type and start time', () => {
    const existing = [makeStravaActivity()] // Strava-cached run, 17:12:56Z
    const fetched = [
      mapIntervalsActivity(
        makeIntervalsActivity({
          id: 'i164403943',
          type: 'Run',
          start_date: '2026-06-29T17:12:56Z', // same run, Garmin-sourced
        })
      ),
    ]
    expect(dedupeAgainstExisting(fetched, existing)).toHaveLength(0)
  })

  it('keeps activities with no time collision', () => {
    const existing = [makeStravaActivity()]
    const fetched = [
      mapIntervalsActivity(
        makeIntervalsActivity({ id: 'i164403999', type: 'Run', start_date: '2026-07-01T18:17:21Z' })
      ),
    ]
    expect(dedupeAgainstExisting(fetched, existing)).toHaveLength(1)
  })

  it('keeps same-type activities outside the duplicate window', () => {
    const existing = [makeStravaActivity()]
    const fetched = [
      mapIntervalsActivity(
        makeIntervalsActivity({ id: 'i164403999', type: 'Run', start_date: '2026-06-29T17:20:00Z' })
      ),
    ]
    expect(dedupeAgainstExisting(fetched, existing)).toHaveLength(1)
  })

  it('always keeps re-fetches of an already-known id so they upsert in place', () => {
    const known = mapIntervalsActivity(makeIntervalsActivity())
    expect(dedupeAgainstExisting([known], [known])).toHaveLength(1)
  })

  it('does not collide activities of different types at the same time', () => {
    const existing = [makeStravaActivity({ type: 'Ride' })]
    const fetched = [
      mapIntervalsActivity(
        makeIntervalsActivity({ id: 'i164403999', type: 'Run', start_date: '2026-06-29T17:12:56Z' })
      ),
    ]
    expect(dedupeAgainstExisting(fetched, existing)).toHaveLength(1)
  })
})

describe('encodePolyline', () => {
  it('encodes the canonical Google example', () => {
    const points: Array<[number, number]> = [
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]
    expect(encodePolyline(points)).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
  })

  it('returns an empty string for no points', () => {
    expect(encodePolyline([])).toBe('')
  })
})

describe('computeSplitsFromStreams', () => {
  it('produces one split per km plus the final partial', () => {
    // 2.5 km at exactly 5 m/s (200s per km)
    const n = 501
    const time = Array.from({ length: n }, (_, i) => i)
    const distance = Array.from({ length: n }, (_, i) => i * 5)

    const splits = computeSplitsFromStreams(time, distance)
    expect(splits).toHaveLength(3)
    expect(splits[0].split).toBe(1)
    expect(splits[0].distance).toBeGreaterThanOrEqual(1000)
    expect(splits[0].average_speed).toBeCloseTo(5, 0)
    expect(splits[2].distance).toBeLessThan(1000) // partial
  })

  it('averages heart rate per split when provided', () => {
    const n = 201
    const time = Array.from({ length: n }, (_, i) => i)
    const distance = Array.from({ length: n }, (_, i) => i * 5)
    const hr = Array.from({ length: n }, () => 150)

    const splits = computeSplitsFromStreams(time, distance, hr)
    expect(splits[0].average_heartrate).toBeCloseTo(150)
  })

  it('returns empty for missing streams', () => {
    expect(computeSplitsFromStreams([], [])).toEqual([])
  })
})
