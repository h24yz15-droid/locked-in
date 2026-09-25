import { useState } from 'react'
import { ChevronLeftIcon, LockIcon } from '../components/Icons'

interface Props {
  onNavigate: (s: string) => void
  dark: boolean
  onToggleDark: () => void
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`toggle ${on ? 'on' : ''}`}
      aria-label="Toggle"
    />
  )
}

export default function SettingsScreen({ onNavigate, dark, onToggleDark }: Props) {
  const [s, setS] = useState({
    locked: true,
    autoOrganize: true,
    notifications: true,
    tabPrompts: false,
    pauseOnSwitch: false,
  })
  const [timerDuration, setTimerDuration] = useState('25')

  const toggle = (key: keyof typeof s) => setS(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="screen-enter flex flex-col h-full" style={{ background: 'var(--surface)' }}>

      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--edge)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => onNavigate('main')} style={{ color: 'var(--ink3)', padding: 2 }}>
          <ChevronLeftIcon size={16} strokeWidth={2} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Settings</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Master switch */}
        <div style={{
          margin: '12px 14px',
          borderRadius: 12,
          background: s.locked ? 'var(--cyan-dim)' : 'var(--surface2)',
          border: `1.5px solid ${s.locked ? 'var(--cyan-border)' : 'var(--edge)'}`,
          padding: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, transition: 'all 0.25s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: s.locked ? 'var(--cyan)' : 'var(--edge)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.25s ease',
            }}>
              <LockIcon
                size={16} strokeWidth={2}
                className={s.locked ? '' : 'text-[var(--ink3)]'}
                style={{ color: s.locked ? 'white' : 'var(--ink3)' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Locked In</div>
              <div style={{ fontSize: 11, color: s.locked ? 'var(--cyan)' : 'var(--ink3)', transition: 'color 0.2s ease' }}>
                {s.locked ? 'Active — staying focused' : 'Paused — all tabs allowed'}
              </div>
            </div>
          </div>
          <Toggle on={s.locked} onChange={() => toggle('locked')} />
        </div>

        {/* Session group */}
        <SectionLabel>Session</SectionLabel>
        <SettingGroup>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--edge2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Default timer</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Minutes per focus session</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['25', '50', '90'].map(d => (
                <button
                  key={d}
                  onClick={() => setTimerDuration(d)}
                  style={{
                    padding: '4px 9px', borderRadius: 6,
                    border: `1px solid ${timerDuration === d ? 'var(--cyan)' : 'var(--edge)'}`,
                    background: timerDuration === d ? 'var(--cyan)' : 'var(--surface2)',
                    color: timerDuration === d ? 'var(--cyan-fg)' : 'var(--ink2)',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >{d}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Pause on tab switch</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Timer pauses when you switch away</div>
            </div>
            <Toggle on={s.pauseOnSwitch} onChange={() => toggle('pauseOnSwitch')} />
          </div>
        </SettingGroup>

        {/* Tabs group */}
        <SectionLabel>Tabs</SectionLabel>
        <SettingGroup>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--edge2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Auto-organize tabs</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Group tabs by workflow topic</div>
            </div>
            <Toggle on={s.autoOrganize} onChange={() => toggle('autoOrganize')} />
          </div>
          <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Prompt on new tabs</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Ask Keep / Save / Close for each tab</div>
            </div>
            <Toggle on={s.tabPrompts} onChange={() => toggle('tabPrompts')} />
          </div>
        </SettingGroup>

        {/* Appearance */}
        <SectionLabel>Appearance & Notifications</SectionLabel>
        <SettingGroup>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--edge2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Dark mode</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Warm dark surfaces</div>
            </div>
            <Toggle on={dark} onChange={onToggleDark} />
          </div>
          <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Session notifications</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Alert when session ends</div>
            </div>
            <Toggle on={s.notifications} onChange={() => toggle('notifications')} />
          </div>
        </SettingGroup>

        {/* Footer */}
        <div style={{ padding: '16px 14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Locked In v1.0.0</span>
          <button style={{
            fontSize: 11, fontWeight: 600, color: 'var(--red)',
            padding: '4px 10px', borderRadius: 6,
            border: '1px solid var(--red-dim)',
            background: 'var(--red-dim)',
          }}>
            End session
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--ink3)',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '10px 14px 6px',
    }}>
      {children}
    </div>
  )
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      margin: '0 14px 4px',
      borderRadius: 10,
      border: '1px solid var(--edge)',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}
