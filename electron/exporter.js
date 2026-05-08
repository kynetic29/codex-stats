const { dialog } = require('electron')
const fs = require('fs')
const db = require('./db')

function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const stringified = String(value)
  if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
    return `"${stringified.replace(/"/g, '""')}"`
  }
  return stringified
}

function rowsToCsv(rows) {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
  ].join('\r\n')
}

function getSessionsData() {
  return db.getSessions(10000).map((row) => ({
    session_id: row.session_id,
    thread_id: row.thread_id,
    thread_name: row.thread_name,
    project: row.project,
    model: row.model,
    plan_type: row.plan_type,
    first_request_at: row.first_request_at ? new Date(row.first_request_at).toISOString() : '',
    last_request_at: row.last_request_at ? new Date(row.last_request_at).toISOString() : '',
    request_count: row.request_count,
    total_tokens: row.total_tokens,
    total_input_tokens: row.total_input_tokens,
    total_output_tokens: row.total_output_tokens,
    total_cached_input_tokens: row.total_cached_input_tokens,
    total_reasoning_output_tokens: row.total_reasoning_output_tokens,
    total_cost_usd: row.total_cost_usd,
    is_active: row.is_active ? 1 : 0,
  }))
}

function getRequestsData() {
  const database = db.getDb()
  return database.prepare(`
    SELECT
      request_id, session_id, thread_id, thread_name, project, model, plan_type,
      timestamp, input_tokens, output_tokens, cached_input_tokens,
      reasoning_output_tokens, total_tokens, cost_usd,
      primary_pct, primary_window_minutes, primary_resets_at,
      secondary_pct, secondary_window_minutes, secondary_resets_at,
      source
    FROM requests
    ORDER BY timestamp ASC
  `).all().map((row) => ({
    ...row,
    timestamp_iso: row.timestamp ? new Date(row.timestamp).toISOString() : '',
  }))
}

function getAllData() {
  return {
    sessions: getSessionsData(),
    requests: getRequestsData(),
    api_costs: db.getApiCosts(180),
  }
}

async function exportData({ format, scope }) {
  const rows = scope === 'sessions'
    ? getSessionsData()
    : scope === 'requests'
      ? getRequestsData()
      : getAllData()

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const extension = format === 'csv' ? 'csv' : 'json'
  const defaultName = `codex-stats-${scope}-${timestamp}.${extension}`

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export CodexStats Data',
    defaultPath: defaultName,
    filters: extension === 'csv'
      ? [{ name: 'CSV Files', extensions: ['csv'] }]
      : [{ name: 'JSON Files', extensions: ['json'] }],
  })

  if (canceled || !filePath) return { ok: false, reason: 'canceled' }

  try {
    const content = format === 'json'
      ? JSON.stringify(rows, null, 2)
      : rowsToCsv(scope === 'all' ? getSessionsData() : rows)
    fs.writeFileSync(filePath, content, 'utf8')
    return { ok: true, filePath }
  } catch (error) {
    return { ok: false, reason: error.message }
  }
}

module.exports = { exportData }
