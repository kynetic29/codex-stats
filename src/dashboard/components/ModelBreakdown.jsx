import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { CARD_BG, BORDER, DIM, FONT_MONO, getModelColor, fmtTokens, fmtCost } from '../theme'

function CustomTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 11, fontFamily: FONT_MONO, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
      <div style={{ color: getModelColor(row.model), fontWeight: 700, marginBottom: 4 }}>{row.model}</div>
      <div style={{ color: '#e5f1f7' }}>
        {metric === 'cost' ? fmtCost(row.cost) : fmtTokens(row.tokens)} <span style={{ color: DIM }}>({row.pct.toFixed(1)}%)</span>
      </div>
      <div style={{ color: DIM, marginTop: 2 }}>{row.requests} turns</div>
    </div>
  )
}

export default function ModelBreakdown({ breakdown }) {
  const [metric, setMetric] = useState('tokens')

  if (!breakdown || breakdown.length === 0) {
    return (
      <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 20, textAlign: 'center', color: DIM, fontFamily: FONT_MONO, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        No model activity yet
      </div>
    )
  }

  const total = breakdown.reduce((sum, row) => sum + (metric === 'cost' ? row.cost : row.tokens), 0)
  const data = breakdown.map((row) => ({
    ...row,
    value: metric === 'cost' ? row.cost : row.tokens,
    pct: total > 0 ? ((metric === 'cost' ? row.cost : row.tokens) / total) * 100 : 0,
  }))

  return (
    <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: DIM }}>
          Model Breakdown
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {['tokens', 'cost'].map((option) => (
            <button
              key={option}
              onClick={() => setMetric(option)}
              style={{
                background: metric === option ? '#112531' : 'none',
                border: `1px solid ${metric === option ? '#21475a' : 'transparent'}`,
                borderRadius: 4,
                color: metric === option ? '#e5f1f7' : '#627f8f',
                cursor: 'pointer',
                padding: '2px 8px',
                fontSize: 9,
                fontFamily: FONT_MONO,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius="52%" outerRadius="78%" dataKey="value" strokeWidth={2} stroke={CARD_BG}>
              {data.map((entry) => <Cell key={entry.model} fill={getModelColor(entry.model)} />)}
            </Pie>
            <Tooltip content={<CustomTooltip metric={metric} />} />
          </PieChart>
        </ResponsiveContainer>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#e5f1f7', fontFamily: FONT_MONO }}>{metric === 'cost' ? fmtCost(total) : fmtTokens(total)}</div>
          <div style={{ fontSize: 8, color: DIM, letterSpacing: '0.06em', marginTop: 2 }}>5H WINDOW</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
        {data.map((entry) => (
          <div key={entry.model} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: getModelColor(entry.model) }} />
            <span style={{ fontSize: 10, color: '#9ab3c1', fontFamily: FONT_MONO, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.model}
            </span>
            <span style={{ fontSize: 10, color: '#e5f1f7', fontFamily: FONT_MONO, flexShrink: 0 }}>
              {metric === 'cost' ? fmtCost(entry.cost) : fmtTokens(entry.tokens)}
            </span>
            <span style={{ fontSize: 9, color: DIM, fontFamily: FONT_MONO, flexShrink: 0, minWidth: 34, textAlign: 'right' }}>
              {entry.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
