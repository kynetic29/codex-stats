import { useState, useEffect } from 'react'
import { CARD_BG, BORDER, DIM, TEXT, FONT_MONO, FONT_SANS, BLUE, EMERALD } from '../theme'

function ThresholdRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: DIM }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number"
          min="1"
          max="99"
          value={value}
          onChange={(event) => onChange(Math.max(1, Math.min(99, parseInt(event.target.value, 10) || 0)))}
          style={{ width: 56, padding: '5px 8px', background: '#06131a', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 13, fontFamily: FONT_MONO, outline: 'none', textAlign: 'right' }}
        />
        <span style={{ fontSize: 12, color: DIM }}>%</span>
      </div>
    </div>
  )
}

export default function SettingsModal({ thresholds, onClose }) {
  const [sWarn, setSWarn] = useState(thresholds?.sessionWarnPct ?? 60)
  const [sCrit, setSCrit] = useState(thresholds?.sessionCritPct ?? 80)
  const [wWarn, setWWarn] = useState(thresholds?.weeklyWarnPct ?? 60)
  const [wCrit, setWCrit] = useState(thresholds?.weeklyCritPct ?? 80)
  const [autoStart, setAutoStart] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adminApiKey, setAdminApiKey] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')
  const [exportScope, setExportScope] = useState('sessions')
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)

  useEffect(() => {
    window.electronAPI?.getAutoStart().then((value) => setAutoStart(!!value)).catch(() => {})
    window.electronAPI?.getConfig().then((config) => setAdminApiKey(config?.adminApiKey || '')).catch(() => {})
  }, [])

  async function handleExport() {
    setExporting(true)
    setExportResult(null)
    try {
      const result = await window.electronAPI?.exportData({ format: exportFormat, scope: exportScope })
      setExportResult(result)
    } catch (error) {
      setExportResult({ ok: false, reason: error.message })
    } finally {
      setExporting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await window.electronAPI?.updateConfig({
        sessionWarnPct: sWarn,
        sessionCritPct: sCrit,
        weeklyWarnPct: wWarn,
        weeklyCritPct: wCrit,
        adminApiKey: adminApiKey.trim() || null,
      })
      await window.electronAPI?.setAutoStart(autoStart)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(event) => event.stopPropagation()} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px', width: 400, fontFamily: FONT_SANS }}>
        <div style={{ fontSize: 11, color: '#89a6b8', letterSpacing: '0.08em', marginBottom: 16 }}>SETTINGS</div>

        <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.06em', marginBottom: 8, textTransform: 'uppercase' }}>Alert Thresholds</div>
        <ThresholdRow label="5-hour warn at" value={sWarn} onChange={setSWarn} />
        <ThresholdRow label="5-hour alert at" value={sCrit} onChange={setSCrit} />
        <div style={{ borderTop: `1px solid ${BORDER}`, margin: '10px 0' }} />
        <ThresholdRow label="7-day warn at" value={wWarn} onChange={setWWarn} />
        <ThresholdRow label="7-day alert at" value={wCrit} onChange={setWCrit} />

        <div style={{ borderTop: `1px solid ${BORDER}`, margin: '14px 0 12px' }} />

        <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.06em', marginBottom: 8, textTransform: 'uppercase' }}>OpenAI Admin Key</div>
        <input
          type="password"
          value={adminApiKey}
          onChange={(event) => setAdminApiKey(event.target.value)}
          placeholder="sk-admin-..."
          style={{ width: '100%', padding: '8px 10px', background: '#06131a', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12, fontFamily: FONT_MONO, outline: 'none', marginBottom: 6 }}
        />
        <div style={{ fontSize: 10, color: '#627f8f', marginBottom: 12 }}>
          Save here any time to update the key used for organization cost sync.
        </div>

        <div style={{ borderTop: `1px solid ${BORDER}`, margin: '14px 0 12px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: DIM }}>Launch on system startup</span>
          <button onClick={() => setAutoStart((value) => !value)} style={{ width: 40, height: 22, borderRadius: 11, background: autoStart ? EMERALD : '#334155', border: 'none', cursor: 'pointer', position: 'relative' }}>
            <span style={{ position: 'absolute', top: 3, left: autoStart ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#627f8f', marginBottom: 16 }}>Automatically open CodexStats when Windows starts</div>

        <div style={{ borderTop: `1px solid ${BORDER}`, margin: '14px 0 12px' }} />

        <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.06em', marginBottom: 10, textTransform: 'uppercase' }}>Export Data</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <Picker label="Format" options={['csv', 'json']} value={exportFormat} onChange={(value) => { setExportFormat(value); setExportResult(null) }} />
          <Picker label="Scope" options={['sessions', 'requests', 'all']} value={exportScope} onChange={(value) => { setExportScope(value); setExportResult(null) }} flex={2} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <button onClick={handleExport} disabled={exporting} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: exporting ? DIM : '#e5f1f7', cursor: exporting ? 'wait' : 'pointer', padding: '6px 14px', fontSize: 11, fontFamily: FONT_MONO, opacity: exporting ? 0.6 : 1 }}>
            {exporting ? 'Saving...' : 'Export...'}
          </button>
          {exportResult && <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: exportResult.ok ? '#55e0a6' : '#ff6b57', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exportResult.ok ? 'Saved' : exportResult.reason === 'canceled' ? 'Canceled' : `Error: ${exportResult.reason}`}</span>}
        </div>
        {exportFormat === 'csv' && exportScope === 'all' && <div style={{ fontSize: 10, color: '#627f8f', marginBottom: 8 }}>CSV + all exports sessions only. Export requests separately for the full turn log.</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: DIM, cursor: 'pointer', padding: '6px 14px', fontSize: 11, fontFamily: FONT_MONO }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ background: BLUE, border: 'none', borderRadius: 6, color: '#03202c', cursor: saving ? 'wait' : 'pointer', padding: '6px 14px', fontSize: 11, fontWeight: 700, fontFamily: FONT_MONO, opacity: saving ? 0.6 : 1 }}>{saving ? '...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function Picker({ label, options, value, onChange, flex = 1 }) {
  return (
    <div style={{ flex }}>
      <div style={{ fontSize: 10, color: '#627f8f', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 2 }}>
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            style={{ flex: 1, background: value === option ? '#112531' : 'none', border: `1px solid ${value === option ? '#21475a' : BORDER}`, borderRadius: 5, color: value === option ? '#e5f1f7' : DIM, cursor: 'pointer', padding: '5px 0', fontSize: 10, fontFamily: FONT_MONO, textTransform: option.length <= 4 ? 'uppercase' : 'none' }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
