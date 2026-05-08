const fs = require('fs')
const path = require('path')
const os = require('os')
const {
  insertRequests,
  getScanPosition,
  setScanPosition,
  refreshSession,
  pruneOldRequests,
} = require('./db')

const CODEX_SESSIONS_DIR = path.join(os.homedir(), '.codex', 'sessions')
const SESSION_INDEX_PATH = path.join(os.homedir(), '.codex', 'session_index.jsonl')
const SCAN_INTERVAL = 10000
const REQUEST_RETENTION_MS = 45 * 24 * 60 * 60 * 1000

let scanTimer = null
let watchers = []

function loadThreadNames() {
  const mapping = new Map()
  if (!fs.existsSync(SESSION_INDEX_PATH)) return mapping

  const lines = fs.readFileSync(SESSION_INDEX_PATH, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const row = JSON.parse(line)
      if (row.id && row.thread_name) mapping.set(row.id, row.thread_name)
    } catch {}
  }
  return mapping
}

function findJsonlFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findJsonlFiles(fullPath))
    } else if (entry.name.endsWith('.jsonl')) {
      results.push(fullPath)
    }
  }
  return results
}

function parseJsonlFrom(filePath, fromOffset, threadNames) {
  let stat
  try {
    stat = fs.statSync(filePath)
  } catch {
    return { requests: [], newOffset: fromOffset }
  }

  if (stat.size <= fromOffset) {
    return { requests: [], newOffset: fromOffset }
  }

  const buf = Buffer.alloc(stat.size - fromOffset)
  const fd = fs.openSync(filePath, 'r')
  try {
    fs.readSync(fd, buf, 0, buf.length, fromOffset)
  } finally {
    fs.closeSync(fd)
  }

  const sessionId = path.basename(filePath, '.jsonl')
  const text = buf.toString('utf8')
  const lines = text.split('\n')
  const requests = []

  let threadId = sessionId
  let threadName = threadNames.get(sessionId) || null
  let project = null
  let model = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim()) continue

    let obj
    try {
      obj = JSON.parse(line)
    } catch {
      continue
    }

    if (obj.type === 'session_meta') {
      threadId = obj.payload?.id || threadId
      threadName = threadNames.get(threadId) || threadName
      project = obj.payload?.cwd || project
      model = obj.payload?.model || model
      continue
    }

    if (obj.type === 'turn_context') {
      project = obj.payload?.cwd || project
      model = obj.payload?.model || model
      continue
    }

    if (obj.type !== 'event_msg' || obj.payload?.type !== 'token_count') continue

    const usage = obj.payload?.info?.last_token_usage
    if (!usage) continue

    const rateLimits = obj.payload?.rate_limits || {}
    const timestamp = new Date(obj.timestamp).getTime()
    if (!Number.isFinite(timestamp)) continue

    requests.push({
      request_id: `${sessionId}:${timestamp}:${index}`,
      session_id: sessionId,
      thread_id: threadId,
      thread_name: threadName,
      project,
      model,
      timestamp,
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      cached_input_tokens: usage.cached_input_tokens || 0,
      reasoning_output_tokens: usage.reasoning_output_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      cost_usd: 0,
      primary_pct: rateLimits.primary?.used_percent ?? null,
      primary_window_minutes: rateLimits.primary?.window_minutes ?? null,
      primary_resets_at: rateLimits.primary?.resets_at ? rateLimits.primary.resets_at * 1000 : null,
      secondary_pct: rateLimits.secondary?.used_percent ?? null,
      secondary_window_minutes: rateLimits.secondary?.window_minutes ?? null,
      secondary_resets_at: rateLimits.secondary?.resets_at ? rateLimits.secondary.resets_at * 1000 : null,
      plan_type: rateLimits.plan_type || null,
      source: 'codex-session',
    })
  }

  return { requests, newOffset: stat.size }
}

function scanAll() {
  if (!fs.existsSync(CODEX_SESSIONS_DIR)) return

  const threadNames = loadThreadNames()
  const touchedSessions = new Set()
  const jsonlFiles = findJsonlFiles(CODEX_SESSIONS_DIR)

  for (const filePath of jsonlFiles) {
    const lastOffset = getScanPosition(filePath)
    const { requests, newOffset } = parseJsonlFrom(filePath, lastOffset, threadNames)
    if (requests.length === 0) {
      setScanPosition(filePath, newOffset)
      continue
    }
    insertRequests(requests)
    setScanPosition(filePath, newOffset)
    for (const req of requests) touchedSessions.add(req.session_id)
  }

  for (const sessionId of touchedSessions) refreshSession(sessionId)

  pruneOldRequests(REQUEST_RETENTION_MS)

  if (touchedSessions.size > 0) {
    console.log(`[codex-scanner] Processed ${touchedSessions.size} session(s)`)
  }
}

function startScanner() {
  console.log('[codex-scanner] Starting initial scan...')
  scanAll()
  console.log('[codex-scanner] Initial scan complete')

  if (fs.existsSync(CODEX_SESSIONS_DIR)) {
    try {
      const watcher = fs.watch(CODEX_SESSIONS_DIR, { recursive: true }, () => {})
      watchers.push(watcher)
    } catch (error) {
      console.error('[codex-scanner] Watch error:', error.message)
    }
  }

  scanTimer = setInterval(scanAll, SCAN_INTERVAL)
}

function stopScanner() {
  if (scanTimer) {
    clearInterval(scanTimer)
    scanTimer = null
  }
  for (const watcher of watchers) {
    try { watcher.close() } catch {}
  }
  watchers = []
}

module.exports = { startScanner, stopScanner, scanAll }
