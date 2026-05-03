import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableCard from './SortableCard.jsx'

export default function BoardColumn({ column, onAddCard, onOpenColumn, onOpenCard, canAddCard = true, highlightedCardId = '' }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => {
    setTitle('')
    setPriority('medium')
    setDueDate('')
    setErr('')
    setOpen(false)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setErr('Title is required')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await onAddCard({ columnId: column.id, title: trimmed, priority, dueDate: dueDate || undefined })
      reset()
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to add card')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="column" ref={setNodeRef} style={isOver ? { borderColor: '#0b6e4f' } : undefined}>
      <button type="button" className="column-head column-head-button" onClick={() => onOpenColumn?.(column)}>
        <span>{column.title}</span>
        <span className="column-head-count">{column.cards.length}</span>
      </button>
      <SortableContext items={column.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <div className="column-body">
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} onClick={() => onOpenCard?.(card)} highlighted={String(highlightedCardId) === String(card.id)} />
          ))}
        </div>
      </SortableContext>

      {canAddCard && open ? (
        <form className="add-card-form" onSubmit={onSubmit}>
          {err ? <div className="error" style={{ fontSize: 12, marginBottom: 6 }}>{err}</div> : null}
          <input
            className="input"
            style={{ marginBottom: 6 }}
            placeholder="Card title"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="input"
            style={{ marginBottom: 6 }}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            className="input"
            style={{ marginBottom: 8 }}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div className="row" style={{ gap: 6 }}>
            <button className="btn interactive-btn" type="submit" disabled={busy} style={{ flex: 1 }}>
              {busy ? 'Adding...' : 'Add Card'}
            </button>
            <button className="btn-ghost" type="button" onClick={reset}>Cancel</button>
          </div>
        </form>
      ) : canAddCard ? (
        <button
          className="btn-ghost"
          type="button"
          style={{ width: '100%', marginTop: 8, textAlign: 'left', padding: '6px 4px', fontSize: 13 }}
          onClick={() => setOpen(true)}
        >
          + Add card
        </button>
      ) : null}
    </section>
  )
}
