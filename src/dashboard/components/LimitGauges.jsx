import { useState } from 'react'
import { CARD_BG, BORDER, DIM, TEXT, FONT_MONO, getLimitColor, fmtTokens, fmtCountdown } from '../theme'
import { useCountdown } from '../hooks/useCountdown'

function LimitEditor({ label, currentValue, onSave, onCancel }) {
  const [val, setVal] = useState(String(currentValue || ''))
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
    }}>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, width: 320 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Set {label}</div>
        <input
          type="number"
          value={val}
          onChange={(event) => setVal(event.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#06131a',
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: TEXT,
            fontSize: 13,
            fontFamily: FONT_MONO,
            outline: 'none',
          }}
          autoFocus
          onKeyDown={(event) => event.key === 'Enter' && onSave(parseInt(val, 10) || 0)}
        />
        <div style={{ fontSize: 10, color: DIM, marginTop: 6 }}>Enter 0 to remove the estimate</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={secondaryButton}>Cancel</button>
          <button onClick={() => onSave(parseInt(val, 10) || 0)} style={primaryButton}>Save</button>
        </div>
      </div>
    </div>
  )
}

function GaugeBar({ label, pct, current, limit, confidence, countdown, color, onEditLimit, source, warnPct, critPct, eta, etaApprox }) {
  const remaining = useCountdown(countdown)
  const barColor = getLimitColor(pct, warnPct, critPct)
  const isLive = source === 'codex-live'
  const isLowConfidence = !isLive && confidence < 0.3

  return (
    <div style={{ flex: 1, background: CARD_BG, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: DIM, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
          {label}
          {isLive && <span style={{ fontSize: 8, color: '#55e0a6', fontWeight: 700, letterSpacing: '0.1em', background: '#55e0a615', padding: '1px 5px', borderRadius: 3 }}>LIVE</span>}
        </div>
        <div style={{ fontSize: 10, color: DIM }}>
          resets in <span style={{ color: TEXT, fontFamily: FONT_MONO }}>{fmtCountdown(remaining)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 36, fontWeight: 800, fontFamily: FONT_MONO, color: barColor }}>
          {isLowConfidence ? '~' : ''}{pct.toFixed(1)}%
        </span>
        <span style={{ fontSize: 11, color: DIM }}>
          {fmtTokens(current)}
          {limit > 0 && !isLive ? ` / ${fmtTokens(limit)}` : ''}
          {!isLive && <span onClick={onEditLimit} style={{ color: '#5ec8ff', cursor: 'pointer', marginLeft: 6 }}>edit</span>}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: '#4f6a79', fontFamily: FONT_MONO, letterSpacing: '0.06em' }}>ETA</span>
        <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: eta === null ? '#335566' : etaApprox ? '#7a97a6' : DIM }}>
          {eta === null ? '-' : `${etaApprox ? '~' : ''}${fmtCountdown(eta)}`}
        </span>
      </div>

      <div style={{ position: 'relative', height: 10, background: '#14303c', borderRadius: 5, overflow: 'hidden' }}>
        {isLowConfidence && <div style={{ position: 'absolute', top: 0, left: `${Math.max(0, pct - 15)}%`, width: '30%', height: '100%', background: `${barColor}15`, borderRadius: 5 }} />}
        <div style={{
          width: `${Math.min(100, pct)}%`,
          height: '100%',
          borderRadius: 5,
          background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
          transition: 'width 0.8s ease',
          boxShadow: pct >= 80 ? `0 0 12px ${barColor}66` : 'none',
        }} />
      </div>
    </div>
  )
}

const primaryButton = {
  background: '#5ec8ff',
  border: 'none',
  borderRadius: 6,
  color: '#03202c',
  cursor: 'pointer',
  padding: '6px 14px',
  fontSize: 11,
  fontWeight: 700,
}

const secondaryButton = {
  background: 'none',
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  color: DIM,
  cursor: 'pointer',
  padding: '6px 14px',
  fontSize: 11,
}

export default function LimitGauges({ session, weekly, thresholds, vertical = false }) {
  const [editing, setEditing] = useState(null)
  const sWarn = thresholds?.sessionWarnPct ?? 60
  const sCrit = thresholds?.sessionCritPct ?? 80
  const wWarn = thresholds?.weeklyWarnPct ?? 60
  const wCrit = thresholds?.weeklyCritPct ?? 80

  function handleSave(type, value) {
    setEditing(null)
    window.electronAPI?.updateLimitEstimate({
      type,
      model: 'all',
      estimated_limit: value,
      confidence: 0.9,
      observation_count: 1,
      last_updated: Date.now(),
    })
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: 12 }}>
        <GaugeBar
          label="5-Hour Window"
          pct={session.pct}
          current={session.tokens}
          limit={session.estimatedLimit}
          confidence={session.confidence}
          countdown={session.remainingMs}
          color="#5ec8ff"
          onEditLimit={() => setEditing('session')}
          source={session.source}
          warnPct={sWarn}
          critPct={sCrit}
          eta={session.eta ?? null}
          etaApprox={session.etaApprox ?? true}
        />
        <GaugeBar
          label="7-Day Window"
          pct={weekly.pct}
          current={weekly.tokens}
          limit={weekly.estimatedLimit}
          confidence={weekly.confidence}
          countdown={weekly.resetIn}
          color="#55e0a6"
          onEditLimit={() => setEditing('weekly')}
          source={weekly.source}
          warnPct={wWarn}
          critPct={wCrit}
          eta={weekly.eta ?? null}
          etaApprox={weekly.etaApprox ?? true}
        />
      </div>

      {editing === 'session' && <LimitEditor label="5-Hour Token Limit" currentValue={session.estimatedLimit} onSave={(value) => handleSave('session', value)} onCancel={() => setEditing(null)} />}
      {editing === 'weekly' && <LimitEditor label="7-Day Token Limit" currentValue={weekly.estimatedLimit} onSave={(value) => handleSave('weekly', value)} onCancel={() => setEditing(null)} />}
    </>
  )
}
