import { useEffect, useState } from 'react'
import { CARD_BG, BORDER, DIM, TEXT, FONT_MONO, fmtTokens, fmtDuration, getModelColor } from '../theme'

function TokenBar({ input, output, cached }) {
  const total = input + output + cached
  if (total === 0) return null
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#14303c' }}>
      <div style={{ width: `${(input / total) * 100}%`, background: '#5ec8ff' }} />
      <div style={{ width: `${(output / total) * 100}%`, background: '#ff9a4d' }} />
      <div style={{ width: `${(cached / total) * 100}%`, background: '#22c7b8' }} />
    </div>
  )
}

function fmtTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function fmtDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function SessionDetailModal({ session, onClose }) {
  const [requests, setRequests] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    window.electronAPI.getSessionRequests(session.session_id).then((data) => {
      if (!cancelled) {
        setRequests(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [session.session_id])

  const elapsed = session.last_request_at && session.first_request_at ? session.last_request_at - session.first_request_at : 0
  const modelColor = getModelColor(session.model)
  const modelShort = session.model ? session.model.replace(/^openai\//, '') : '?'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 0, width: 760, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: '#5ec8ff', fontWeight: 700 }}>{session.session_id}</span>
              {session.is_active ? <span style={{ color: '#55e0a6', fontSize: 8 }}>o</span> : null}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ background: `${modelColor}22`, color: modelColor, borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{modelShort}</span>
              <span style={{ color: '#55e0a6', fontFamily: FONT_MONO, fontSize: 11 }}>{fmtDuration(elapsed)}</span>
              <span style={{ color: '#f5b942', fontFamily: FONT_MONO, fontSize: 11 }}>{(session.plan_type || '-').toUpperCase()}</span>
              <span style={{ color: DIM, fontSize: 10 }}>{session.request_count} turn{session.request_count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>x</button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 10 }}>
            <Stat label="Input" value={fmtTokens(session.total_input_tokens || 0)} color="#5ec8ff" />
            <Stat label="Output" value={fmtTokens(session.total_output_tokens || 0)} color="#ff9a4d" />
            <Stat label="Cached" value={fmtTokens(session.total_cached_input_tokens || 0)} color="#22c7b8" />
            <Stat label="Reasoning" value={fmtTokens(session.total_reasoning_output_tokens || 0)} color={DIM} />
          </div>
          <TokenBar input={session.total_input_tokens || 0} output={session.total_output_tokens || 0} cached={session.total_cached_input_tokens || 0} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: DIM, fontFamily: FONT_MONO, fontSize: 12 }}>Loading turns...</div>
          ) : !requests || requests.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: DIM, fontFamily: FONT_MONO, fontSize: 12 }}>No request data found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ background: BORDER }}>
                  {['#', 'Time', 'Input', 'Output', 'Cached', 'Reasoning', 'Total'].map((heading) => (
                    <th key={heading} style={{ padding: '6px 8px', textAlign: 'left', color: DIM, fontWeight: 600, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', position: 'sticky', top: 0, background: BORDER, zIndex: 1 }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((request, index) => (
                  <tr key={request.request_id || index} style={{ borderTop: `1px solid ${BORDER}`, background: index % 2 === 0 ? 'transparent' : '#0a1820' }}>
                    <td style={{ padding: '5px 8px', color: DIM, fontFamily: FONT_MONO }}>{index + 1}</td>
                    <td style={{ padding: '5px 8px', color: TEXT, fontFamily: FONT_MONO }}>
                      <span title={new Date(request.timestamp).toLocaleString()}>{fmtDate(request.timestamp)} {fmtTime(request.timestamp)}</span>
                    </td>
                    <td style={{ padding: '5px 8px', color: '#5ec8ff', fontFamily: FONT_MONO }}>{fmtTokens(request.input_tokens || 0)}</td>
                    <td style={{ padding: '5px 8px', color: '#ff9a4d', fontFamily: FONT_MONO }}>{fmtTokens(request.output_tokens || 0)}</td>
                    <td style={{ padding: '5px 8px', color: '#22c7b8', fontFamily: FONT_MONO }}>{fmtTokens(request.cached_input_tokens || 0)}</td>
                    <td style={{ padding: '5px 8px', color: DIM, fontFamily: FONT_MONO }}>{fmtTokens(request.reasoning_output_tokens || 0)}</td>
                    <td style={{ padding: '5px 8px', color: '#e5f1f7', fontFamily: FONT_MONO }}>{fmtTokens(request.total_tokens || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 14, color, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
