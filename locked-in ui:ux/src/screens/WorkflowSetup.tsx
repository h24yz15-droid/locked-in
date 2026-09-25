import { useState } from 'react'
import { LockIcon, ChevronRightIcon } from '../components/Icons'

export default function WorkflowSetup() {
  const [workflow, setWorkflow] = useState('')
  const [description, setDescription] = useState('')
  const [timer, setTimer] = useState(25)
  const [step, setStep] = useState<1 | 2>(1)

  const timerOptions = [25, 50, 90]

  return (
    <div className="screen-enter flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* Brand header */}
      <div style={{
        padding: '20px 24px 0',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <LockIcon size={16} strokeWidth={2.2} className="text-[var(--bg)]" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Locked In</div>
          <div style={{ fontSize: 10, color: 'var(--ink3)', fontWeight: 500 }}>Focus session setup</div>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{
        padding: '18px 24px 0',
        display: 'flex', gap: 6,
      }}>
        {[1, 2].map(s => (
          <div key={s} style={{
            flex: 1, height: 2, borderRadius: 2,
            background: step >= s ? 'var(--cyan)' : 'var(--edge)',
            transition: 'background 0.3s ease',
          }} />
        ))}
      </div>

      <div style={{ flex: 1, padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {step === 1 && (
          <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{
                fontSize: 22, fontWeight: 800, color: 'var(--ink)',
                letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 6,
              }}>
                What are you<br />working on?
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5 }}>
                Name your workflow to stay focused on what matters.
              </div>
            </div>

            <div>
              <input
                type="text"
                value={workflow}
                onChange={e => setWorkflow(e.target.value)}
                placeholder="e.g. Designing the onboarding flow"
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px',
                  fontSize: 14, fontWeight: 500,
                  color: 'var(--ink)',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--edge)',
                  borderRadius: 10, outline: 'none',
                  transition: 'border-color 0.15s ease',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--cyan)'; e.target.style.boxShadow = '0 0 0 3px var(--cyan-dim)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--edge)'; e.target.style.boxShadow = 'none' }}
              />
              {workflow.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink3)', textAlign: 'right' }}>
                  {workflow.length}/60
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink2)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Description <span style={{ color: 'var(--ink3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does success look like for this session?"
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px',
                  fontSize: 13, color: 'var(--ink)',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--edge)',
                  borderRadius: 10, outline: 'none',
                  resize: 'none', fontFamily: 'inherit',
                  lineHeight: 1.5, transition: 'border-color 0.15s ease',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--cyan)'; e.target.style.boxShadow = '0 0 0 3px var(--cyan-dim)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--edge)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <div style={{
                fontSize: 22, fontWeight: 800, color: 'var(--ink)',
                letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 6,
              }}>
                Set your<br />focus timer
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5 }}>
                How long do you want to lock in for?
              </div>
            </div>

            {/* Timer options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timerOptions.map(mins => (
                <button
                  key={mins}
                  onClick={() => setTimer(mins)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: `1.5px solid ${timer === mins ? 'var(--cyan)' : 'var(--edge)'}`,
                    background: timer === mins ? 'var(--cyan-dim)' : 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.15s ease', cursor: 'pointer',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 16, fontWeight: 500,
                      color: timer === mins ? 'var(--cyan)' : 'var(--ink)',
                    }}>{mins} min</div>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>
                      {mins === 25 ? 'Pomodoro classic' : mins === 50 ? 'Deep work session' : 'Extended flow state'}
                    </div>
                  </div>
                  {timer === mins && (
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'var(--cyan)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}

              {/* Custom input */}
              <div style={{
                padding: '14px 16px',
                borderRadius: 10,
                border: '1.5px solid var(--edge)',
                background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, color: 'var(--ink2)' }}>Custom duration</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    defaultValue={45}
                    style={{
                      width: 52, padding: '4px 8px',
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 13, color: 'var(--ink)',
                      background: 'var(--surface2)',
                      border: '1px solid var(--edge)',
                      borderRadius: 6, outline: 'none', textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--ink3)' }}>min</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => step === 1 ? setStep(2) : undefined}
          disabled={step === 1 && workflow.trim().length === 0}
          style={{
            width: '100%', padding: '13px',
            borderRadius: 11, border: 'none',
            background: workflow.trim().length === 0 && step === 1 ? 'var(--edge)' : 'var(--cyan)',
            color: workflow.trim().length === 0 && step === 1 ? 'var(--ink3)' : 'var(--cyan-fg)',
            fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
            cursor: workflow.trim().length === 0 && step === 1 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s ease',
            boxShadow: workflow.trim().length > 0 || step === 2 ? '0 2px 12px rgba(38,197,225,0.3)' : 'none',
          }}
        >
          {step === 1 ? (
            <>Continue <ChevronRightIcon size={15} strokeWidth={2.2} /></>
          ) : (
            <><LockIcon size={14} strokeWidth={2.2} />Lock In</>
          )}
        </button>
        {step === 2 && (
          <button
            onClick={() => setStep(1)}
            style={{ fontSize: 12, color: 'var(--ink3)', padding: '4px' }}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}
