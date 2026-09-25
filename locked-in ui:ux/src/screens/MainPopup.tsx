import { useState } from 'react'
import {
  LockIcon, SettingsIcon, TimerIcon, BookmarkIcon,
  ListIcon, ChevronRightIcon, EditIcon
} from '../components/Icons'

interface MainPopupProps {
  onNavigate: (screen: string) => void
}

const checklistItems = [
  { id: 1, text: 'Review component API docs', done: true },
  { id: 2, text: 'Set up Storybook for design system', done: true },
  { id: 3, text: 'Write unit tests for hooks', done: false },
  { id: 4, text: 'Refactor context providers', done: false },
  { id: 5, text: 'Update README with examples', done: false },
]

export default function MainPopup({ onNavigate }: MainPopupProps) {
  const [activeNav, setActiveNav] = useState('list')
  const done = checklistItems.filter(i => i.done).length
  const total = checklistItems.length
  const progress = (done / total) * 100

  const navItems = [
    { id: 'list', icon: ListIcon, label: 'Tasks' },
    { id: 'timer', icon: TimerIcon, label: 'Timer' },
    { id: 'saved', icon: BookmarkIcon, label: 'Saved' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <div className="screen-enter flex flex-col h-full" style={{ background: 'var(--surface)' }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--edge)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <LockIcon size={13} strokeWidth={2.2} className="text-[var(--surface)]" />
          </div>
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
            color: 'var(--ink)',
          }}>Locked In</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Active session dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className="pulse-dot" style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)',
            }} />
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Active</span>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            style={{ color: 'var(--ink3)', padding: 2, lineHeight: 1 }}
          >
            <SettingsIcon size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Workflow */}
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 3 }}>
              Current Workflow
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: 'var(--ink)',
              letterSpacing: '-0.02em', lineHeight: 1.25,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Researching React patterns
            </div>
          </div>
          <button style={{
            padding: '4px 6px', borderRadius: 6,
            border: '1px solid var(--edge)',
            background: 'var(--surface2)',
            color: 'var(--ink2)', flexShrink: 0, marginTop: 1,
          }}>
            <EditIcon size={12} strokeWidth={1.75} />
          </button>
        </div>

        {/* Session timer strip */}
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: 'var(--surface2)',
          borderRadius: 10,
          border: '1px solid var(--edge)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TimerIcon size={14} strokeWidth={1.75} style={{ color: 'var(--cyan)' }} className="text-[var(--cyan)]" />
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 14, fontWeight: 500,
              color: 'var(--ink)', letterSpacing: '0.02em',
            }}>24:37</span>
          </div>
          <div style={{ flex: 1, margin: '0 12px' }}>
            <div style={{
              height: 3, background: 'var(--edge)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                width: '82%', height: '100%',
                background: 'var(--cyan)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
          <button
            onClick={() => onNavigate('timer')}
            style={{
              fontSize: 11, fontWeight: 600, color: 'var(--cyan)',
              padding: '3px 8px', borderRadius: 5,
              background: 'var(--cyan-dim)',
              border: '1px solid var(--cyan-border)',
            }}
          >
            View
          </button>
        </div>
      </div>

      {/* Tabs summary */}
      <div style={{
        padding: '0 16px 12px',
        display: 'flex', gap: 8,
      }}>
        {[
          { label: 'Open tabs', value: '8', color: 'var(--ink)' },
          { label: 'Saved', value: '3', color: 'var(--cyan)' },
          { label: 'Closed today', value: '12', color: 'var(--ink3)' },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: 1, padding: '8px 10px',
            background: 'var(--surface2)',
            borderRadius: 8, border: '1px solid var(--edge)',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 15, fontWeight: 500,
              color: stat.color, lineHeight: 1,
            }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 3, fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Checklist section */}
      <div style={{
        flex: 1, padding: '0 16px 14px',
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Checklist
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: "'DM Mono', monospace" }}>
              {done}/{total}
            </span>
            <button
              onClick={() => onNavigate('checklist')}
              style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}
            >
              All <ChevronRightIcon size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 2, background: 'var(--edge)',
          borderRadius: 2, overflow: 'hidden', marginBottom: 10,
        }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'var(--green)', borderRadius: 2,
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {checklistItems.slice(0, 4).map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 8px',
              borderRadius: 7,
              background: 'transparent',
              transition: 'background 0.12s ease',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                border: item.done ? 'none' : '1.5px solid var(--edge)',
                background: item.done ? 'var(--green)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}>
                {item.done && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                    <polyline points="2 6 5 9 10 3" stroke="var(--green-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{
                fontSize: 13, color: item.done ? 'var(--ink3)' : 'var(--ink)',
                textDecoration: item.done ? 'line-through' : 'none',
                flex: 1, lineHeight: 1.3,
              }}>{item.text}</span>
            </div>
          ))}
        </div>

        {checklistItems.length > 4 && (
          <button
            onClick={() => onNavigate('checklist')}
            style={{
              marginTop: 4, padding: '6px 8px',
              fontSize: 12, color: 'var(--ink3)',
              fontWeight: 500, textAlign: 'left',
            }}
          >
            +{checklistItems.length - 4} more items
          </button>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        borderTop: '1px solid var(--edge)',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        padding: '6px 8px',
      }}>
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setActiveNav(id); onNavigate(id) }}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, padding: '6px 4px',
              borderRadius: 8,
              color: activeNav === id ? 'var(--cyan)' : 'var(--ink3)',
              background: activeNav === id ? 'var(--cyan-dim)' : 'transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={17} strokeWidth={activeNav === id ? 2 : 1.75} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
