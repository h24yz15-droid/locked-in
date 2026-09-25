import { useState } from 'react'
import { XIcon, TrashIcon, CheckIcon } from './Icons'

interface OffTab {
  id: number
  title: string
  domain: string
  favicon: string
  selected: boolean
}

const offTabs: OffTab[] = [
  { id: 1, title: 'Lo-fi Hip Hop Radio – Beats to Study', domain: 'youtube.com', favicon: '📺', selected: true },
  { id: 2, title: "Reddit · r/programming", domain: 'reddit.com', favicon: '🤖', selected: true },
  { id: 3, title: 'Dribbble – Design Inspiration', domain: 'dribbble.com', favicon: '🏀', selected: false },
]

interface Props { onDismiss: () => void }

export default function CleanupCard({ onDismiss }: Props) {
  const [tabs, setTabs] = useState<OffTab[]>(offTabs)
  const [dismissed, setDismissed] = useState(false)

  const selectedCount = tabs.filter(t => t.selected).length
  const toggle = (id: number) => setTabs(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t))

  const handleAction = (action: 'close' | 'keep') => {
    setDismissed(true)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      className="cleanup-card"
      style={{
        position: 'absolute',
        top: 0, right: 0,
        width: 240,
        borderRadius: '0 12px 12px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        opacity: dismissed ? 0 : 1,
        transform: dismissed ? 'translateX(12px)' : 'translateX(0)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid var(--edge)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
      }}>
        <div>
          <div style={{
            fontSize: 12, fontWeight: 800, color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}>
            Still Locked In? 🔒
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2, lineHeight: 1.35 }}>
            These tabs look off-topic
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{
            color: 'var(--ink3)', padding: 3, borderRadius: 5,
            transition: 'all 0.12s ease', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--ink)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink3)' }}
        >
          <XIcon size={13} strokeWidth={2} />
        </button>
      </div>

      {/* Tab list */}
      <div style={{ padding: '6px 4px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => toggle(tab.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 8px', borderRadius: 7,
              background: tab.selected ? 'var(--surface2)' : 'transparent',
              transition: 'background 0.12s ease', textAlign: 'left',
              border: '1px solid transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { if (!tab.selected) e.currentTarget.style.background = 'var(--surface2)' }}
            onMouseLeave={e => { if (!tab.selected) e.currentTarget.style.background = 'transparent' }}
          >
            {/* Checkbox */}
            <div style={{
              width: 15, height: 15, borderRadius: 4, flexShrink: 0,
              border: tab.selected ? 'none' : '1.5px solid var(--edge)',
              background: tab.selected ? 'var(--cyan)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}>
              {tab.selected && (
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <polyline points="1.5 5 4 7.5 8.5 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Favicon */}
            <span style={{ fontSize: 13, flexShrink: 0 }}>{tab.favicon}</span>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--ink)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {tab.title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink3)' }}>{tab.domain}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{
        padding: '8px 10px 10px',
        borderTop: '1px solid var(--edge)',
        display: 'flex', gap: 6,
      }}>
        <button
          onClick={() => handleAction('keep')}
          style={{
            flex: 1, padding: '7px 8px',
            borderRadius: 7, border: '1px solid var(--edge)',
            background: 'var(--surface2)',
            fontSize: 11, fontWeight: 600, color: 'var(--ink2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--edge)'; e.currentTarget.style.color = 'var(--ink2)' }}
        >
          <CheckIcon size={11} strokeWidth={2.5} /> Keep {selectedCount > 0 ? `(${selectedCount})` : 'all'}
        </button>
        <button
          onClick={() => handleAction('close')}
          style={{
            flex: 1, padding: '7px 8px',
            borderRadius: 7, border: 'none',
            background: 'var(--red-dim)',
            fontSize: 11, fontWeight: 700, color: 'var(--red)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red)' }}
        >
          <TrashIcon size={11} strokeWidth={2} /> Close rest
        </button>
      </div>
    </div>
  )
}
