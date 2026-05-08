const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron')
const path = require('path')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

let mainWindow = null
let tray = null
let apiCostPollInterval = null
let apiCostStatus = { hasKey: false, state: 'idle', lastSuccessAt: null, error: null }

function openOnboarding() {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 620,
    resizable: false,
    center: true,
    title: 'CodexStats - Setup',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadFile(path.join(__dirname, '../dist/src/onboarding/index.html'))
  mainWindow.on('closed', () => { mainWindow = null })
}

function openDashboard(config) {
  const displays = screen.getAllDisplays()
  const target = displays.find((display) => display.id === config.displayId) || screen.getPrimaryDisplay()

  const win = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    frame: false,
    alwaysOnTop: true,
    kiosk: process.platform === 'win32' || process.platform === 'linux',
    backgroundColor: '#06131a',
    thickFrame: false,
    title: 'CodexStats',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadFile(path.join(__dirname, '../dist/src/dashboard/index.html'))
  win.setMenuBarVisibility(false)
  win.setBackgroundColor('#06131a')

  if (process.platform === 'darwin') win.setSimpleFullScreen(true)
  else win.setFullScreen(true)

  win.on('closed', () => { mainWindow = null })
  mainWindow = win

  const { createTray } = require('./tray')
  tray = createTray(mainWindow, app)
}

function startApiCostPolling(adminApiKey) {
  if (apiCostPollInterval) {
    clearInterval(apiCostPollInterval)
    apiCostPollInterval = null
  }

  if (!adminApiKey) {
    apiCostStatus = { hasKey: false, state: 'idle', lastSuccessAt: null, error: null }
    return
  }

  apiCostStatus = { hasKey: true, state: 'syncing', lastSuccessAt: apiCostStatus.lastSuccessAt, error: null }
  const { fetchCosts } = require('./usage-api')
  const { isRetryableCostError } = require('./usage-api')
  const { upsertApiCost } = require('./db')

  async function poll() {
    try {
      apiCostStatus = { ...apiCostStatus, hasKey: true, state: 'syncing', error: null }
      const buckets = await fetchCosts(adminApiKey, 35)
      for (const bucket of buckets) {
        upsertApiCost(bucket.bucket_date, bucket.amount_usd, bucket.raw)
      }
      apiCostStatus = { hasKey: true, state: 'ready', lastSuccessAt: Date.now(), error: null }
      console.log(`[api-costs] Loaded ${buckets.length} bucket(s)`)
    } catch (error) {
      const retryable = isRetryableCostError(error)
      apiCostStatus = {
        hasKey: true,
        state: apiCostStatus.lastSuccessAt && retryable ? 'ready' : 'error',
        lastSuccessAt: apiCostStatus.lastSuccessAt,
        error: error.message,
      }
      console.error('[api-costs] Poll failed:', error.message)
    }
  }

  poll()
  apiCostPollInterval = setInterval(poll, 15 * 60 * 1000)
}

app.whenReady().then(() => {
  require('./db').getDb()

  const { recalcEstimate } = require('./limit-estimator')
  recalcEstimate('session', 'all')
  recalcEstimate('weekly', 'all')

  const { startScanner } = require('./jsonl-scanner')
  startScanner()

  const { readConfig } = require('./config')
  const config = readConfig()

  if (config?.displayId) {
    startApiCostPolling(config.adminApiKey || null)
    openDashboard(config)
  } else {
    openOnboarding()
  }

  const { setAutoStart, getAutoStart } = require('./autostart')
  const wantAutoStart = (readConfig() || {}).autoStart ?? false
  if (getAutoStart() !== wantAutoStart) setAutoStart(wantAutoStart)

  const { initAutoUpdater } = require('./updater')
  initAutoUpdater()

  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit())
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    require('./config').deleteConfig()
    app.relaunch()
    app.exit(0)
  })
  globalShortcut.register('CommandOrControl+Shift+L', () => {
    const { recordLimitHit } = require('./limit-estimator')
    const result = recordLimitHit('session')
    if (result) console.log(`[main] Recorded session limit hit at ${result.tokens} tokens`)
  })
})

app.on('second-instance', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  require('./db').close()
  require('./jsonl-scanner').stopScanner()
  require('./tray').destroyTray()
})

ipcMain.handle('app:quit', () => app.quit())
ipcMain.handle('app:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()
})

ipcMain.handle('app:set-autostart', (_event, enabled) => {
  const { setAutoStart } = require('./autostart')
  const { readConfig, writeConfig } = require('./config')
  setAutoStart(enabled)
  const existing = readConfig() || {}
  writeConfig({ ...existing, autoStart: enabled })
  return { ok: true }
})

