const path = require('path')
const { app } = require('electron')

let db = null
let stmts = null

function getDb() {
  if (db) return db
  const Database = require('better-sqlite3')
  const dbPath = path.join(app.getPath('userData'), 'codex-stats.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  migrate(db)
  return db
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      request_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      thread_id TEXT,
      thread_name TEXT,
      project TEXT,
      model TEXT,
      timestamp INTEGER NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cached_input_tokens INTEGER DEFAULT 0,
      reasoning_output_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      primary_pct REAL,
      primary_window_minutes INTEGER,
      primary_resets_at INTEGER,
      secondary_pct REAL,
      secondary_window_minutes INTEGER,
      secondary_resets_at INTEGER,
      plan_type TEXT,
      source TEXT DEFAULT 'codex-session'
    );

    CREATE INDEX IF NOT EXISTS idx_requests_session ON requests(session_id);
    CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      thread_id TEXT,
      thread_name TEXT,
      project TEXT,
      model TEXT,
      plan_type TEXT,
      first_request_at INTEGER,
      last_request_at INTEGER,
      request_count INTEGER DEFAULT 0,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      total_cached_input_tokens INTEGER DEFAULT 0,
      total_reasoning_output_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      total_cost_usd REAL DEFAULT 0,
      is_active INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS limit_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL,
      model TEXT,
      tokens_at_hit INTEGER NOT NULL,
      source TEXT DEFAULT 'manual'
    );

    CREATE TABLE IF NOT EXISTS limit_estimates (
      type TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'all',
      estimated_limit INTEGER NOT NULL,
      confidence REAL DEFAULT 0.1,
      observation_count INTEGER DEFAULT 0,
      last_updated INTEGER,
      PRIMARY KEY (type, model)
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS scan_positions (
      file_path TEXT PRIMARY KEY,
      last_byte_offset INTEGER DEFAULT 0,
      last_scan_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS api_costs (
      bucket_date TEXT PRIMARY KEY,
      amount_usd REAL DEFAULT 0,
      payload_json TEXT,
      updated_at INTEGER
    );
  `)

  const count = database.prepare('SELECT COUNT(*) as n FROM limit_estimates').get()
  if (count.n === 0) {
    const now = Date.now()
    const seed = database.prepare(`
      INSERT OR IGNORE INTO limit_estimates (type, model, estimated_limit, confidence, observation_count, last_updated)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    seed.run('session', 'all', 600000, 0.2, 0, now)
    seed.run('weekly', 'all', 6000000, 0.2, 0, now)
  }
}

