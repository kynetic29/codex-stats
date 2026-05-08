const { getCurrentSession, getTokensInWindow, getEarliestRequestInWindow, getLimitEstimates, getLatestRateLimit } = require('./db')
const { getTimeUntilRollingReset } = require('./limit-estimator')
const { getLiveSnapshotWindowMs, isLiveSnapshotPercentFresh, isLiveSnapshotResetValid } = require('./rate-limit-snapshot')

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000
const BURN_WINDOW_MS = 15 * 60 * 1000

function computeBurnRate(windowMs = BURN_WINDOW_MS) {
  const row = getTokensInWindow(Date.now() - windowMs)
  const tokens = row.total_tokens || 0
  if (tokens === 0) return 0
  return tokens / windowMs
}

function computeEta(currentTokens, limitTokens, burnRatePerMs) {
  if (burnRatePerMs <= 0 || limitTokens <= 0) return null
  const remaining = limitTokens - currentTokens
  if (remaining <= 0) return 0
  return remaining / burnRatePerMs
}

function getSessionStatus() {
  const latestSnapshot = getLatestRateLimit()
  const windowMs = getLiveSnapshotWindowMs(latestSnapshot, 'primary_window_minutes', FIVE_HOURS_MS)
  const windowStart = Date.now() - windowMs
  const totals = getTokensInWindow(windowStart)
  const currentSession = getCurrentSession()
  const earliestInWindow = getEarliestRequestInWindow(windowStart)
  const burnRate = computeBurnRate()

  const planType = latestSnapshot?.plan_type || currentSession?.plan_type || 'unknown'

  if (!currentSession && !latestSnapshot) {
    return {
      active: false,
      sessionId: null,
      planType,
      tokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      reasoningOutputTokens: 0,
      requestCount: 0,
      model: null,
      project: null,
      elapsedMs: 0,
      remainingMs: windowMs,
      windowResetAt: null,
      pct: 0,
      estimatedLimit: 600000,
      confidence: 0.2,
      cost: 0,
      source: 'local',
      eta: null,
      etaApprox: true,
    }
  }

  if (isLiveSnapshotPercentFresh(latestSnapshot, 'primary_pct', 'primary_window_minutes', FIVE_HOURS_MS)) {
    const derivedLimit = latestSnapshot.primary_pct > 0
      ? totals.total_tokens * 100 / latestSnapshot.primary_pct
      : 0
    const hasLiveReset = isLiveSnapshotResetValid(latestSnapshot, 'primary_resets_at')
    const localResetAt = earliestInWindow ? earliestInWindow + windowMs : null

    return {
      active: currentSession ? currentSession.is_active === 1 : false,
      sessionId: currentSession?.session_id || latestSnapshot.session_id,
      planType,
      tokens: totals.total_tokens,
      inputTokens: totals.input_tokens,
      outputTokens: totals.output_tokens,
      cachedInputTokens: totals.cached_input_tokens,
      reasoningOutputTokens: totals.reasoning_output_tokens,
      requestCount: totals.request_count,
      model: currentSession?.model || latestSnapshot.model || null,
      project: currentSession?.project || latestSnapshot.project || null,
      startedAt: earliestInWindow,
      lastRequestAt: currentSession?.last_request_at || latestSnapshot.timestamp,
      elapsedMs: earliestInWindow ? Date.now() - earliestInWindow : 0,
      remainingMs: hasLiveReset ? Math.max(0, latestSnapshot.primary_resets_at - Date.now()) : getTimeUntilRollingReset(windowMs),
      windowResetAt: hasLiveReset ? latestSnapshot.primary_resets_at : localResetAt,
      pct: latestSnapshot.primary_pct,
      estimatedLimit: derivedLimit || null,
      confidence: 1,
      cost: 0,
      source: 'codex-live',
      eta: computeEta(totals.total_tokens, derivedLimit, burnRate),
      etaApprox: false,
    }
  }

  const estimate = getLimitEstimates().find((row) => row.type === 'session' && row.model === 'all')
    || { estimated_limit: 600000, confidence: 0.2 }

  return {
    active: currentSession ? currentSession.is_active === 1 : false,
    sessionId: currentSession?.session_id || null,
    planType,
    tokens: totals.total_tokens,
    inputTokens: totals.input_tokens,
    outputTokens: totals.output_tokens,
    cachedInputTokens: totals.cached_input_tokens,
    reasoningOutputTokens: totals.reasoning_output_tokens,
    requestCount: totals.request_count,
    model: currentSession?.model || null,
    project: currentSession?.project || null,
    startedAt: earliestInWindow,
    lastRequestAt: currentSession?.last_request_at || null,
    elapsedMs: earliestInWindow ? Date.now() - earliestInWindow : 0,
    remainingMs: getTimeUntilRollingReset(windowMs),
    windowResetAt: earliestInWindow ? earliestInWindow + windowMs : null,
    pct: estimate.estimated_limit > 0 ? Math.min(100, (totals.total_tokens / estimate.estimated_limit) * 100) : 0,
    estimatedLimit: estimate.estimated_limit,
    confidence: estimate.confidence,
    cost: 0,
    source: 'local',
    eta: computeEta(totals.total_tokens, estimate.estimated_limit, burnRate),
    etaApprox: true,
  }
}

module.exports = {
  getSessionStatus,
  computeBurnRate,
  computeEta,
}
