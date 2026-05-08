const { getDb } = require('./db')

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

function weekLabel(ts) {
  const date = new Date(ts)
  return `W${isoWeek(date)} '${String(date.getFullYear()).slice(2)}`
}

function monthLabel(ts) {
  const date = new Date(ts)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function getDailyTrendByModel(days = 30, model = null) {
  const db = getDb()
  const since = Date.now() - days * 24 * 60 * 60 * 1000
  const where = model ? "AND COALESCE(model, 'unknown') = ?" : ''
  const params = model ? [since, model] : [since]
  const rows = db.prepare(`
    SELECT
      CAST(timestamp / 86400000 AS INTEGER) as day_bucket,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cached_input_tokens) as cached_input_tokens,
      SUM(reasoning_output_tokens) as reasoning_output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as cost,
      COUNT(*) as request_count
    FROM requests
    WHERE timestamp >= ? ${where}
    GROUP BY day_bucket
    ORDER BY day_bucket ASC
  `).all(...params)

  return rows.map((row) => {
    const ts = row.day_bucket * 86400000
    return {
      ...row,
      ts,
      label: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  })
}

function getWeekOverWeek(weeks = 8) {
  const db = getDb()
  const since = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000
  const rows = db.prepare(`
    SELECT
      (CAST(timestamp / 86400000 AS INTEGER) -
        ((CAST(timestamp / 86400000 AS INTEGER) + 3) % 7)) * 86400000 as week_start_ms,
      SUM(total_tokens) as total_tokens,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cached_input_tokens) as cached_input_tokens,
      SUM(reasoning_output_tokens) as reasoning_output_tokens,
      SUM(cost_usd) as cost,
      COUNT(*) as request_count,
      COUNT(DISTINCT session_id) as session_count
    FROM requests
    WHERE timestamp >= ?
    GROUP BY week_start_ms
    ORDER BY week_start_ms ASC
  `).all(since)

  return rows.map((row) => ({
    ...row,
    label: weekLabel(row.week_start_ms),
  }))
}

function getMonthlySummary(months = 12) {
  const db = getDb()
  const since = Date.now() - months * 30 * 24 * 60 * 60 * 1000
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', datetime(timestamp / 1000, 'unixepoch')) as month,
      SUM(total_tokens) as total_tokens,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cached_input_tokens) as cached_input_tokens,
      SUM(reasoning_output_tokens) as reasoning_output_tokens,
      SUM(cost_usd) as cost,
      COUNT(*) as request_count,
      COUNT(DISTINCT session_id) as session_count
    FROM requests
    WHERE timestamp >= ?
    GROUP BY month
    ORDER BY month ASC
  `).all(since)

  return rows.map((row) => ({
    ...row,
    label: monthLabel(new Date(`${row.month}-01T12:00:00Z`)),
  }))
}

function getDistinctModels() {
  return getDb().prepare(`
    SELECT DISTINCT COALESCE(model, 'unknown') as model
    FROM requests
    ORDER BY model
  `).all().map((row) => row.model)
}

module.exports = { getDailyTrendByModel, getWeekOverWeek, getMonthlySummary, getDistinctModels }
