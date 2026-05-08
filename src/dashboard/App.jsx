import { useState } from 'react'
import { usePolledData } from './hooks/usePolledData'
import { useLayout } from './hooks/useLayout'
import LimitGauges from './components/LimitGauges'
import StatCards from './components/StatCards'
import AlertBanner from './components/AlertBanner'
import WeeklyChart from './components/WeeklyChart'
import SessionTable from './components/SessionTable'
import LimitLearning from './components/LimitLearning'
import UpdateToast from './components/UpdateToast'
import SettingsModal from './components/SettingsModal'
import ModelBreakdown from './components/ModelBreakdown'
import { BG, DIM, FONT_SANS, FONT_MONO } from './theme'

const FONT_SCALE = {
  tall: 0.88,
  standard: 0.94,
  'wide-2to1': 1.0,
  ultrawide: 1.0,
  superwide: 1.06,
}

export default function App() {
  const { data, error } = usePolledData(3000)
  const { layout, isDevOverride } = useLayout()
  const [displayPickerOpen, setDisplayPickerOpen] = useState(false)
  const [displays, setDisplays] = useState([])
  const [movingDisplay, setMovingDisplay] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function openDisplayPicker() {
    const list = await window.electronAPI?.getDisplays()
    setDisplays(list || [])
    setDisplayPickerOpen(true)
  }

  async function pickDisplay(id) {
    setMovingDisplay(id)
    await window.electronAPI?.moveToDisplay(id)
    setMovingDisplay(null)
    setDisplayPickerOpen(false)
  }

  if (!data) {
    return (
      <div style={{ background: BG, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_MONO, color: DIM }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>o</div>
          Loading dashboard data...
          {error && <div style={{ color: '#ff6b57', fontSize: 11, marginTop: 8 }}>{error}</div>}
        </div>
      </div>
    )
  }

  const { session, weekly, sessions, limits, dailyBreakdown, modelBreakdown, apiCosts, apiCostStatus, thresholds } = data
  const t = thresholds || { sessionWarnPct: 60, sessionCritPct: 80, weeklyWarnPct: 60, weeklyCritPct: 80 }
  const isSidebarLayout = layout === 'ultrawide' || layout === 'superwide'
  const mainGridColumns = layout === 'tall' ? '1fr' : layout === 'standard' ? '3fr 2fr 1fr' : '1fr 1fr'

  const headerEl = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexShrink: 0 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: session.active ? '#55e0a6' : '#476574', boxShadow: session.active ? '0 0 8px #55e0a6' : 'none' }} />
          <span style={{ fontSize: 10, color: session.active ? '#55e0a6' : '#476574', fontFamily: FONT_MONO, letterSpacing: '0.1em' }}>{session.active ? 'LIVE' : 'IDLE'}</span>
          {isDevOverride && (
            <span style={{ fontSize: 8, color: '#f5b942', fontFamily: FONT_MONO, letterSpacing: '0.1em', background: '#f5b94218', padding: '1px 6px', borderRadius: 3, border: '1px solid #f5b94244' }}>
              LAYOUT: {layout.toUpperCase()} (Ctrl+Shift+K)
            </span>
          )}
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 800, fontFamily: FONT_MONO, background: 'linear-gradient(90deg, #e5f1f7 0%, #78d7ff 45%, #55e0a6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CodexStats
        </h1>
        <div style={{ fontSize: 10, color: DIM, marginTop: 1 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <UpdateToast />
        <button onClick={() => window.electronAPI?.openHistory()} title="History and Analysis" style={headerButtonStyle()}>H</button>
        <button onClick={() => window.electronAPI?.recordLimitHit('session')} title="Record Limit Hit (Ctrl+Shift+L)" style={headerButtonStyle()}>L</button>
        <button onClick={openDisplayPicker} title="Move to Display" style={headerButtonStyle()}>D</button>
        <button onClick={() => setSettingsOpen(true)} title="Settings" style={headerButtonStyle()}>S</button>
        <button onClick={() => window.electronAPI?.resetSetup()} title="Reset Setup (Ctrl+Shift+R)" style={headerButtonStyle()}>R</button>
        <button onClick={() => window.electronAPI?.minimize()} title="Minimize" style={headerButtonStyle()}>-</button>
        <button onClick={() => window.electronAPI?.quit()} title="Exit (Ctrl+Shift+Q)" style={headerButtonStyle()}>x</button>
      </div>
    </div>
  )

  const alertEl = (
    <div style={{ flexShrink: 0, marginBottom: 6 }}>
      <AlertBanner sessionPct={session.pct} weeklyPct={weekly.pct} thresholds={t} />
    </div>
  )

  const footerText = !apiCostStatus?.hasKey
    ? 'No API cost key configured'
    : apiCostStatus.state === 'ready'
      ? 'OpenAI API costs connected'
      : apiCostStatus.state === 'error'
        ? 'OpenAI API cost sync error'
        : 'OpenAI API cost sync in progress'

  const footerEl = (
    <div style={{ flexShrink: 0, marginTop: 4, fontSize: 9, color: '#476574', textAlign: 'center', fontFamily: FONT_MONO }}>
      Codex session scanner active · {footerText} · Polling every 3s
    </div>
  )

  if (isSidebarLayout) {
    const sidebarWidth = layout === 'superwide' ? '240px' : '260px'
    const reservedWidth = '280px'

    return (
      <div style={shellStyle(layout)}>
        <GlobalStyle />
        {headerEl}
        {alertEl}

        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: layout === 'superwide' ? `${sidebarWidth} 1fr ${reservedWidth}` : `${sidebarWidth} 1fr`, gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            <LimitGauges session={session} weekly={weekly} thresholds={t} vertical />
            <LimitLearning limits={limits} apiCosts={apiCosts} apiCostStatus={apiCostStatus} />
            {layout === 'ultrawide' && <div style={{ flex: 1, minHeight: 0 }}><ModelBreakdown breakdown={modelBreakdown} /></div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            <div style={{ flexShrink: 0 }}>
              <StatCards session={session} weekly={weekly} apiCosts={apiCosts} apiCostStatus={apiCostStatus} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1, minHeight: 0 }}>
              <WeeklyChart dailyBreakdown={dailyBreakdown} />
              <SessionTable sessions={sessions} />
            </div>
          </div>

          {layout === 'superwide' && <ModelBreakdown breakdown={modelBreakdown} />}
        </div>

        {footerEl}
        {settingsOpen && <SettingsModal thresholds={t} onClose={() => setSettingsOpen(false)} />}
        {displayPickerOpen && renderDisplayPicker(displays, movingDisplay, pickDisplay, () => setDisplayPickerOpen(false))}
      </div>
    )
  }

  return (
    <div style={shellStyle(layout)}>
      <GlobalStyle />
      {headerEl}
      {alertEl}

      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <LimitGauges session={session} weekly={weekly} thresholds={t} vertical={layout === 'tall'} />
      </div>

      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <StatCards session={session} weekly={weekly} apiCosts={apiCosts} apiCostStatus={apiCostStatus} wrap={layout === 'tall'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mainGridColumns, gap: 8, flex: 1, minHeight: 0, overflowY: layout === 'tall' ? 'auto' : 'hidden' }}>
        {layout === 'tall' ? (
          <>
            <WeeklyChart dailyBreakdown={dailyBreakdown} />
            <LimitLearning limits={limits} apiCosts={apiCosts} apiCostStatus={apiCostStatus} />
            <div style={{ minHeight: 240 }}><SessionTable sessions={sessions} /></div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0 }}><WeeklyChart dailyBreakdown={dailyBreakdown} /></div>
              <div style={{ flexShrink: 0 }}><LimitLearning limits={limits} apiCosts={apiCosts} apiCostStatus={apiCostStatus} /></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0 }}><SessionTable sessions={sessions} /></div>
              {layout === 'wide-2to1' && <div style={{ flexShrink: 0, height: 200 }}><ModelBreakdown breakdown={modelBreakdown} /></div>}
            </div>
            {layout === 'standard' && <ModelBreakdown breakdown={modelBreakdown} />}
          </>
        )}
      </div>

      {footerEl}
      {settingsOpen && <SettingsModal thresholds={t} onClose={() => setSettingsOpen(false)} />}
      {displayPickerOpen && renderDisplayPicker(displays, movingDisplay, pickDisplay, () => setDisplayPickerOpen(false))}
    </div>
  )
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700;800&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { width: 100%; height: 100%; background: #06131a; }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: #0d1d26; }
      ::-webkit-scrollbar-thumb { background: #21475a; border-radius: 2px; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    `}</style>
  )
}

