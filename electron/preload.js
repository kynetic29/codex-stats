const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getDashboardData: () => ipcRenderer.invoke('data:get-dashboard'),
  getSessions: (limit) => ipcRenderer.invoke('data:get-sessions', limit),
  getSessionRequests: (sessionId) => ipcRenderer.invoke('data:get-session-requests', sessionId),
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (partial) => ipcRenderer.invoke('config:update', partial),
  getDisplays: () => ipcRenderer.invoke('config:get-displays'),
  completeOnboarding: (config) => ipcRenderer.invoke('config:complete-onboarding', config),
  recordLimitHit: (type) => ipcRenderer.invoke('limits:record-hit', type),
  getLimitEstimates: () => ipcRenderer.invoke('limits:get-estimates'),
  getLimitObservations: (limit) => ipcRenderer.invoke('limits:get-observations', limit),
  updateLimitEstimate: (data) => ipcRenderer.invoke('limits:update-estimate', data),
  quit: () => ipcRenderer.invoke('app:quit'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  resetSetup: () => ipcRenderer.invoke('app:reset-setup'),
  moveToDisplay: (displayId) => ipcRenderer.invoke('display:move', displayId),
  setAutoStart: (enabled) => ipcRenderer.invoke('app:set-autostart', enabled),
  getAutoStart: () => ipcRenderer.invoke('app:get-autostart'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  openHistory: () => ipcRenderer.invoke('history:open'),
  historyGetDaily: (opts) => ipcRenderer.invoke('history:get-daily', opts),
  historyGetWeekly: (opts) => ipcRenderer.invoke('history:get-weekly', opts),
  historyGetMonthly: (opts) => ipcRenderer.invoke('history:get-monthly', opts),
  historyGetModels: () => ipcRenderer.invoke('history:get-models'),
  exportData: (options) => ipcRenderer.invoke('data:export', options),
  getUpdateStatus: () => ipcRenderer.invoke('update:get-status'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (handler) => {
    const listener = (_event, status) => handler(status)
    ipcRenderer.on('update-status', listener)
    return () => ipcRenderer.removeListener('update-status', listener)
  },
})
