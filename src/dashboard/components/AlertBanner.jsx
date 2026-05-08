import { FONT_MONO } from '../theme'

export default function AlertBanner({ sessionPct, weeklyPct, thresholds }) {
  const sWarn = thresholds?.sessionWarnPct ?? 60
  const sCrit = thresholds?.sessionCritPct ?? 80
  const wWarn = thresholds?.weeklyWarnPct ?? 60
  const wCrit = thresholds?.weeklyCritPct ?? 80
  const nearCrit = Math.min(sCrit, wCrit) + 15

  let message = null
  let bg = null
  let color = null

  if (sessionPct >= nearCrit || weeklyPct >= nearCrit) {
    message = sessionPct >= nearCrit ? '5-hour subscription window is critical' : '7-day subscription window is critical'
    bg = '#ff6b5722'
    color = '#ff6b57'
  } else if (sessionPct >= sCrit || weeklyPct >= wCrit) {
    message = sessionPct >= sCrit ? '5-hour subscription window is approaching its limit' : '7-day subscription window is approaching its limit'
    bg = '#f5b94218'
    color = '#f5b942'
  } else if (sessionPct >= sWarn || weeklyPct >= wWarn) {
    message = sessionPct >= sWarn ? '5-hour subscription usage is elevated' : '7-day subscription usage is elevated'
    bg = '#55e0a612'
    color = '#55e0a6'
  }

  if (!message) return null

  return (
    <div style={{ background: bg, borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 600, fontFamily: FONT_MONO, color, textAlign: 'center', letterSpacing: '0.03em' }}>
      {message} · 5h {sessionPct.toFixed(1)}% · 7d {weeklyPct.toFixed(1)}%
    </div>
  )
}
