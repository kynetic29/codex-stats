import { useEffect, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { BG, CARD_BG, BORDER, DIM, TEXT, FONT_MONO, FONT_SANS, BLUE, ORANGE, EMERALD, fmtTokens, getModelColor } from '../dashboard/theme'

const DAY_RANGES = [7, 14, 30, 60, 90]
const WEEK_RANGES = [4, 8, 12, 26]
const MONTH_RANGES = [3, 6, 12]

function SectionTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: DIM, marginBottom: 10 }}>{children}</div>
}

function Card({ children, style = {} }) {
  return <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', ...style }}>{children}</div>
}

function RangeButton({ value, current, onChange, label }) {
  const active = value === current
  return (
    <button onClick={() => onChange(value)} style={{ background: active ? '#112531' : 'none', border: `1px solid ${active ? '#21475a' : 'transparent'}`, borderRadius: 4, color: active ? TEXT : '#627f8f', cursor: 'pointer', padding: '2px 8px', fontSize: 10, fontFamily: FONT_MONO }}>
      {label || value}
    </button>
  )
}

function EmptyState({ message = 'No data in this range' }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: DIM, fontFamily: FONT_MONO, fontSize: 12 }}>{message}</div>
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 11, fontFamily: FONT_MONO, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
      <div style={{ color: DIM, marginBottom: 4 }}>{label}</div>
      {payload.map((item) => <div key={item.dataKey} style={{ color: item.color || TEXT }}>{item.name}: {fmtTokens(item.value)}</div>)}
    </div>
  )
}

