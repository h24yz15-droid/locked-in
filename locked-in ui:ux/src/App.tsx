import { useState } from 'react'
import { SunIcon, MoonIcon, LockIcon } from './components/Icons'
import MainPopup from './screens/MainPopup'
import WorkflowSetup from './screens/WorkflowSetup'
import TabPrompt from './screens/TabPrompt'
import ChecklistScreen from './screens/ChecklistScreen'
import SavedTabsScreen from './screens/SavedTabsScreen'
import TimerScreen from './screens/TimerScreen'
import SettingsScreen from './screens/SettingsScreen'
import CleanupCard from './components/CleanupCard'

type Screen = 'main' | 'setup' | 'prompt' | 'checklist' | 'saved' | 'timer' | 'settings'

const screens: { id: Screen; label: string; desc: string }[] = [
  { id: 'main', label: 'Main Popup', desc: 'Active session' },
  { id: 'setup', label: 'Workflow Setup', desc: 'New session' },
  { id: 'prompt', label: 'Tab Prompt', desc: 'Keep / Save / Close' },
  { id: 'checklist', label: 'Checklist', desc: 'Tasks' },
  { id: 'saved', label: 'Saved Tabs', desc: 'Later list' },
  { id: 'timer', label: 'Timer', desc: 'Focus session' },
  { id: 'settings', label: 'Settings', desc: 'Preferences' },
]