function getStmts() {
  if (stmts) return stmts
  const d = getDb()
  stmts = {
    upsertRequest: d.prepare(`
      INSERT INTO requests (
        request_id, session_id, thread_id, thread_name, project, model, timestamp,
        input_tokens, output_tokens, cached_input_tokens, reasoning_output_tokens, total_tokens,
        cost_usd, primary_pct, primary_window_minutes, primary_resets_at,
        secondary_pct, secondary_window_minutes, secondary_resets_at,
        plan_type, source
      )
      VALUES (
        @request_id, @session_id, @thread_id, @thread_name, @project, @model, @timestamp,
        @input_tokens, @output_tokens, @cached_input_tokens, @reasoning_output_tokens, @total_tokens,
        @cost_usd, @primary_pct, @primary_window_minutes, @primary_resets_at,
        @secondary_pct, @secondary_window_minutes, @secondary_resets_at,
        @plan_type, @source
      )
      ON CONFLICT(request_id) DO UPDATE SET
        thread_id = COALESCE(excluded.thread_id, requests.thread_id),
        thread_name = COALESCE(excluded.thread_name, requests.thread_name),
        project = COALESCE(excluded.project, requests.project),
        model = COALESCE(excluded.model, requests.model),
        input_tokens = excluded.input_tokens,
        output_tokens = excluded.output_tokens,
        cached_input_tokens = excluded.cached_input_tokens,
        reasoning_output_tokens = excluded.reasoning_output_tokens,
        total_tokens = excluded.total_tokens,
        cost_usd = excluded.cost_usd,
        primary_pct = COALESCE(excluded.primary_pct, requests.primary_pct),
        primary_window_minutes = COALESCE(excluded.primary_window_minutes, requests.primary_window_minutes),
        primary_resets_at = COALESCE(excluded.primary_resets_at, requests.primary_resets_at),
        secondary_pct = COALESCE(excluded.secondary_pct, requests.secondary_pct),
        secondary_window_minutes = COALESCE(excluded.secondary_window_minutes, requests.secondary_window_minutes),
        secondary_resets_at = COALESCE(excluded.secondary_resets_at, requests.secondary_resets_at),
        plan_type = COALESCE(excluded.plan_type, requests.plan_type),
        source = excluded.source
    `),

    refreshSession: d.prepare(`
      INSERT INTO sessions (
        session_id, thread_id, thread_name, project, model, plan_type,
        first_request_at, last_request_at, request_count,
        total_input_tokens, total_output_tokens, total_cached_input_tokens,
        total_reasoning_output_tokens, total_tokens, total_cost_usd, is_active
      )
      SELECT
        session_id,
        MAX(thread_id) as thread_id,
        MAX(thread_name) as thread_name,
        MAX(project) as project,
        MAX(model) as model,
        MAX(plan_type) as plan_type,
        MIN(timestamp) as first_request_at,
        MAX(timestamp) as last_request_at,
        COUNT(*) as request_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cached_input_tokens) as total_cached_input_tokens,
        SUM(reasoning_output_tokens) as total_reasoning_output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(cost_usd) as total_cost_usd,
        CASE WHEN (? - MAX(timestamp)) < 300000 THEN 1 ELSE 0 END as is_active
      FROM requests
      WHERE session_id = ?
      GROUP BY session_id
      ON CONFLICT(session_id) DO UPDATE SET
        thread_id = excluded.thread_id,
        thread_name = excluded.thread_name,
        project = excluded.project,
        model = excluded.model,
        plan_type = excluded.plan_type,
        first_request_at = excluded.first_request_at,
        last_request_at = excluded.last_request_at,
        request_count = excluded.request_count,
        total_input_tokens = excluded.total_input_tokens,
        total_output_tokens = excluded.total_output_tokens,
        total_cached_input_tokens = excluded.total_cached_input_tokens,
        total_reasoning_output_tokens = excluded.total_reasoning_output_tokens,
        total_tokens = excluded.total_tokens,
        total_cost_usd = excluded.total_cost_usd,
        is_active = excluded.is_active
    `),

    getSessions: d.prepare(`SELECT * FROM sessions ORDER BY last_request_at DESC LIMIT ?`),
    getSessionsSince: d.prepare(`SELECT * FROM sessions WHERE last_request_at >= ? ORDER BY last_request_at DESC`),

    getTokensInWindow: d.prepare(`
      SELECT
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cached_input_tokens), 0) as cached_input_tokens,
        COALESCE(SUM(reasoning_output_tokens), 0) as reasoning_output_tokens,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COUNT(*) as request_count,
        COUNT(DISTINCT session_id) as session_count
      FROM requests
      WHERE timestamp >= ?
    `),

    getCurrentSession: d.prepare(`SELECT * FROM sessions ORDER BY last_request_at DESC LIMIT 1`),
    getEarliestRequestInWindow: d.prepare(`SELECT MIN(timestamp) as earliest FROM requests WHERE timestamp >= ?`),
    getRequestCountToday: d.prepare(`SELECT COUNT(*) as n FROM requests WHERE timestamp >= ?`),

    getDailyBreakdown: d.prepare(`
      SELECT
        CAST(timestamp / 86400000 AS INTEGER) as day_bucket,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cached_input_tokens) as cached_input_tokens,
        SUM(reasoning_output_tokens) as reasoning_output_tokens,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as request_count,
        model
      FROM requests
      WHERE timestamp >= ?
      GROUP BY day_bucket, model
      ORDER BY day_bucket
    `),

    getLimitEstimates: d.prepare(`SELECT * FROM limit_estimates`),
    upsertLimitEstimate: d.prepare(`
      INSERT INTO limit_estimates (type, model, estimated_limit, confidence, observation_count, last_updated)
      VALUES (@type, @model, @estimated_limit, @confidence, @observation_count, @last_updated)
      ON CONFLICT(type, model) DO UPDATE SET
        estimated_limit = excluded.estimated_limit,
        confidence = excluded.confidence,
        observation_count = excluded.observation_count,
        last_updated = excluded.last_updated
    `),
    insertLimitObservation: d.prepare(`
      INSERT INTO limit_observations (timestamp, type, model, tokens_at_hit, source)
      VALUES (?, ?, ?, ?, ?)
    `),
    getLimitObservations: d.prepare(`SELECT * FROM limit_observations ORDER BY timestamp DESC LIMIT ?`),

    getScanPosition: d.prepare(`SELECT last_byte_offset FROM scan_positions WHERE file_path = ?`),
    upsertScanPosition: d.prepare(`
      INSERT INTO scan_positions (file_path, last_byte_offset, last_scan_at)
      VALUES (?, ?, ?)
      ON CONFLICT(file_path) DO UPDATE SET
        last_byte_offset = excluded.last_byte_offset,
        last_scan_at = excluded.last_scan_at
    `),

    getConfig: d.prepare(`SELECT value FROM config WHERE key = ?`),
    setConfig: d.prepare(`
      INSERT INTO config (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `),
    deleteConfig: d.prepare(`DELETE FROM config WHERE key = ?`),
    getAllConfig: d.prepare(`SELECT key, value FROM config`),

    getDistinctSessionIds: d.prepare(`SELECT DISTINCT session_id FROM requests`),
    getRequestsBySessionId: d.prepare(`SELECT * FROM requests WHERE session_id = ? ORDER BY timestamp ASC`),
    pruneOldRequests: d.prepare(`DELETE FROM requests WHERE timestamp < ?`),

    getModelBreakdown: d.prepare(`
      SELECT
        COALESCE(model, 'unknown') as model,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cached_input_tokens), 0) as cached_input_tokens,
        COALESCE(SUM(reasoning_output_tokens), 0) as reasoning_output_tokens,
        COUNT(*) as requests,
        COALESCE(SUM(cost_usd), 0) as cost
      FROM requests
      WHERE timestamp >= ?
      GROUP BY COALESCE(model, 'unknown')
      ORDER BY tokens DESC
    `),

    getLatestRateLimit: d.prepare(`
      SELECT *
      FROM requests
      WHERE primary_pct IS NOT NULL OR secondary_pct IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 1
    `),

    upsertApiCost: d.prepare(`
      INSERT INTO api_costs (bucket_date, amount_usd, payload_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(bucket_date) DO UPDATE SET
        amount_usd = excluded.amount_usd,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `),
    getApiCosts: d.prepare(`
      SELECT bucket_date, amount_usd, payload_json, updated_at
      FROM api_costs
      ORDER BY bucket_date DESC
      LIMIT ?
    `),
  }
  return stmts
}

