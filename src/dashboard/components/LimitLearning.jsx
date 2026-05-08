import { CARD_BG, BORDER, DIM, FONT_MONO, TEXT, fmtTokens, fmtCost } from '../theme'

function summarizeApiCosts(apiCosts) {
  const rows = apiCosts || []
  const today = new Date().toISOString().slice(0, 10)
  const month = today.slice(0, 7)
  let todayCost = 0
  let monthCost = 0
  for (const row of rows) {
    if (row.bucket_date === today) todayCost += row.amount_usd || 0
    if (row.bucket_date?.slice(0, 7) === month) monthCost += row.amount_usd || 0
  }
  return { todayCost, monthCost }
}

function LimitDetail({ label, estimate }) {
  const confidencePct = (estimate.confidence * 100).toFixed(0)
  const isLow = estimate.confidence < 0.3
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: DIM, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: FONT_MONO }}>{isLow ? '~' : ''}{fmtTokens(estimate.estimated_limit)}</span>
        <span style={{ fontSize: 9, color: DIM }}>tokens</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <div style={{ flex: 1, height: 3, background: '#14303c', borderRadius: 2 }}>
          <div style={{ width: `${confidencePct}%`, height: '100%', borderRadius: 2, background: isLow ? '#f5b942' : '#55e0a6' }} />
        </div>
        <span style={{ fontSize: 9, color: DIM, fontFamily: FONT_MONO }}>{confidencePct}% · {estimate.observation_count} obs</span>
      </div>
    </div>
  )
}

export default function LimitLearning({ limits, apiCosts, apiCostStatus = {} }) {
  const sessionLimit = limits?.find((limit) => limit.type === 'session') || { estimated_limit: 0, confidence: 0, observation_count: 0 }
  const weeklyLimit = limits?.find((limit) => limit.type === 'weekly') || { estimated_limit: 0, confidence: 0, observation_count: 0 }
  const { todayCost, monthCost } = summarizeApiCosts(apiCosts)

  let apiHeadline = 'not connected'
  let apiSub = 'Add an admin key in settings'
  if (apiCostStatus.hasKey) {
    if (apiCostStatus.state === 'ready') {
      apiHeadline = fmtCost(todayCost)
      apiSub = `${fmtCost(monthCost)} this month`
    } else if (apiCostStatus.state === 'error') {
      apiHeadline = 'sync error'
      apiSub = apiCostStatus.error || 'Check the admin key'
    } else {
      apiHeadline = 'syncing'
      apiSub = 'Loading OpenAI organization costs'
    }
  }

  return (
    <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}`, padding: '10px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: DIM, marginBottom: 8 }}>Fallback + API Spend</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <LimitDetail label="5-Hour Estimate" estimate={sessionLimit} />
        <LimitDetail label="7-Day Estimate" estimate={weeklyLimit} />
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: DIM, marginBottom: 4 }}>OpenAI API costs</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: FONT_MONO }}>{apiHeadline}</div>
          <div style={{ fontSize: 9, color: DIM, marginTop: 4, fontFamily: FONT_MONO }}>{apiSub}</div>
        </div>
        <div style={{ maxWidth: 150, fontSize: 9, color: '#627f8f', lineHeight: 1.5, fontFamily: FONT_MONO }}>
          Ctrl+Shift+L records a manual limit hit when Codex stops you before the live percentages are available.
        </div>
      </div>
    </div>
  )
}