function DailyTrendChart({ days, setDays, models, model, setModel }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.electronAPI?.historyGetDaily({ days, model: model === 'all' ? null : model }).then((rows) => {
      setData(rows || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [days, model])

  const totals = data.reduce((acc, row) => ({
    tokens: acc.tokens + (row.total_tokens || 0),
    requests: acc.requests + (row.request_count || 0),
    cached: acc.cached + (row.cached_input_tokens || 0),
  }), { tokens: 0, requests: 0, cached: 0 })

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <SectionTitle>Daily Trend</SectionTitle>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select value={model} onChange={(event) => setModel(event.target.value)} style={{ background: '#0d1d26', border: `1px solid ${BORDER}`, borderRadius: 5, color: TEXT, fontSize: 10, fontFamily: FONT_MONO, padding: '2px 6px', cursor: 'pointer', outline: 'none' }}>
            <option value="all">All models</option>
            {models.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 2 }}>
            {DAY_RANGES.map((value) => <RangeButton key={value} value={value} current={days} onChange={setDays} label={`${value}d`} />)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 4 }}>
        <Metric label="TOTAL TOKENS" value={fmtTokens(totals.tokens)} color={BLUE} />
        <Metric label="REQUESTS" value={totals.requests.toLocaleString()} color={ORANGE} />
        <Metric label="CACHED INPUT" value={fmtTokens(totals.cached)} color={EMERALD} />
        <Metric label="AVG / DAY" value={fmtTokens(data.length ? totals.tokens / data.length : 0)} color={TEXT} />
      </div>

      <div style={{ height: 200 }}>
        {loading ? <EmptyState message="Loading..." /> : data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#183342" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: DIM, fontSize: 9, fontFamily: FONT_MONO }} axisLine={false} tickLine={false} interval={Math.ceil(data.length / 8) - 1} />
              <YAxis tick={{ fill: DIM, fontSize: 9, fontFamily: FONT_MONO }} axisLine={false} tickLine={false} width={48} tickFormatter={(value) => fmtTokens(value)} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total_tokens" name="Tokens" stroke={BLUE} fill="url(#areaGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}

function WeeklyChart({ weeks, setWeeks }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.electronAPI?.historyGetWeekly({ weeks }).then((rows) => {
      setData(rows || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [weeks])

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionTitle>Week over Week</SectionTitle>
        <div style={{ display: 'flex', gap: 2 }}>
          {WEEK_RANGES.map((value) => <RangeButton key={value} value={value} current={weeks} onChange={setWeeks} label={`${value}w`} />)}
        </div>
      </div>
      <div style={{ height: 180 }}>
        {loading ? <EmptyState message="Loading..." /> : data.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#183342" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: DIM, fontSize: 9, fontFamily: FONT_MONO }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: DIM, fontSize: 9, fontFamily: FONT_MONO }} axisLine={false} tickLine={false} width={48} tickFormatter={(value) => fmtTokens(value)} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="total_tokens" name="Tokens" fill={ORANGE} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}

function MonthlyTable({ months, setMonths }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.electronAPI?.historyGetMonthly({ months }).then((rows) => {
      setData(rows || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [months])

  const maxTokens = Math.max(...data.map((row) => row.total_tokens || 0), 1)

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionTitle>Monthly Summary</SectionTitle>
        <div style={{ display: 'flex', gap: 2 }}>
          {MONTH_RANGES.map((value) => <RangeButton key={value} value={value} current={months} onChange={setMonths} label={`${value}mo`} />)}
        </div>
      </div>

      {loading ? <EmptyState message="Loading..." /> : data.length === 0 ? <EmptyState /> : (
        <div style={{ overflowY: 'auto', maxHeight: 320 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px 80px 80px 60px', gap: 8, padding: '0 4px 6px', borderBottom: `1px solid ${BORDER}`, fontSize: 9, color: DIM, fontFamily: FONT_MONO, letterSpacing: '0.06em' }}>
            <span>MONTH</span>
            <span>TOKENS</span>
            <span style={{ textAlign: 'right' }}>INPUT</span>
            <span style={{ textAlign: 'right' }}>OUTPUT</span>
            <span style={{ textAlign: 'right' }}>CACHED</span>
            <span style={{ textAlign: 'right' }}>REQS</span>
          </div>
          {[...data].reverse().map((row, index) => (
            <div key={row.month || index} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px 80px 80px 60px', gap: 8, padding: '7px 4px', borderBottom: `1px solid ${BORDER}22`, fontSize: 11, fontFamily: FONT_MONO }}>
              <span style={{ color: DIM }}>{row.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div style={{ height: 6, borderRadius: 3, flexShrink: 0, background: BLUE, width: `${Math.round((row.total_tokens / maxTokens) * 100)}%`, minWidth: 2 }} />
                <span style={{ color: TEXT, flexShrink: 0 }}>{fmtTokens(row.total_tokens)}</span>
              </div>
              <span style={{ color: DIM, textAlign: 'right' }}>{fmtTokens(row.input_tokens)}</span>
              <span style={{ color: DIM, textAlign: 'right' }}>{fmtTokens(row.output_tokens)}</span>
              <span style={{ color: EMERALD, textAlign: 'right' }}>{fmtTokens(row.cached_input_tokens)}</span>
              <span style={{ color: DIM, textAlign: 'right' }}>{row.request_count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function ExportBar() {
  const [format, setFormat] = useState('csv')
  const [scope, setScope] = useState('sessions')
  const [state, setState] = useState('idle')

  async function handleExport() {
    setState('saving')
    try {
      const result = await window.electronAPI?.exportData({ format, scope })
      setState(result?.ok ? 'done' : 'error')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
      <span style={{ fontSize: 10, color: DIM, fontFamily: FONT_MONO, letterSpacing: '0.06em', marginRight: 4 }}>EXPORT</span>
      <div style={{ display: 'flex', gap: 2 }}>
        {['csv', 'json'].map((item) => <RangeButton key={item} value={item} current={format} onChange={setFormat} label={item.toUpperCase()} />)}
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {['sessions', 'requests', 'all'].map((item) => <RangeButton key={item} value={item} current={scope} onChange={setScope} />)}
      </div>
      <button onClick={handleExport} disabled={state === 'saving'} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 5, color: state === 'done' ? EMERALD : state === 'error' ? '#ff6b57' : TEXT, cursor: state === 'saving' ? 'wait' : 'pointer', padding: '4px 12px', fontSize: 11, fontFamily: FONT_MONO, opacity: state === 'saving' ? 0.6 : 1 }}>
        {state === 'saving' ? 'Saving...' : state === 'done' ? 'Saved' : state === 'error' ? 'Error' : 'Export...'}
      </button>
    </Card>
  )
}

function Metric({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: FONT_MONO }}>{value}</div>
      <div style={{ fontSize: 9, color: DIM, letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function HistoryPage() {
  const [days, setDays] = useState(30)
  const [weeks, setWeeks] = useState(8)
  const [months, setMonths] = useState(6)
  const [model, setModel] = useState('all')
  const [models, setModels] = useState([])

  useEffect(() => {
    window.electronAPI?.historyGetModels().then((list) => setModels(list || [])).catch(() => {})
  }, [])

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '16px 20px', fontFamily: FONT_SANS, color: TEXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1d26; }
        ::-webkit-scrollbar-thumb { background: #21475a; border-radius: 2px; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: FONT_MONO, background: 'linear-gradient(90deg, #e5f1f7 0%, #78d7ff 45%, #55e0a6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CodexStats - History
          </h1>
          <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>Long-term Codex usage analysis from local session logs</div>
        </div>
        <button onClick={() => window.close()} style={{ background: 'none', border: '1px solid #21475a', borderRadius: 6, color: '#627f8f', cursor: 'pointer', padding: '5px 12px', fontSize: 11, fontFamily: FONT_MONO }}>x</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <DailyTrendChart days={days} setDays={setDays} models={models} model={model} setModel={setModel} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <WeeklyChart weeks={weeks} setWeeks={setWeeks} />
          <MonthlyTable months={months} setMonths={setMonths} />
        </div>
        <ExportBar />
      </div>
    </div>
  )
}
