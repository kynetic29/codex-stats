export const BG = '#06131a'
export const CARD_BG = '#0d1d26'
export const BORDER = '#183342'
export const DIM = '#89a6b8'
export const TEXT = '#e5f1f7'

export const GREEN = '#38d39f'
export const YELLOW = '#f5b942'
export const RED = '#ff6b57'
export const BLUE = '#5ec8ff'
export const TEAL = '#22c7b8'
export const EMERALD = '#55e0a6'
export const ORANGE = '#ff9a4d'

export const MODEL_COLORS = {
  'gpt-5.4': BLUE,
  'gpt-5.2': TEAL,
  'gpt-5.2-codex': ORANGE,
  'gpt-5.1-codex-max': ORANGE,
  'gpt-5.1-codex': ORANGE,
  'gpt-5.1-codex-mini': EMERALD,
  'gpt-5.4-mini': EMERALD,
  codex: ORANGE,
  gpt: BLUE,
}

export function getModelColor(model) {
  if (!model) return BLUE
  if (MODEL_COLORS[model]) return MODEL_COLORS[model]
  if (model.includes('codex')) return ORANGE
  if (model.includes('mini')) return EMERALD
  return BLUE
}

export function getLimitColor(pct, warnPct = 60, critPct = 80) {
  if (pct >= critPct) return RED
  if (pct >= warnPct) return YELLOW
  return GREEN
}

export function fmtTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n || 0))
}

export function fmtDuration(ms) {
  if (!ms || ms <= 0) return '-'
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.round((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.round((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

export function fmtCountdown(ms) {
  if (ms <= 0) return 'Now'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function fmtCost(usd) {
  if (usd >= 100) return `$${usd.toFixed(0)}`
  if (usd >= 1) return `$${usd.toFixed(2)}`
  if (usd >= 0.01) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(4)}`
}

export function shortId(id) {
  if (!id) return '-'
  return id.length > 14 ? `${id.slice(0, 8)}...` : id
}

export const FONT_MONO = "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace"
export const FONT_SANS = "'IBM Plex Sans', 'Segoe UI', sans-serif"
