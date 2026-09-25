import { useState, useRef } from 'react'
import { PlusIcon, GripIcon, EditIcon, TrashIcon, ChevronLeftIcon, CheckIcon } from '../components/Icons'

interface Item {
  id: number
  text: string
  done: boolean
}

const initial: Item[] = [
  { id: 1, text: 'Review React component API docs', done: true },
  { id: 2, text: 'Set up Storybook for design system', done: true },
  { id: 3, text: 'Write unit tests for custom hooks', done: false },
  { id: 4, text: 'Refactor context providers', done: false },
  { id: 5, text: 'Update README with code examples', done: false },
  { id: 6, text: 'Performance audit with Lighthouse', done: false },
]

interface Props { onNavigate: (s: string) => void }

export default function ChecklistScreen({ onNavigate }: Props) {
  const [items, setItems] = useState<Item[]>(initial)
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const active = items.filter(i => !i.done)
  const done = items.filter(i => i.done)

  const addItem = () => {
    if (!newText.trim()) return
    setItems(prev => [...prev, { id: Date.now(), text: newText.trim(), done: false }])
    setNewText('')
    inputRef.current?.focus()
  }

  const toggle = (id: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  const startEdit = (item: Item) => {
    setEditingId(item.id)
    setEditText(item.text)
  }

  const commitEdit = () => {
    if (!editText.trim()) return
    setItems(prev => prev.map(i => i.id === editingId ? { ...i, text: editText.trim() } : i))
    setEditingId(null)
  }

  const deleteItem = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const Row = ({ item }: { item: Item }) => (
    <div
      className="checklist-item"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px 8px 8px',
        borderRadius: 9,
        border: '1px solid transparent',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--surface2)'
        e.currentTarget.style.borderColor = 'var(--edge)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      {/* Drag handle */}
      <div className="drag-handle" style={{ color: 'var(--ink3)', cursor: 'grab', flexShrink: 0 }}>
        <GripIcon size={14} strokeWidth={1} />
      </div>

      {/* Checkbox */}
      <button
        onClick={() => toggle(item.id)}
        style={{
          width: 18, height: 18, borderRadius: 6, flexShrink: 0,
          border: item.done ? 'none' : '1.5px solid var(--edge)',
          background: item.done ? 'var(--green)' : 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
      >
        {item.done && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <polyline points="2 6 5 9 10 3" stroke="var(--green-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Text / edit */}
      {editingId === item.id ? (
        <input
          autoFocus
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
          style={{
            flex: 1, fontSize: 13, color: 'var(--ink)',
            background: 'var(--surface)',
            border: '1.5px solid var(--cyan)',
            borderRadius: 6, padding: '2px 8px',
            outline: 'none', fontFamily: 'inherit',
            boxShadow: '0 0 0 3px var(--cyan-dim)',
          }}
        />
      ) : (
        <span style={{
          flex: 1, fontSize: 13,
          color: item.done ? 'var(--ink3)' : 'var(--ink)',
          textDecoration: item.done ? 'line-through' : 'none',
          lineHeight: 1.4, cursor: 'default',
        }}>{item.text}</span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <button
          onClick={() => startEdit(item)}
          style={{ padding: 4, color: 'var(--ink3)', borderRadius: 5, transition: 'all 0.12s ease' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.background = 'var(--cyan-dim)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink3)'; e.currentTarget.style.background = 'transparent' }}
        >
          <EditIcon size={12} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => deleteItem(item.id)}
          style={{ padding: 4, color: 'var(--ink3)', borderRadius: 5, transition: 'all 0.12s ease' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink3)'; e.currentTarget.style.background = 'transparent' }}
        >
          <TrashIcon size={12} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )

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
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Checklist</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11, color: 'var(--green)', fontWeight: 500,
            padding: '2px 7px', borderRadius: 5,
            background: 'var(--green-dim)',
          }}>
            {done.length}/{items.length} done
          </span>
        </div>
      </div>

      {/* Add input */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--edge)',
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '8px 10px',
          background: 'var(--surface2)',
          borderRadius: 9, border: '1.5px solid var(--edge)',
          transition: 'border-color 0.15s ease',
        }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--cyan)' }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--edge)' }}
        >
          <PlusIcon size={15} strokeWidth={2} className="text-[var(--ink3)]" style={{ flexShrink: 0, color: 'var(--ink3)' }} />
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add a task…"
            style={{
              flex: 1, fontSize: 13, color: 'var(--ink)',
              background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {newText.trim() && (
            <button
              onClick={addItem}
              style={{
                padding: '3px 9px', borderRadius: 6,
                background: 'var(--cyan)', color: 'var(--cyan-fg)',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}
            >
              Add
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>

        {/* Active */}
        {active.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {active.map(item => <Row key={item.id} item={item} />)}
          </div>
        )}

        {active.length === 0 && done.length === 0 && (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink3)',
            }}>
              <CheckIcon size={18} strokeWidth={1.75} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>No tasks yet</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Add your first task above</div>
          </div>
        )}

        {/* Completed section */}
        {done.length > 0 && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--ink3)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '4px 8px 6px',
            }}>
              Completed · {done.length}
            </div>
            {done.map(item => <Row key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
