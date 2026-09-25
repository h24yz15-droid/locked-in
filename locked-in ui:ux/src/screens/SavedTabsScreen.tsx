import { useState } from 'react'
import { ChevronLeftIcon, ExternalIcon, TrashIcon, BookmarkIcon } from '../components/Icons'

interface Tab {
  id: number
  title: string
  domain: string
  url: string
  favicon: string
  savedAt: string
}

const savedTabs: Tab[] = [
  {
    id: 1,
    title: 'React – A JavaScript library for building UIs',
    domain: 'react.dev',
    url: 'https://react.dev',
    favicon: '⚛️',
    savedAt: '10 min ago',
  },
  {
    id: 2,
    title: 'TypeScript: Documentation – Everyday Types',
    domain: 'typescriptlang.org',
    url: 'https://typescriptlang.org/docs',
    favicon: '🔷',
    savedAt: '24 min ago',
  },
  {
    id: 3,
    title: 'TanStack Query – Powerful data synchronization',
    domain: 'tanstack.com',
    url: 'https://tanstack.com/query',
    favicon: '🟠',
    savedAt: '1h ago',
  },
]

interface Props { onNavigate: (s: string) => void }

export default function SavedTabsScreen({ onNavigate }: Props) {
  const [tabs, setTabs] = useState<Tab[]>(savedTabs)
  const [deleted, setDeleted] = useState<number | null>(null)

  const remove = (id: number) => {
    setDeleted(id)
    setTimeout(() => {
      setTabs(prev => prev.filter(t => t.id !== id))
      setDeleted(null)
    }, 300)
  }

  return (
    <div className="screen-enter flex flex-col h-full" style={{ background: 'var(--surface)' }}>

      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--edge)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => onNavigate('main')} style={{ color: 'var(--ink3)', padding: 2 }}>
            <ChevronLeftIcon size={16} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Saved Tabs</span>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, color: 'var(--cyan)', fontWeight: 500,
          padding: '2px 7px', borderRadius: 5,
          background: 'var(--cyan-dim)',
        }}>
          {tabs.length} saved
        </span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tabs.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink3)',
            }}>
              <BookmarkIcon size={20} strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>No saved tabs</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5 }}>
                Tabs you save during your session<br />will appear here.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {tabs.map((tab, i) => (
              <div
                key={tab.id}
                style={{
                  opacity: deleted === tab.id ? 0 : 1,
                  transform: deleted === tab.id ? 'translateX(-8px)' : 'none',
                  transition: 'all 0.25s ease',
                  borderBottom: i < tabs.length - 1 ? '1px solid var(--edge2)' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Favicon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--surface2)',
                    border: '1px solid var(--edge)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {tab.favicon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginBottom: 2,
                    }}>
                      {tab.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{tab.domain}</span>
                      <span style={{ fontSize: 10, color: 'var(--edge)', userSelect: 'none' }}>·</span>
                      <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{tab.savedAt}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <a
                      href={tab.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: 6, color: 'var(--ink3)', borderRadius: 6,
                        display: 'flex', alignItems: 'center',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.background = 'var(--cyan-dim)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink3)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <ExternalIcon size={13} strokeWidth={1.75} />
                    </a>
                    <button
                      onClick={() => remove(tab.id)}
                      style={{
                        padding: 6, color: 'var(--ink3)', borderRadius: 6,
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink3)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <TrashIcon size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Open all */}
            <div style={{ padding: '12px 14px' }}>
              <button style={{
                width: '100%', padding: '10px',
                borderRadius: 9, border: '1.5px solid var(--cyan-border)',
                background: 'var(--cyan-dim)',
                color: 'var(--cyan)', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}>
                <ExternalIcon size={13} strokeWidth={2} />
                Open all saved tabs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
