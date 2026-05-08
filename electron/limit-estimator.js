const {
  getTokensInWindow,
  upsertLimitEstimate,
  insertLimitObservation,
  getLimitObservations,
  getEarliestRequestInWindow,
} = require('./db')

const WINDOW_MS = {
  session: 5 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
}

function recordLimitHit(type, source = 'manual') {
  const windowMs = WINDOW_MS[type]
  if (!windowMs) return null

  const now = Date.now()
  const row = getTokensInWindow(now - windowMs)
  const tokens = row.total_tokens || 0
  insertLimitObservation(now, type, 'all', tokens, source)
  recalcEstimate(type, 'all')
  return { type, tokens, model: 'all' }
}

function recalcEstimate(type, model) {
  const observations = getLimitObservations(200)
    .filter((row) => row.type === type && (model === 'all' || row.model === model))

  if (observations.length === 0) return

  const values = observations.map((row) => row.tokens_at_hit).sort((a, b) => a - b)
  const count = values.length
  const conservativeIndex = Math.max(0, Math.floor(count * 0.1))
  const estimatedLimit = values[conservativeIndex]
  const mean = values.reduce((sum, value) => sum + value, 0) / count
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / count
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1
  const confidence = Math.max(0.1, Math.min(0.95, Math.min(count / 10, 1) * 0.5 + Math.max(0, 1 - cv) * 0.5))

  upsertLimitEstimate({
    type,
    model,
    estimated_limit: estimatedLimit,
    confidence,
    observation_count: count,
    last_updated: Date.now(),
  })
}

function getTimeUntilRollingReset(windowMs) {
  const earliest = getEarliestRequestInWindow(Date.now() - windowMs)
  if (!earliest) return windowMs
  return Math.max(0, earliest + windowMs - Date.now())
}

module.exports = {
  recordLimitHit,
  recalcEstimate,
  getTimeUntilRollingReset,
}
