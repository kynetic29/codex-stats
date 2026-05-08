const { getTokensInWindow, getRequestCountToday, getLimitEstimates, getLatestRateLimit } = require('./db')
const { getTimeUntilRollingReset } = require('./limit-estimator')
const { computeBurnRate, computeEta } = require('./session-tracker')
const { getLiveSnapshotWindowMs, isLiveSnapshotFresh } = require('./rate-limit-snapshot')

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function getWeeklyStatus() {
  const latestSnapshot = getLatestRateLimit()
  const windowMs = getLiveSnapshotWindowMs(latestSnapshot, 'secondary_window_minutes', SEVEN_DAYS_MS)
  const windowStart = Date.now() - windowMs
  const totals = getTokensInWindow(windowStart)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const burnRate = computeBurnRate()

  if (isLiveSnapshotFresh(latestSnapshot, 'secondary_pct', 'secondary_resets_at', 'secondary_window_minutes', SEVEN_DAYS_MS)) {
    const derivedLimit = latestSnapshot.secondary_pct > 0
      ? totals.total_tokens * 100 / latestSnapshot.secondary_pct
      : 0

    return {
      tokens: totals.total_tokens,
      inputTokens: totals.input_tokens,
      outputTokens: totals.output_tokens,
      cachedInputTokens: totals.cached_input_tokens,
      reasoningOutputTokens: totals.reasoning_output_tokens,
      cost: 0,
      sessionCount: totals.session_count,
      requestCountWeek: totals.request_count,
      requestCountToday: getRequestCountToday(todayStart.getTime()),
      pct: latestSnapshot.secondary_pct,
      estimatedLimit: derivedLimit || null,
      confidence: 1,
      resetIn: Math.max(0, latestSnapshot.secondary_resets_at - Date.now()),
      weekStart: windowStart,
      source: 'codex-live',
      eta: computeEta(totals.total_tokens, derivedLimit, burnRate),
      etaApprox: false,
    }
  }

  const estimate = getLimitEstimates().find((row) => row.type === 'weekly' && row.model === 'all')
    || { estimated_limit: 6000000, confidence: 0.2 }

  return {
    tokens: totals.total_tokens,
    inputTokens: totals.input_tokens,
    outputTokens: totals.output_tokens,
    cachedInputTokens: totals.cached_input_tokens,
    reasoningOutputTokens: totals.reasoning_output_tokens,
    cost: 0,
    sessionCount: totals.session_count,
    requestCountWeek: totals.request_count,
    requestCountToday: getRequestCountToday(todayStart.getTime()),
    pct: estimate.estimated_limit > 0 ? Math.min(100, (totals.total_tokens / estimate.estimated_limit) * 100) : 0,
    estimatedLimit: estimate.estimated_limit,
    confidence: estimate.confidence,
    resetIn: getTimeUntilRollingReset(windowMs || SEVEN_DAYS_MS),
    weekStart: windowStart,
    source: 'local',
    eta: computeEta(totals.total_tokens, estimate.estimated_limit, burnRate),
    etaApprox: true,
  }
}

module.exports = { getWeeklyStatus }
