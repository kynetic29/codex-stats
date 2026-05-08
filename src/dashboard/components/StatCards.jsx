import { CARD_BG, BORDER, DIM, FONT_MONO, fmtTokens, fmtCost } from '../theme'

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${CARD_BG} 0%, ${BORDER} 100%)`, border: `1px solid ${color}33`, borderRadius: 10, padding: '10px 14px', flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 9, color: DIM, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: FONT_MONO }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function summarizeApiCosts(apiCosts) {
  const rows = apiCosts || []
  const today = new Date().toISOString().slice(0, 10)
  let todayCost = 0
  let monthCost = 0
  for (const row of rows) {
    if (row.bucket_date === today) todayCost += row.amount_usd || 0
    if (row.bucket_date?.slice(0, 7) === today.slice(0, 7)) monthCost += row.amount_usd || 0
  }
  return { todayCost, monthCost }
}

export default function StatCards({ session, weekly, apiCosts = [], apiCostStatus = {}, wrap = false }) {
  const { todayCost, monthCost } = summarizeApiCosts(apiCosts)
  const modelName = session.model ? session.model.replace(/^openai\//, '') : '-'
  const projectName = session.project || session.planType || '-'

  let apiLabel = 'Not Set'
  let apiSub = 'Add admin key in settings'
  if (apiCostStatus.hasKey) {
    if (apiCostStatus.state === 'ready') {
      apiLabel = fmtCost(todayCost)
      apiSub = `${fmtCost(monthCost)} this month`
    } else if (apiCostStatus.state === 'error') {
      apiLabel = 'Sync Error'
      apiSub = apiCostStatus.error || 'Check admin key'
    } else {
      apiLabel = 'Syncing'
      apiSub = 'Loading OpenAI costs'
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: wrap ? 'wrap' : 'nowrap' }}>
      <StatCard label="5H Tokens" value={fmtTokens(session.tokens)} sub={`${session.requestCount} turns`} color="#5ec8ff" />
      <StatCard label="Turns Today" value={String(weekly.requestCountToday)} sub={`${weekly.requestCountWeek} in 7d`} color="#22c7b8" />
      <StatCard label="7D Tokens" value={fmtTokens(weekly.tokens)} sub={`${weekly.sessionCount} sessions`} color="#55e0a6" />
      <StatCard label="API Spend" value={apiLabel} sub={apiSub} color="#f5b942" />
      <StatCard label="Plan" value={(session.planType || '-').toUpperCase()} sub={modelName} color="#ff9a4d" />
      <StatCard label="Workspace" value={projectName.split('\\').pop() || projectName} sub={`${fmtTokens(session.cachedInputTokens || 0)} cached`} color="#9cdaf3" />
    </div>
  )
}