function insertRequest(data) {
  getStmts().upsertRequest.run(data)
}

function insertRequests(batch) {
  const tx = getDb().transaction((items) => {
    const s = getStmts()
    for (const item of items) s.upsertRequest.run(item)
  })
  tx(batch)
}

function refreshSession(sessionId) {
  getStmts().refreshSession.run(Date.now(), sessionId)
}

function refreshAllSessions() {
  const ids = getStmts().getDistinctSessionIds.all()
  const now = Date.now()
  const tx = getDb().transaction(() => {
    const s = getStmts()
    for (const { session_id } of ids) s.refreshSession.run(now, session_id)
  })
  tx()
}

function getSessions(limit = 100) {
  return getStmts().getSessions.all(limit)
}

function getSessionsSince(timestamp) {
  return getStmts().getSessionsSince.all(timestamp)
}

function getTokensInWindow(windowStartTimestamp) {
  return getStmts().getTokensInWindow.get(windowStartTimestamp)
}

function getCurrentSession() {
  return getStmts().getCurrentSession.get()
}

function getEarliestRequestInWindow(windowStartTimestamp) {
  const row = getStmts().getEarliestRequestInWindow.get(windowStartTimestamp)
  return row ? row.earliest : null
}

function getRequestCountToday(todayStartTimestamp) {
  return getStmts().getRequestCountToday.get(todayStartTimestamp).n
}