function shellStyle(layout) {
  return {
    background: BG,
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    padding: '12px 16px',
    fontFamily: FONT_SANS,
    color: '#e5f1f7',
    display: 'flex',
    flexDirection: 'column',
    fontSize: `${FONT_SCALE[layout]}rem`,
  }
}

function headerButtonStyle() {
  return {
    background: 'none',
    border: '1px solid #21475a',
    borderRadius: 6,
    color: '#89a6b8',
    cursor: 'pointer',
    padding: '4px 10px',
    fontSize: 11,
    fontFamily: FONT_MONO,
    minWidth: 34,
  }
}

function renderDisplayPicker(displays, movingDisplay, onPick, onClose) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(event) => event.stopPropagation()} style={{ background: '#0d1d26', border: '1px solid #21475a', borderRadius: 10, padding: '16px 20px', minWidth: 280, fontFamily: "'JetBrains Mono', monospace" }}>
        <div style={{ fontSize: 11, color: '#89a6b8', marginBottom: 12, letterSpacing: '0.08em' }}>MOVE TO DISPLAY</div>
        {displays.map((display) => (
          <button
            key={display.id}
            onClick={() => onPick(display.id)}
            disabled={movingDisplay !== null}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: '1px solid #21475a', borderRadius: 6, color: '#e5f1f7', cursor: movingDisplay ? 'wait' : 'pointer', padding: '8px 12px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, opacity: movingDisplay && movingDisplay !== display.id ? 0.4 : 1 }}
          >
            <span>{display.label || `Display ${display.id}`}</span>
            <span style={{ color: '#627f8f', fontSize: 10, marginLeft: 12 }}>
              {display.bounds.width}x{display.bounds.height}
              {display.isPrimary && <span style={{ color: '#55e0a6', marginLeft: 6 }}>primary</span>}
              {movingDisplay === display.id && <span style={{ color: '#5ec8ff', marginLeft: 6 }}>moving...</span>}
            </span>
          </button>
        ))}
        <button onClick={onClose} style={{ display: 'block', width: '100%', marginTop: 4, background: 'none', border: 'none', color: '#627f8f', cursor: 'pointer', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", padding: '4px 0' }}>
          cancel
        </button>
      </div>
    </div>
  )
}
