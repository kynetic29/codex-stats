import { useEffect, useState } from 'react'

const DIM = '#89a6b8'
const BG = '#06131a'
const CARD_BG = '#0d1d26'
const BORDER = '#183342'
const ACCENT = '#5ec8ff'

const primaryBtn = {
  padding: '10px 24px',
  background: 'linear-gradient(135deg, #1ea6d6, #55e0a6)',
  border: 'none',
  borderRadius: 8,
  color: '#03202c',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'IBM Plex Sans', sans-serif",
}

const ghostBtn = {
  padding: '10px 24px',
  background: 'transparent',
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  color: DIM,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: "'IBM Plex Sans', sans-serif",
}

const inputStyle = (active) => ({
  width: '100%',
  padding: '10px 14px',
  background: '#112531',
  border: `1px solid ${active ? `${ACCENT}66` : BORDER}`,
  borderRadius: 8,
  color: '#e5f1f7',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none',
})

const STEPS = [
  { title: 'Welcome to CodexStats', subtitle: 'A full-screen monitor for Codex subscription usage and OpenAI API spend' },
  { title: 'OpenAI Admin Key', subtitle: 'Optional: unlock your organization API costs from the official billing endpoint' },
  { title: 'Choose Display', subtitle: 'Pick the monitor that should stay dedicated to the dashboard' },
]

export default function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [adminApiKey, setAdminApiKey] = useState('')
  const [displays, setDisplays] = useState([])
  const [selectedDisplay, setSelectedDisplay] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (step !== 2) return
    window.electronAPI.getDisplays().then((list) => {
      setDisplays(list)
      const preferred = list.find((display) => !display.isPrimary) || list[0]
      if (preferred) setSelectedDisplay(preferred.id)
    })
  }, [step])

  async function handleFinish() {
    if (!selectedDisplay || saving) return
    setSaving(true)
    setError('')
    try {
      await window.electronAPI.completeOnboarding({
        adminApiKey: adminApiKey.trim() || null,
        displayId: selectedDisplay,
      })
    } catch {
      setError('Failed to save configuration. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: BG,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'IBM Plex Sans', sans-serif",
      color: '#e5f1f7',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        button:disabled { cursor: not-allowed; }
        input::placeholder { color: #476574; }
      `}</style>

      <div style={{
        position: 'relative',
        width: 500,
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '36px 40px',
        boxShadow: '0 18px 54px rgba(0,0,0,0.45)',
      }}>
        <button
          onClick={() => window.electronAPI.quit()}
          title="Exit"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: DIM,
            fontSize: 18,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
          }}
        >
          x
        </button>

        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {STEPS.map((_, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: index <= step ? ACCENT : BORDER,
              }}
            />
          ))}
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {STEPS[step].title}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: DIM }}>{STEPS[step].subtitle}</p>
        </div>

        {step === 0 && (
          <div style={{ fontSize: 14, color: '#c8d8e2', lineHeight: 1.7 }}>
            <p style={{ marginTop: 0 }}>
              CodexStats watches your local Codex session logs and turns them into a dedicated monitor view:
              live 5-hour and 7-day subscription gauges, per-session tables, model mix, and activity charts.
            </p>
            <p style={{ color: DIM, fontSize: 13 }}>
              When you add an OpenAI admin key, it also pulls official organization API costs so the same dashboard
              can show subscription usage and paid API spend side by side.
            </p>
            <p style={{ color: DIM, fontSize: 13, marginBottom: 0 }}>
              Press <kbd style={{ background: BORDER, borderRadius: 4, padding: '1px 5px', fontFamily: 'JetBrains Mono', fontSize: 11 }}>Ctrl+Shift+Q</kbd> to quit and
              <kbd style={{ background: BORDER, borderRadius: 4, padding: '1px 5px', fontFamily: 'JetBrains Mono', fontSize: 11, marginLeft: 6 }}>Ctrl+Shift+R</kbd> to reset setup.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <label style={{
              fontSize: 11,
              color: DIM,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 8,
            }}>
              OpenAI Admin Key
            </label>
            <input
              autoFocus
              type="password"
              value={adminApiKey}
              onChange={(event) => setAdminApiKey(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && setStep(2)}
              placeholder="sk-admin-... (optional)"
              style={inputStyle(adminApiKey.length > 0)}
            />
            <p style={{ fontSize: 12, color: DIM, marginTop: 8 }}>
              This uses the official OpenAI organization costs endpoint and is best for tracking API spend across your org.
            </p>
            <p style={{ fontSize: 12, color: '#5e7a89', marginBottom: 0 }}>
              Leave this blank if you only want local Codex subscription usage from your desktop session logs.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            {displays.length === 0 ? (
              <div style={{ color: DIM, fontSize: 13 }}>Detecting displays...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displays.map((display) => {
                  const active = selectedDisplay === display.id
                  return (
                    <button
                      key={display.id}
                      onClick={() => setSelectedDisplay(display.id)}
                      style={{
                        padding: '14px 16px',
                        background: active ? '#112531' : 'transparent',
                        border: `1px solid ${active ? `${ACCENT}66` : BORDER}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        width: '100%',
                      }}
                    >
                      <div style={{
                        width: 38,
                        height: 26,
                        border: `2px solid ${active ? ACCENT : DIM}`,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <div style={{ width: 22, height: 14, background: active ? `${ACCENT}33` : BORDER, borderRadius: 2 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: active ? '#e5f1f7' : DIM,
                          fontFamily: "'JetBrains Mono', monospace",
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}>
                          {display.label}
                          {display.isPrimary && <span style={{ fontSize: 10, color: '#55e0a6', fontWeight: 400 }}>primary</span>}
                        </div>
                        <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>
                          {display.bounds.width} x {display.bounds.height}
                          {display.scaleFactor !== 1 && ` - ${display.scaleFactor}x`}
                        </div>
                      </div>
                      {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />}
                    </button>
                  )
                })}
              </div>
            )}
            {error && <p style={{ color: '#ff6b57', fontSize: 12, marginTop: 12, marginBottom: 0 }}>{error}</p>}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
          {step > 0 ? (
            <button onClick={() => setStep((value) => value - 1)} style={ghostBtn}>Back</button>
          ) : <div />}

          {step < 2 ? (
            <button onClick={() => setStep((value) => value + 1)} style={primaryBtn}>
              {step === 0 ? 'Get Started' : adminApiKey.trim() ? 'Continue' : 'Skip'}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!selectedDisplay || saving}
              style={{ ...primaryBtn, opacity: (!selectedDisplay || saving) ? 0.4 : 1 }}
            >
              {saving ? 'Launching...' : 'Launch Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
