import { useState } from 'react'
import { GlobeIcon, XIcon, BookmarkIcon, CheckIcon } from '../components/Icons'

const tabs = [
  {
    url: 'github.com/facebook/react',
    title: 'React – A JavaScript library for building user interfaces',
    domain: 'github.com',
    favicon: '⚛️',
    relevance: 0.85,
  },
  {
    url: 'youtube.com/watch?v=abc123',
    title: 'Lo-fi Hip Hop Radio – Beats to Relax/Study To',
    domain: 'youtube.com',
    favicon: '📺',
    relevance: 0.12,
  },
]

export default function TabPrompt() {
  const [tabIndex, setTabIndex] = useState(0)
  const [decided, setDecided] = useState<string | null>(null)

  const tab = tabs[tabIndex]

  const handleDecision = (decision: string) => {
    setDecided(decision)
    setTimeout(() => {
      setDecided(null)
      setTabIndex(i => (i + 1) % tabs.length)
    }, 1200)
  }

  const relevanceColor = tab.relevance > 0.6 ? 'var(--green)' : tab.relevance > 0.35 ? 'var(--cyan)' : 'var(--red)'
  const relevanceLabel = tab.relevance > 0.6 ? 'Likely relevant' : tab.relevance > 0.35 ? 'Possibly relevant' : 'Probably off-topic'

  return (
    <div className="screen-enter flex flex-col h-full" style={{ background: 'var(--surface)' }}>

      {/* Header stripe */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--edge)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          New Tab Opened
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 20,
          background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-border)',
        }}>
          <div className="pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--cyan)' }}>Researching React patterns</span>
        </div>
      </div>

      {/* Tab info */}
      <div style={{ flex: 1, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Tab card */}
        <div style={{
          padding: '14px',
          borderRadius: 12,
          background: 'var(--surface2)',
          border: '1px solid var(--edge)',
          marginBottom: 14,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'var(--surface)',
            border: '1px solid var(--edge)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            {tab.favicon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--ink)',
              lineHeight: 1.3, marginBottom: 3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {tab.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <GlobeIcon size={11} strokeWidth={1.5} className="text-[var(--ink3)]" />
              <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{tab.domain}</span>
            </div>
          </div>
        </div>

        {/* Relevance indicator */}
        <div style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: 'var(--surface2)',
          border: '1px solid var(--edge)',
          marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
              AI Relevance
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: relevanceColor }}>
              {relevanceLabel}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ height: 4, width: 80, background: 'var(--edge)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${tab.relevance * 100}%`,
                background: relevanceColor, borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11, color: relevanceColor, fontWeight: 500,
            }}>{Math.round(tab.relevance * 100)}%</span>
          </div>
        </div>

        {/* Decision question */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.4 }}>
            What do you want to do with this tab?
          </div>
        </div>

        {/* Action buttons */}
        {decided ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            alignItems: 'center', padding: '12px 0',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: decided === 'keep' ? 'var(--green-dim)' : decided === 'save' ? 'var(--cyan-dim)' : 'var(--red-dim)',
              border: `2px solid ${decided === 'keep' ? 'var(--green)' : decided === 'save' ? 'var(--cyan)' : 'var(--red)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {decided === 'keep' && <CheckIcon size={20} strokeWidth={2.5} className="text-[var(--green)]" />}
              {decided === 'save' && <BookmarkIcon size={18} strokeWidth={2} className="text-[var(--cyan)]" />}
              {decided === 'close' && <XIcon size={20} strokeWidth={2.5} className="text-[var(--red)]" />}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: decided === 'keep' ? 'var(--green)' : decided === 'save' ? 'var(--cyan)' : 'var(--red)',
            }}>
              {decided === 'keep' ? 'Tab kept' : decided === 'save' ? 'Saved for later' : 'Tab closed'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Keep */}
            <button
              onClick={() => handleDecision('keep')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid var(--edge)',
                background: 'var(--surface)',
                cursor: 'pointer', transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.background = 'var(--green-dim)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--edge)'; e.currentTarget.style.background = 'var(--surface)' }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--green-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <CheckIcon size={14} strokeWidth={2.2} className="text-[var(--green)]" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Keep</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>This tab stays open</div>
              </div>
            </button>

            {/* Save for Later */}
            <button
              onClick={() => handleDecision('save')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid var(--edge)',
                background: 'var(--surface)',
                cursor: 'pointer', transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.background = 'var(--cyan-dim)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--edge)'; e.currentTarget.style.background = 'var(--surface)' }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--cyan-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <BookmarkIcon size={14} strokeWidth={2} className="text-[var(--cyan)]" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Save for Later</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Close now, revisit after session</div>
              </div>
            </button>

            {/* Close */}
            <button
              onClick={() => handleDecision('close')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid var(--edge)',
                background: 'var(--surface)',
                cursor: 'pointer', transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--edge)'; e.currentTarget.style.background = 'var(--surface)' }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--red-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <XIcon size={14} strokeWidth={2.2} className="text-[var(--red)]" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Close</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Remove this tab now</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
