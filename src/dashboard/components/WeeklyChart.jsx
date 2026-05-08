import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CARD_BG, BORDER, DIM, FONT_MONO } from '../theme'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#e5f1f7', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#5ec8ff' }}>{label}</div>
      {payload.filter((item) => item.value != null).map((item, index) => (
        <div key={index} style={{ color: item.color, marginBottom: 2 }}>
          {item.name}: <span style={{ color: '#fff', fontWeight: 600 }}>{Number(item.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function WeeklyChart({ dailyBreakdown }) {
  if (!dailyBreakdown || dailyBreakdown.length === 0) {
    return (
      <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 20, textAlign: 'center', color: DIM, fontFamily: FONT_MONO, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        No subscription activity in the current 7-day window
      </div>
    )
  }

  const byDay = new Map()
  for (const row of dailyBreakdown) {
    const dayMs = row.day_bucket * 86400000
    const label = new Date(dayMs).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!byDay.has(label)) byDay.set(label, { name: label, Input: 0, Output: 0, Cached: 0, Requests: 0 })
    const day = byDay.get(label)
    day.Input += row.input_tokens || 0
    day.Output += row.output_tokens || 0
    day.Cached += row.cached_input_tokens || 0
    day.Requests += row.request_count || 0
  }

  const data = [...byDay.values()]

  return (
    <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}`, padding: '12px 12px 6px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: DIM, marginBottom: 8 }}>
        Last 7 Days
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: DIM, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: DIM, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Input" stackId="1" fill="#5ec8ff" stroke="#5ec8ff" fillOpacity={0.3} />
            <Area type="monotone" dataKey="Output" stackId="1" fill="#ff9a4d" stroke="#ff9a4d" fillOpacity={0.28} />
            <Area type="monotone" dataKey="Cached" stackId="1" fill="#22c7b8" stroke="#22c7b8" fillOpacity={0.22} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', gap: 12, paddingTop: 4, justifyContent: 'center' }}>
        {[
          { label: 'Input', color: '#5ec8ff' },
          { label: 'Output', color: '#ff9a4d' },
          { label: 'Cached', color: '#22c7b8' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: DIM }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} /> {label}
          </div>
        ))}
      </div>
    </div>
  )
}