export default function App() {
  const [dark, setDark] = useState(false)
  const [screen, setScreen] = useState<Screen>('main')
  const [showCleanup, setShowCleanup] = useState(true)

  const navigate = (s: string) => setScreen(s as Screen)

  const renderScreen = () => {
    switch (screen) {
      case 'main': return <MainPopup onNavigate={navigate} />
      case 'setup': return <WorkflowSetup />
      case 'prompt': return <TabPrompt />
      case 'checklist': return <ChecklistScreen onNavigate={navigate} />
      case 'saved': return <SavedTabsScreen onNavigate={navigate} />
      case 'timer': return <TimerScreen onNavigate={navigate} />
      case 'settings': return <SettingsScreen onNavigate={navigate} dark={dark} onToggleDark={() => setDark(d => !d)} />
      default: return <MainPopup onNavigate={navigate} />
    }
  }

  return (
    <div className={dark ? 'dark' : ''} style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s ease' }}>
      {/* Page layout */}
      <div style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 48px',
        gap: 28,
      }}>

        {/* Page header */}
        <div style={{
          width: '100%', maxWidth: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LockIcon size={15} strokeWidth={2.2} style={{ color: 'var(--bg)' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Locked In</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 0 }}>UI/UX Design System · V1</div>
            </div>
          </div>

          <button
            onClick={() => setDark(d => !d)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 12px', borderRadius: 8,
              border: '1.5px solid var(--edge)',
              background: 'var(--surface)',
              color: 'var(--ink2)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            {dark ? <SunIcon size={14} strokeWidth={1.75} /> : <MoonIcon size={14} strokeWidth={1.75} />}
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

        {/* Screen nav pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
          maxWidth: 900,
        }}>
          {screens.map(s => (
            <button
              key={s.id}
              onClick={() => { setScreen(s.id); if (s.id === 'main') setShowCleanup(true) }}
              style={{
                padding: '6px 12px', borderRadius: 20,
                border: `1.5px solid ${screen === s.id ? 'var(--cyan)' : 'var(--edge)'}`,
                background: screen === s.id ? 'var(--cyan-dim)' : 'var(--surface)',
                color: screen === s.id ? 'var(--cyan)' : 'var(--ink2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              {s.label}
              <span style={{
                fontSize: 10, color: screen === s.id ? 'var(--cyan)' : 'var(--ink3)',
                marginLeft: 5, fontWeight: 400,
              }}>
                {s.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Main demo area */}
        <div style={{
          display: 'flex', gap: 32, alignItems: 'flex-start',
          flexWrap: 'wrap', justifyContent: 'center',
          width: '100%', maxWidth: 900,
        }}>

          {/* Extension popup frame */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 500 }}>
              Extension Popup · 360 × 560px
            </div>

            {/* Chrome-style popup wrapper */}
            <div style={{
              position: 'relative',
              width: 360,
            }}>
              {/* Popup */}
              <div style={{
                width: 360,
                height: screen === 'setup' ? 560 : 560,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: dark
                  ? '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6)'
                  : '0 0 0 1px rgba(66,52,52,0.12), 0 20px 60px rgba(66,52,52,0.18)',
                display: 'flex', flexDirection: 'column',
                position: 'relative',
                transition: 'box-shadow 0.3s ease',
              }}>
                {renderScreen()}
              </div>

              {/* Cleanup card overlay — shown on main screen */}
              {screen === 'main' && showCleanup && (
                <div style={{
                  position: 'absolute',
                  top: -2, right: -2,
                  zIndex: 200,
                }}>
                  <CleanupCard onDismiss={() => setShowCleanup(false)} />
                </div>
              )}
            </div>

            {/* Cleanup card toggle */}
            {screen === 'main' && !showCleanup && (
              <button
                onClick={() => setShowCleanup(true)}
                style={{
                  fontSize: 11, color: 'var(--cyan)', fontWeight: 600,
                  padding: '5px 12px', borderRadius: 6,
                  border: '1px solid var(--cyan-border)',
                  background: 'var(--cyan-dim)', cursor: 'pointer',
                }}
              >
                Show "Still Locked In?" card
              </button>
            )}
          </div>

          {/* Screen info + component legend */}
          <div style={{
            flex: '1 1 240px', maxWidth: 320,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {/* Current screen info */}
            <div style={{
              padding: '16px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Viewing
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 4 }}>
                {screens.find(s => s.id === screen)?.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.5 }}>
                {getScreenDescription(screen)}
              </div>
            </div>

            {/* Design tokens */}
            <div style={{
              padding: '16px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                Brand Palette
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { name: 'Deep Brown', value: '#423434', role: 'Text, branding' },
                  { name: 'Cyan', value: '#26C5E1', role: 'Primary actions' },
                  { name: 'Green', value: '#7ED957', role: 'Success, progress' },
                ].map(c => (
                  <div key={c.value} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: c.value,
                      border: '1px solid var(--edge)',
                    }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: "'DM Mono', monospace" }}>{c.value} · {c.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography */}
            <div style={{
              padding: '16px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                Typography
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Plus Jakarta Sans</div>
                  <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>UI text · 400 / 500 / 600 / 700 / 800</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 500, color: 'var(--ink2)', letterSpacing: '0.02em' }}>00:00 DM Mono</div>
                  <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>Timer, data, counts · 400 / 500</div>
                </div>
              </div>
            </div>

            {/* States guide */}
            <div style={{
              padding: '16px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                Interaction States
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Hover', style: { background: 'var(--surface2)', border: '1px solid var(--edge)' } },
                  { label: 'Focus', style: { border: '2px solid var(--cyan)', boxShadow: '0 0 0 3px var(--cyan-dim)' } },
                  { label: 'Active', style: { background: 'var(--cyan)', border: '1px solid var(--cyan)' } },
                  { label: 'Disabled', style: { background: 'var(--surface2)', border: '1px solid var(--edge)', opacity: 0.4 } },
                ].map(state => (
                  <div key={state.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 24, borderRadius: 6,
                      ...state.style,
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 500 }}>{state.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* All screens overview */}
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--ink3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: 14,
          }}>
            All Screens Overview
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 10,
          }}>
            {screens.map(s => (
              <button
                key={s.id}
                onClick={() => { setScreen(s.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{
                  padding: '12px 14px', borderRadius: 10,
                  border: `1.5px solid ${screen === s.id ? 'var(--cyan)' : 'var(--edge)'}`,
                  background: screen === s.id ? 'var(--cyan-dim)' : 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s ease',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
                onMouseEnter={e => { if (screen !== s.id) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = 'var(--ink3)' } }}
                onMouseLeave={e => { if (screen !== s.id) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--edge)' } }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: screen === s.id ? 'var(--cyan)' : 'var(--ink)' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Empty / Loading / Error states showcase */}
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--ink3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: 14,
          }}>
            UI States
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 10,
          }}>
            <StateCard title="Empty — No Workflow" type="empty" />
            <StateCard title="Loading — Analyzing Tab" type="loading" />
            <StateCard title="Error — Session Lost" type="error" />
            <StateCard title="Success — Session Complete" type="success" />
          </div>
        </div>

      </div>
    </div>
  )
}

function StateCard({ title, type }: { title: string; type: 'empty' | 'loading' | 'error' | 'success' }) {
  return (
    <div style={{
      padding: '20px 16px',
      borderRadius: 10, border: '1px solid var(--edge)',
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 10, textAlign: 'center',
    }}>
      {type === 'empty' && (
        <>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--surface2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>🔓</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>No active workflow</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.5 }}>Set a workflow to start your focus session.</div>
          </div>
          <button style={{
            padding: '7px 16px', borderRadius: 8,
            background: 'var(--cyan)', color: 'var(--cyan-fg)',
            fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
          }}>
            Start a session →
          </button>
        </>
      )}

      {type === 'loading' && (
        <>
          <div style={{ position: 'relative', width: 44, height: 44 }}>
            <svg width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--edge)" strokeWidth="3" />
              <circle
                cx="22" cy="22" r="18" fill="none"
                stroke="var(--cyan)" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="28 85"
                style={{ animation: 'spin 1s linear infinite', transformOrigin: '22px 22px' }}
              />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>Analyzing tab…</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Checking relevance to your workflow</div>
          </div>
          <div style={{
            display: 'flex', gap: 3, marginTop: 2,
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--cyan)',
                animation: `dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </>
      )}

      {type === 'error' && (
        <>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--red-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>⚠️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>Session data lost</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.5 }}>Something went wrong. Your saved tabs are safe.</div>
          </div>
          <button style={{
            padding: '7px 16px', borderRadius: 8,
            background: 'var(--red-dim)', color: 'var(--red)',
            border: '1px solid var(--red-dim)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Try again
          </button>
        </>
      )}

      {type === 'success' && (
        <>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--green-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <polyline points="4 12 9 17 20 6" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>Session complete! 🎉</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.5 }}>
              25 min · 5 tasks done · 3 tabs closed
            </div>
          </div>
          <button style={{
            padding: '7px 16px', borderRadius: 8,
            background: 'var(--green)', color: 'var(--green-fg)',
            fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
          }}>
            Start next session
          </button>
        </>
      )}
    </div>
  )
}

function getScreenDescription(screen: Screen): string {
  switch (screen) {
    case 'main': return 'The main popup showing an active workflow session. Displays the current workflow, session timer strip, tab stats, and a checklist preview with bottom navigation.'
    case 'setup': return 'Two-step workflow setup: name the workflow then choose a focus timer duration. Full-window flow for new sessions.'
    case 'prompt': return 'Appears when a new tab is opened during a session. Shows AI relevance score and three decision actions: Keep, Save for Later, or Close.'
    case 'checklist': return 'Full checklist view with add/edit/delete/complete, drag handles, and a completed items section.'
    case 'saved': return 'Saved tabs list with per-tab open and delete actions, plus open-all button. Empty state shown when list is clear.'
    case 'timer': return 'Focus timer with circular SVG progress ring, play/pause/reset controls, and a session plan track showing completed and upcoming sessions.'
    case 'settings': return 'Extension on/off master switch, session preferences, tab behavior settings, dark mode toggle, and notifications.'
    default: return ''
  }
}
