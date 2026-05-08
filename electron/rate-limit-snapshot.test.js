import { describe, expect, it } from 'vitest'

const { getLiveSnapshotWindowMs, isLiveSnapshotFresh } = require('./rate-limit-snapshot')

describe('rate-limit snapshot freshness', () => {
  it('uses the snapshot window length when present', () => {
    expect(getLiveSnapshotWindowMs({ primary_window_minutes: 90 }, 'primary_window_minutes', 300 * 60 * 1000)).toBe(90 * 60 * 1000)
  })

  it('falls back to the default window length when the snapshot omits it', () => {
    expect(getLiveSnapshotWindowMs({}, 'primary_window_minutes', 300 * 60 * 1000)).toBe(300 * 60 * 1000)
  })

  it('rejects expired or stale live snapshots', () => {
    const now = Date.UTC(2026, 3, 25, 11, 0, 0)

    expect(isLiveSnapshotFresh({
      timestamp: now - (6 * 60 * 60 * 1000),
      primary_pct: 61,
      primary_resets_at: now + (30 * 60 * 1000),
      primary_window_minutes: 300,
    }, 'primary_pct', 'primary_resets_at', 'primary_window_minutes', 300 * 60 * 1000, now)).toBe(false)

    expect(isLiveSnapshotFresh({
      timestamp: now - (10 * 60 * 1000),
      primary_pct: 61,
      primary_resets_at: now - 1,
      primary_window_minutes: 300,
    }, 'primary_pct', 'primary_resets_at', 'primary_window_minutes', 300 * 60 * 1000, now)).toBe(false)
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
