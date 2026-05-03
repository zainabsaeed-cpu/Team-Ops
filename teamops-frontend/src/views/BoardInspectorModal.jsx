import { useEffect, useMemo, useState } from 'react'

const blankCardForm = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
  assigneeId: '',
  columnId: '',
}

export default function BoardInspectorModal({
  open,
  mode,
  column,
  card,
  columns,
  members,
  onClose,
  onSaveColumn,
  onDeleteColumn,
  onSaveCard,
  onDeleteCard,
}) {
  const isColumnMode = mode === 'column'
  const [columnTitle, setColumnTitle] = useState('')
  const [cardForm, setCardForm] = useState(blankCardForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const columnList = useMemo(() => columns || [], [columns])

  useEffect(() => {
    if (!open) {
      return
    }

    setError('')
    setBusy(false)

    if (isColumnMode && column) {
      setColumnTitle(column.title || '')
    }

    if (!isColumnMode && card) {
      setCardForm({
        title: card.title || '',
        description: card.description || '',
        priority: card.priority || 'medium',
        dueDate: card.due_date || '',
        assigneeId: card.assignee_id || '',
        columnId: card.column_id || '',
      })
    }
  }, [open, isColumnMode, column, card])

  if (!open || !mode) {
    return null
  }

  const close = () => {
    if (!busy) {
      onClose()
    }
  }

  const handleBackdropKeyDown = (event) => {
    if (event.key === 'Escape' && !busy) {
      onClose()
    }
  }

  const handleColumnSubmit = async (event) => {
    event.preventDefault()
    const trimmed = columnTitle.trim()
    if (!trimmed) {
      setError('Column title is required.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await onSaveColumn({ columnId: column.id, title: trimmed })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to update column')
    } finally {
      setBusy(false)
    }
  }

  const handleColumnDelete = async () => {
    setBusy(true)
    setError('')
    try {
      await onDeleteColumn({ columnId: column.id })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to delete column')
    } finally {
      setBusy(false)
    }
  }

  const handleCardSubmit = async (event) => {
    event.preventDefault()
    const trimmedTitle = cardForm.title.trim()
    if (!trimmedTitle) {
      setError('Card title is required.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await onSaveCard({
        cardId: card.id,
        title: trimmedTitle,
        description: cardForm.description.trim(),
        priority: cardForm.priority,
        dueDate: cardForm.dueDate || null,
        assigneeId: cardForm.assigneeId || null,
        columnId: cardForm.columnId,
      })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to update card')
    } finally {
      setBusy(false)
    }
  }

  const handleCardDelete = async () => {
    setBusy(true)
    setError('')
    try {
      await onDeleteCard({ cardId: card.id })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to delete card')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="board-modal-backdrop" role="presentation" onClick={close} onKeyDown={handleBackdropKeyDown}>
      <div className="board-modal" role="dialog" aria-modal="true" aria-labelledby="board-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="board-modal-header">
          <div>
            <p className="board-modal-kicker">{isColumnMode ? 'Column details' : 'Card details'}</p>
            <h3 id="board-modal-title">{isColumnMode ? 'Edit column' : 'Edit card'}</h3>
          </div>
          <button type="button" className="icon-btn board-modal-close" onClick={close} aria-label="Close dialog">×</button>
        </div>

        {error ? <div className="error board-modal-error">{error}</div> : null}

        {isColumnMode ? (
          <form className="board-modal-form" onSubmit={handleColumnSubmit}>
            <label className="board-modal-field">
              <span>Column title</span>
              <input
                className="input"
                value={columnTitle}
                autoFocus
                onChange={(event) => setColumnTitle(event.target.value)}
                placeholder="Column title"
              />
            </label>

            <div className="board-modal-actions">
              <button type="button" className="btn-danger" onClick={handleColumnDelete} disabled={busy}>Delete column</button>
              <div className="board-modal-action-group">
                <button type="button" className="btn-ghost" onClick={close} disabled={busy}>Cancel</button>
                <button type="submit" className="btn interactive-btn" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
              </div>
            </div>
          </form>
        ) : (
          <form className="board-modal-form" onSubmit={handleCardSubmit}>
            <label className="board-modal-field">
              <span>Card title</span>
              <input
                className="input"
                value={cardForm.title}
                autoFocus
                onChange={(event) => setCardForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Card title"
              />
            </label>

            <label className="board-modal-field">
              <span>Description</span>
              <textarea
                className="input board-modal-textarea"
                value={cardForm.description}
                onChange={(event) => setCardForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Add a short note or checklist"
                rows={4}
              />
            </label>

            <div className="board-modal-grid">
              <label className="board-modal-field">
                <span>Priority</span>
                <select
                  className="input"
                  value={cardForm.priority}
                  onChange={(event) => setCardForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="board-modal-field">
                <span>Due date</span>
                <input
                  className="input"
                  type="date"
                  value={cardForm.dueDate}
                  onChange={(event) => setCardForm((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </label>
            </div>

            <div className="board-modal-grid">
              <label className="board-modal-field">
                <span>Assignee</span>
                <select
                  className="input"
                  value={cardForm.assigneeId}
                  onChange={(event) => setCardForm((current) => ({ ...current, assigneeId: event.target.value }))}
                >
                  <option value="">No one assigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </label>

              <label className="board-modal-field">
                <span>Column</span>
                <select
                  className="input"
                  value={cardForm.columnId}
                  onChange={(event) => setCardForm((current) => ({ ...current, columnId: event.target.value }))}
                >
                  {columnList.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="board-modal-actions">
              <button type="button" className="btn-danger" onClick={handleCardDelete} disabled={busy}>Delete card</button>
              <div className="board-modal-action-group">
                <button type="button" className="btn-ghost" onClick={close} disabled={busy}>Cancel</button>
                <button type="submit" className="btn interactive-btn" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}