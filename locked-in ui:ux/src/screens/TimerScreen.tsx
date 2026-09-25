import { useState, useEffect, useRef } from 'react'
import { ChevronLeftIcon, PauseIcon, PlayIcon, RefreshIcon } from '../components/Icons'

interface Props { onNavigate: (s: string) => void }

const TOTAL = 25 * 60

export default function TimerScreen({ onNavigate }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 + 37)
  const [running, setRunning] = useState(true)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft(s => Math.max(0, s - 1))
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, secondsLeft])

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const secs = (secondsLeft % 60).toString().padStart(2, '0')
  const progress = secondsLeft / TOTAL
  const circumference = 2 * Math.PI * 80
  const offset = circumference * progress

  const sessions = [
    { label: 'Session 1', duration: '25 min', status: 'done' },
    { label: 'Break', duration: '5 min', status: 'done' },
    { label: 'Session 2', duration: '25 min', status: 'active' },
    { label: 'Break', duration: '5 min', status: 'pending' },
    { label: 'Session 3', duration: '25 min', status: 'pending' },
  ]

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
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Focus Timer</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 20,
          background: 'var(--green-dim)',
        }}>
          <div className="pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green)' }}>Session 2 of 3</span>
        </div>
      </div>

      {/* Timer ring */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '24px 20px 16px',
      }}>
        <div style={{ position: 'relative', width: 200, height: 200 }}>
          <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle
              cx="100" cy="100" r="80"
              fill="none"
              stroke="var(--edge)"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="100" cy="100" r="80"
              fill="none"
              stroke="var(--cyan)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - offset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>

          {/* Center content */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 38, fontWeight: 500,
              color: 'var(--ink)',
              letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              {mins}:{secs}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4, fontWeight: 500 }}>
              remaining
            </div>

            {/* Tiny workflow label */}
            <div style={{
              marginTop: 8,
              padding: '3px 8px', borderRadius: 20,
              background: 'var(--surface2)',
              border: '1px solid var(--edge)',
            }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink2)', letterSpacing: '0.04em' }}>
                RESEARCHING REACT
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginTop: 16,
        }}>
          <button
            onClick={() => { setSecondsLeft(TOTAL); setRunning(false) }}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              border: '1.5px solid var(--edge)',
              background: 'var(--surface2)',
              color: 'var(--ink2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)' }}
          >
            <RefreshIcon size={15} strokeWidth={1.75} />
          </button>

          <button
            onClick={() => setRunning(r => !r)}
            style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'var(--cyan)',
              border: 'none',
              color: 'var(--cyan-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s ease',
              boxShadow: '0 4px 14px rgba(38,197,225,0.35)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {running ? <PauseIcon size={20} strokeWidth={2} /> : <PlayIcon size={20} strokeWidth={2} />}
          </button>

          {/* Skip placeholder */}
          <button style={{
            width: 38, height: 38, borderRadius: '50%',
            border: '1.5px solid var(--edge)',
            background: 'var(--surface2)',
            color: 'var(--ink2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 14, fontWeight: 700,
            transition: 'all 0.15s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)' }}
          >
            ⏭
          </button>
        </div>
      </div>

      {/* Session track */}
      <div style={{
        flex: 1, padding: '0 16px 16px',
        borderTop: '1px solid var(--edge)',
        paddingTop: 14,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--ink3)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Session Plan
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sessions.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', borderRadius: 8,
              background: s.status === 'active' ? 'var(--cyan-dim)' : 'transparent',
              border: `1px solid ${s.status === 'active' ? 'var(--cyan-border)' : 'transparent'}`,
              transition: 'all 0.15s ease',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: s.status === 'done' ? 'var(--green)' : s.status === 'active' ? 'var(--cyan)' : 'var(--edge)',
              }} />
              <span style={{
                flex: 1, fontSize: 12,
                color: s.status === 'pending' ? 'var(--ink3)' : 'var(--ink)',
                fontWeight: s.status === 'active' ? 600 : 400,
              }}>
                {s.label}
              </span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: s.status === 'active' ? 'var(--cyan)' : 'var(--ink3)',
              }}>
                {s.duration}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