function getDailyBreakdown(sinceTimestamp) {
  return getStmts().getDailyBreakdown.all(sinceTimestamp)
}

function getRequestsBySessionId(sessionId) {
  return getStmts().getRequestsBySessionId.all(sessionId)
}

function getLimitEstimates() {
  return getStmts().getLimitEstimates.all()
}

function upsertLimitEstimate(data) {
  getStmts().upsertLimitEstimate.run(data)
}

function insertLimitObservation(timestamp, type, model, tokens, source) {
  getStmts().insertLimitObservation.run(timestamp, type, model, tokens, source)
}

function getLimitObservations(limit = 50) {
  return getStmts().getLimitObservations.all(limit)
}

function getScanPosition(filePath) {
  const row = getStmts().getScanPosition.get(filePath)
  return row ? row.last_byte_offset : 0
}

function setScanPosition(filePath, offset) {
  getStmts().upsertScanPosition.run(filePath, offset, Date.now())
}

function getConfigValue(key) {
  const row = getStmts().getConfig.get(key)
  return row ? JSON.parse(row.value) : null
}

function setConfigValue(key, value) {
  getStmts().setConfig.run(key, JSON.stringify(value))
}

function deleteConfigValue(key) {
  getStmts().deleteConfig.run(key)
}

function getAllConfig() {
  const rows = getStmts().getAllConfig.all()
  const config = {}
  for (const { key, value } of rows) config[key] = JSON.parse(value)
  return config
}

function getLatestRateLimit() {
  return getStmts().getLatestRateLimit.get()
}

function upsertApiCost(bucketDate, amountUsd, payload) {
  getStmts().upsertApiCost.run(bucketDate, amountUsd, JSON.stringify(payload), Date.now())
}

function getApiCosts(limit = 35) {
  return getStmts().getApiCosts.all(limit).map((row) => ({
    ...row,
    payload: row.payload_json ? JSON.parse(row.payload_json) : null,
  }))
}

function getModelBreakdown(windowStartTimestamp) {
  return getStmts().getModelBreakdown.all(windowStartTimestamp)
}

function pruneOldRequests(olderThanMs) {
  getStmts().pruneOldRequests.run(Date.now() - olderThanMs)
}

function close() {
  if (db) {
    db.close()
    db = null
    stmts = null
  }
}

module.exports = {
  getDb,
  insertRequest,
  insertRequests,
  refreshSession,
  refreshAllSessions,
  getSessions,
  getSessionsSince,
  getTokensInWindow,
  getCurrentSession,
  getEarliestRequestInWindow,
  getRequestCountToday,
  getDailyBreakdown,
  getRequestsBySessionId,
  getLimitEstimates,
  upsertLimitEstimate,
  insertLimitObservation,
  getLimitObservations,
  getScanPosition,
  setScanPosition,
  getConfigValue,
  setConfigValue,
  deleteConfigValue,
  getAllConfig,
  getLatestRateLimit,
  upsertApiCost,
  getApiCosts,
  getModelBreakdown,
  pruneOldRequests,
  close,
}
