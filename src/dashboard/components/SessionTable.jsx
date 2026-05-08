import { useState } from 'react'
import { CARD_BG, BORDER, DIM, FONT_MONO, fmtTokens, fmtDuration, shortId, getModelColor } from '../theme'
import SessionDetailModal from './SessionDetailModal'

export default function SessionTable({ sessions }) {
  const [selectedSession, setSelectedSession] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)

  if (!sessions || sessions.length === 0) {
    return (
      <div style={{
        background: CARD_BG,
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
        padding: 20,
        textAlign: 'center',
        color: DIM,
        fontFamily: FONT_MONO,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      }}>
        Waiting for Codex session data...
      </div>
    )
  }

  return (
    <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: DIM, padding: '10px 14px 6px' }}>
        Recent Sessions
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: BORDER }}>
              {['Session', 'Model', 'Tokens', 'Cached', 'Turns', 'Duration', 'Plan'].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    color: DIM,
                    fontWeight: 600,
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    position: 'sticky',
                    top: 0,
                    background: BORDER,
                    zIndex: 1,
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, index) => {
              const modelColor = getModelColor(session.model)
              const elapsed = session.last_request_at && session.first_request_at ? session.last_request_at - session.first_request_at : 0
              const modelShort = session.model ? session.model.replace(/^openai\//, '') : '?'

              return (
                <tr
                  key={session.session_id}
                  onClick={() => setSelectedSession(session)}
                  onMouseEnter={() => setHoveredRow(session.session_id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    borderTop: `1px solid ${BORDER}`,
                    background: hoveredRow === session.session_id ? '#112531' : index % 2 === 0 ? 'transparent' : '#0a1820',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '6px 8px', fontFamily: FONT_MONO, color: '#5ec8ff', fontSize: 10 }}>
                    {shortId(session.session_id)}
                    {session.is_active ? <span style={{ marginLeft: 4, color: '#55e0a6', fontSize: 8 }}>o</span> : null}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ background: `${modelColor}22`, color: modelColor, borderRadius: 3, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>
                      {modelShort}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', color: '#e5f1f7', fontFamily: FONT_MONO, fontSize: 10 }}>
                    {fmtTokens(session.total_tokens || 0)}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#22c7b8', fontFamily: FONT_MONO, fontSize: 10 }}>
                    {fmtTokens(session.total_cached_input_tokens || 0)}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#e5f1f7', fontFamily: FONT_MONO, fontSize: 10 }}>
                    {session.request_count || 0}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#55e0a6', fontFamily: FONT_MONO, fontSize: 10 }}>
                    {fmtDuration(elapsed)}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#f5b942', fontFamily: FONT_MONO, fontSize: 10 }}>
                    {(session.plan_type || '-').toUpperCase()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {selectedSession && <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  )
}