ipcMain.handle('app:get-autostart', () => require('./autostart').getAutoStart())
ipcMain.handle('app:get-version', () => app.getVersion())
ipcMain.handle('update:get-status', () => require('./updater').getLastStatus())
ipcMain.handle('update:install', async () => {
  await require('./updater').checkAndInstall()
  return { ok: true }
})

ipcMain.handle('app:reset-setup', () => {
  require('./config').deleteConfig()
  app.relaunch()
  app.exit(0)
})

ipcMain.handle('data:get-dashboard', () => {
  const { getSessionStatus } = require('./session-tracker')
  const { getWeeklyStatus } = require('./weekly-tracker')
  const { readConfig } = require('./config')
  const db = require('./db')
  const config = readConfig() || {}

  return {
    session: getSessionStatus(),
    weekly: getWeeklyStatus(),
    sessions: db.getSessions(50),
    limits: db.getLimitEstimates(),
    dailyBreakdown: db.getDailyBreakdown(Date.now() - 7 * 24 * 60 * 60 * 1000),
    modelBreakdown: db.getModelBreakdown(Date.now() - 5 * 60 * 60 * 1000),
    apiCosts: db.getApiCosts(35),
    apiCostStatus,
    thresholds: {
      sessionWarnPct: config.sessionWarnPct ?? 60,
      sessionCritPct: config.sessionCritPct ?? 80,
      weeklyWarnPct: config.weeklyWarnPct ?? 60,
      weeklyCritPct: config.weeklyCritPct ?? 80,
    },
  }
})

ipcMain.handle('data:get-sessions', (_event, limit = 100) => require('./db').getSessions(limit))
ipcMain.handle('data:get-session-requests', (_event, sessionId) => require('./db').getRequestsBySessionId(sessionId))

ipcMain.handle('config:get', () => require('./config').readConfig())
ipcMain.handle('config:update', (_event, partial) => {
  const { readConfig, writeConfig } = require('./config')
  const next = { ...(readConfig() || {}), ...partial }
  writeConfig(next)
  if (Object.prototype.hasOwnProperty.call(partial, 'adminApiKey')) {
    startApiCostPolling(next.adminApiKey || null)
  }
  return { ok: true }
})

ipcMain.handle('config:get-displays', () => {
  const primary = screen.getPrimaryDisplay()
  return screen.getAllDisplays().map((display) => ({
    id: display.id,
    label: display.label || `Display ${display.id}`,
    bounds: display.bounds,
    scaleFactor: display.scaleFactor,
    isPrimary: display.id === primary.id,
  }))
})

ipcMain.handle('config:complete-onboarding', (_event, config) => {
  require('./config').writeConfig(config)
  startApiCostPolling(config.adminApiKey || null)
  openDashboard(config)
  const previous = BrowserWindow.getAllWindows().find((window) => window !== mainWindow)
  if (previous) previous.close()
  return { ok: true }
})

ipcMain.handle('limits:record-hit', (_event, type) => require('./limit-estimator').recordLimitHit(type))
ipcMain.handle('limits:get-estimates', () => require('./db').getLimitEstimates())
ipcMain.handle('limits:get-observations', (_event, limit = 50) => require('./db').getLimitObservations(limit))
ipcMain.handle('limits:update-estimate', (_event, data) => {
  require('./db').upsertLimitEstimate(data)
  return { ok: true }
})

ipcMain.handle('display:move', (_event, displayId) => {
  const { readConfig, writeConfig } = require('./config')
  const target = screen.getAllDisplays().find((display) => display.id === displayId)
  if (!target || !mainWindow) return { ok: false, error: 'Display not found' }

  writeConfig({ ...(readConfig() || {}), displayId })
  if (mainWindow.setKiosk) mainWindow.setKiosk(false)
  mainWindow.setFullScreen(false)
  mainWindow.setBounds(target.bounds)
  if (mainWindow.setKiosk) mainWindow.setKiosk(process.platform === 'win32' || process.platform === 'linux')
  if (process.platform === 'darwin') mainWindow.setSimpleFullScreen(true)
  else mainWindow.setFullScreen(true)
  return { ok: true }
})

ipcMain.handle('history:open', () => {
  const existing = BrowserWindow.getAllWindows().find((window) => window.getTitle() === 'CodexStats - History')
  if (existing) {
    existing.focus()
    return
  }
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    title: 'CodexStats - History',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, '../dist/src/history/index.html'))
})

ipcMain.handle('history:get-daily', (_event, { days, model }) => require('./history-queries').getDailyTrendByModel(days, model || null))
ipcMain.handle('history:get-weekly', (_event, { weeks }) => require('./history-queries').getWeekOverWeek(weeks))
ipcMain.handle('history:get-monthly', (_event, { months }) => require('./history-queries').getMonthlySummary(months))
ipcMain.handle('history:get-models', () => require('./history-queries').getDistinctModels())
ipcMain.handle('data:export', async (_event, options) => require('./exporter').exportData(options))
