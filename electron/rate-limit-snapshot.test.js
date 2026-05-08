import { describe, expect, it } from 'vitest'

const {
  getLiveSnapshotWindowMs,
  isLiveSnapshotFresh,
  isLiveSnapshotPercentFresh,
  isLiveSnapshotResetValid,
} = require('./rate-limit-snapshot')

describe('rate-limit snapshot freshness', () => {
  it('uses the snapshot window length when present', () => {
    expect(getLiveSnapshotWindowMs({ primary_window_minutes: 90 }, 'primary_window_minutes', 300 * 60 * 1000)).toBe(90 * 60 * 1000)
  })

  it('falls back to the default window length when the snapshot omits it', () => {
    expect(getLiveSnapshotWindowMs({}, 'primary_window_minutes', 300 * 60 * 1000)).toBe(300 * 60 * 1000)
  })

  it('rejects stale live percentages', () => {
    const now = Date.UTC(2026, 3, 25, 11, 0, 0)

    expect(isLiveSnapshotPercentFresh({
      timestamp: now - (6 * 60 * 60 * 1000),
      primary_pct: 61,
      primary_resets_at: now + (30 * 60 * 1000),
      primary_window_minutes: 300,
    }, 'primary_pct', 'primary_window_minutes', 300 * 60 * 1000, now)).toBe(false)
  })

  it('treats reset validity separately from percentage freshness', () => {
    const now = Date.UTC(2026, 3, 25, 11, 0, 0)

    const snapshot = {
      timestamp: now - (10 * 60 * 1000),
      primary_pct: 61,
      primary_resets_at: now - 1,
      primary_window_minutes: 300,
    }

    expect(isLiveSnapshotPercentFresh(snapshot, 'primary_pct', 'primary_window_minutes', 300 * 60 * 1000, now)).toBe(true)
    expect(isLiveSnapshotResetValid(snapshot, 'primary_resets_at', now)).toBe(false)
    expect(isLiveSnapshotFresh(snapshot, 'primary_pct', 'primary_resets_at', 'primary_window_minutes', 300 * 60 * 1000, now)).toBe(false)
  })

  it('accepts fresh live snapshots inside the current window', () => {
    const now = Date.UTC(2026, 3, 25, 11, 0, 0)

    expect(isLiveSnapshotFresh({
      timestamp: now - (10 * 60 * 1000),
      primary_pct: 2,
      primary_resets_at: now + (4 * 60 * 60 * 1000),
      primary_window_minutes: 300,
    }, 'primary_pct', 'primary_resets_at', 'primary_window_minutes', 300 * 60 * 1000, now)).toBe(true)
  })
})
