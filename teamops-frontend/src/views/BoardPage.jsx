import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core'
import { useParams, useSearchParams } from 'react-router-dom'
import { createCard, createColumn, deleteCard, deleteColumn, getBoard, getWorkspaceMembers, moveCard, updateCard, updateColumn } from '../services/api.js'
import { getSocket } from '../services/socket.js'
import { useAuth } from '../state/AuthContext.jsx'
import BoardColumn from './BoardColumn.jsx'
import BoardInspectorModal from './BoardInspectorModal.jsx'
import SortableCard from './SortableCard.jsx'
import { moveCardInColumns } from './boardUtils.js'

const sortByPosition = (items) => [...items].sort((left, right) => (left.position ?? 0) - (right.position ?? 0))

const upsertColumn = (columns, nextColumn) => {
  const existingIndex = columns.findIndex((column) => String(column.id) === String(nextColumn.id))
  if (existingIndex === -1) {
    return sortByPosition([...columns, { ...nextColumn, cards: nextColumn.cards || [] }])
  }

  const updated = [...columns]
  updated[existingIndex] = {
    ...updated[existingIndex],
    ...nextColumn,
    cards: nextColumn.cards || updated[existingIndex].cards || [],
  }

  return sortByPosition(updated)
}

const removeColumn = (columns, columnId) =>
  columns
    .filter((column) => String(column.id) !== String(columnId))
    .map((column, index) => ({ ...column, position: index }))

const upsertCardInColumns = (columns, nextCard) => {
  const cleaned = columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => String(card.id) !== String(nextCard.id)),
  }))

  return cleaned.map((column) => {
    if (String(column.id) !== String(nextCard.column_id)) {
      return column
    }

    return {
      ...column,
      cards: sortByPosition([...column.cards, nextCard]),
    }
  })
}

const removeCard = (columns, cardId) =>
  columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => String(card.id) !== String(cardId)),
  }))

const moveCardFromPayload = (columns, payload) => {
  const targetColumnId = payload.newColumnId || payload.toColumnId || payload.columnId
  const nextCard = payload.card

  if (!targetColumnId || !nextCard) {
    return columns
  }

  const normalizedCard = {
    ...nextCard,
    column_id: targetColumnId,
    position: payload.position ?? nextCard.position ?? 0,
  }

  return upsertCardInColumns(columns, normalizedCard)
}

export default function BoardPage() {
  const { boardId } = useParams()
  const [searchParams] = useSearchParams()
  const highlightedCardId = searchParams.get('card') || ''
  const { token, currentWorkspaceRole, setWorkspaceRole } = useAuth()
  const [board, setBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [activeCardId, setActiveCardId] = useState(null)
  const [activityLogs, setActivityLogs] = useState([])
  const [error, setError] = useState('')
  const [members, setMembers] = useState([])
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [columnError, setColumnError] = useState('')
  const [columnBusy, setColumnBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('')
  const [inspectedColumn, setInspectedColumn] = useState(null)
  const [inspectedCard, setInspectedCard] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    let alive = true

    getBoard(boardId)
      .then(async (data) => {
        const workspaceId = data.workspace_id || localStorage.getItem('teamops_workspace_id') || ''
        if (workspaceId) {
          localStorage.setItem('teamops_workspace_id', workspaceId)
        }
        localStorage.setItem('teamops_board_id', boardId)
        const membersData = workspaceId
          ? await getWorkspaceMembers(workspaceId).catch(() => ({ members: [] }))
          : { members: [] }
        return [data, membersData]
      })
      .then(([data, membersData]) => {
        if (!alive) return
        setBoard(data)
        setColumns(data.columns || [])
        setActivityLogs(data.activityLogs || [])
        setMembers(membersData?.members || [])
        if (membersData?.currentUserRole) {
          setWorkspaceRole(membersData.currentUserRole)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Unable to load board data.')
        }
      })

    return () => {
      alive = false
    }
  }, [boardId, setWorkspaceRole])

  const canManageColumns = ['owner', 'admin'].includes(currentWorkspaceRole)
  const canManageCards = ['owner', 'admin', 'member'].includes(currentWorkspaceRole)

  useEffect(() => {
    if (!token || !boardId) {
      return undefined
    }

    const socket = getSocket(token)
    socket.connect()
    socket.emit('join:board', boardId)

    const handleCardCreated = (payload) => {
      if (String(payload.boardId) !== String(boardId)) {
        return
      }

      if (!payload.card) return
      setColumns((current) => upsertCardInColumns(current, payload.card))
    }

    const handleMoved = (payload) => {
      if (String(payload.boardId) !== String(boardId)) {
        return
      }

      setColumns((current) => moveCardFromPayload(current, payload))
    }

    const handleCardUpdated = (payload) => {
      if (String(payload.boardId) !== String(boardId) || !payload.card) {
        return
      }

      setColumns((current) => upsertCardInColumns(current, payload.card))
    }

    const handleCardDeleted = (payload) => {
      if (String(payload.boardId) !== String(boardId)) {
        return
      }

      setColumns((current) => removeCard(current, payload.cardId))
    }

    const handleColumnCreated = (payload) => {
      if (String(payload.boardId) !== String(boardId) || !payload.column) {
        return
      }

      setColumns((current) => upsertColumn(current, payload.column))
    }

    const handleColumnDeleted = (payload) => {
      if (String(payload.boardId) !== String(boardId)) {
        return
      }

      setColumns((current) => removeColumn(current, payload.columnId))
    }

    const handleLog = (payload) => {
      if (payload.board_id && String(payload.board_id) !== String(boardId)) {
        return
      }

      setActivityLogs((current) => [payload, ...current.filter((item) => item.id !== payload.id)].slice(0, 50))
    }

    socket.on('card:created', handleCardCreated)
    socket.on('card:moved', handleMoved)
    socket.on('card:updated', handleCardUpdated)
    socket.on('card:deleted', handleCardDeleted)
    socket.on('column:created', handleColumnCreated)
    socket.on('column:deleted', handleColumnDeleted)
    socket.on('activity:new', handleLog)

    return () => {
      socket.emit('leave:board', boardId)
      socket.off('card:created', handleCardCreated)
      socket.off('card:moved', handleMoved)
      socket.off('card:updated', handleCardUpdated)
      socket.off('card:deleted', handleCardDeleted)
      socket.off('column:created', handleColumnCreated)
      socket.off('column:deleted', handleColumnDeleted)
      socket.off('activity:new', handleLog)
    }
  }, [boardId, token])

  const activeCard = useMemo(() => {
    if (!activeCardId) {
      return null
    }

    for (const column of columns) {
      const found = column.cards.find((card) => String(card.id) === String(activeCardId))
      if (found) {
        return found
      }
    }

    return null
  }, [activeCardId, columns])

  const handleDragStart = (event) => {
    setActiveCardId(event.active.id)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveCardId(null)
    if (!canManageCards) {
      return
    }
    if (!over || active.id === over.id) {
      return
    }

    const overColumnId = columns.some((column) => column.id === over.id) ? over.id : undefined
    const nextState = moveCardInColumns(columns, {
      activeId: active.id,
      overId: over.id,
      overColumnId,
    })

    if (!nextState.movedCard || !nextState.destinationColumn) {
      return
    }

    setColumns(nextState.columns)

    try {
      await moveCard({
        boardId,
        cardId: nextState.movedCard.id,
        toColumnId: nextState.destinationColumn.id,
        newIndex: nextState.insertIndex,
      })
    } catch {
      setError('Move saved locally but backend update failed.')
    }

    // The backend persists the move, emits card:moved, and broadcasts activity:new.
  }

  const handleAddColumn = async (event) => {
    event.preventDefault()
    const trimmed = newColumnTitle.trim()
    if (!trimmed) { setColumnError('Title is required'); return }
    setColumnBusy(true)
    setColumnError('')
    try {
      const result = await createColumn({ boardId, title: trimmed })
      const col = result?.column
      if (col) setColumns((current) => upsertColumn(current, { ...col, cards: [] }))
      setNewColumnTitle('')
      setAddingColumn(false)
    } catch (e) {
      setColumnError(e?.response?.data?.error || 'Failed to create column')
    } finally {
      setColumnBusy(false)
    }
  }

  const handleAddCard = async ({ columnId, title, priority, dueDate }) => {
    if (!canManageCards) return
    const result = await createCard({ boardId, columnId, title, priority, dueDate })
    const newCard = result?.card
    if (!newCard) return
    setColumns((current) => upsertCardInColumns(current, newCard))
  }

  const handleOpenColumn = (column) => {
    if (!canManageColumns) return
    setInspectedColumn(column)
    setModalMode('column')
    setModalOpen(true)
  }

  const handleOpenCard = (card) => {
    if (!canManageCards) return
    setInspectedCard(card)
    setModalMode('card')
    setModalOpen(true)
  }

  const handleSaveColumn = async ({ columnId, title }) => {
    const result = await updateColumn({ boardId, columnId, title })
    const updated = result?.column
    if (updated) {
      setColumns((current) => upsertColumn(current, { ...updated, cards: current.find((c) => String(c.id) === String(updated.id))?.cards || [] }))
    }
  }

  const handleDeleteColumn = async ({ columnId }) => {
    await deleteColumn({ boardId, columnId })
    setColumns((current) => removeColumn(current, columnId))
  }

  const handleSaveCard = async ({ cardId, title, description, priority, dueDate, assigneeId, columnId }) => {
    const result = await updateCard({ boardId, cardId, title, description, priority, dueDate, assigneeId })
    const updated = result?.card
    if (updated) {
      const finalCard = { ...updated, column_id: columnId || updated.column_id }
      setColumns((current) => upsertCardInColumns(current, finalCard))
    }
  }

  const handleDeleteCard = async ({ cardId }) => {
    await deleteCard({ boardId, cardId })
    setColumns((current) => removeCard(current, cardId))
  }

  const totalCards = columns.reduce((sum, column) => sum + column.cards.length, 0)
  const doneColumn = columns.find((column) => /done/i.test(column.title))
  const doneCount = doneColumn?.cards.length || 0
  const overallProgress = totalCards > 0 ? Math.round((doneCount / totalCards) * 100) : 0
  const backendProgress = Math.min(95, overallProgress + 15)
  const frontendProgress = Math.max(20, overallProgress - 20)

  if (!board) {
    return <p>Loading board...</p>
  }

  return (
    <section className="board-page">
      <div className="section-header">
        <div>
          <h2>{board.title}</h2>
          <p>Board ID: {board.id} • Real-time collaboration</p>
        </div>
        <span className="live-chip" style={{ alignSelf: 'center' }}><span className="live-dot" />Live</span>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="board-layout">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="board-columns">
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                onAddCard={handleAddCard}
                onOpenColumn={canManageColumns ? handleOpenColumn : undefined}
                onOpenCard={canManageCards ? handleOpenCard : undefined}
                canAddCard={canManageCards}
                highlightedCardId={highlightedCardId}
              />
            ))}
            {canManageColumns ? <div className="column" style={{ minWidth: 240, flexShrink: 0 }}>
              {addingColumn ? (
                <form onSubmit={handleAddColumn}>
                  {columnError ? <div className="error" style={{ fontSize: 12, marginBottom: 6 }}>{columnError}</div> : null}
                  <input
                    className="input"
                    style={{ marginBottom: 8 }}
                    placeholder="Column title"
                    value={newColumnTitle}
                    autoFocus
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                  />
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn interactive-btn" type="submit" disabled={columnBusy} style={{ flex: 1 }}>
                      {columnBusy ? 'Adding...' : 'Add Column'}
                    </button>
                    <button className="btn-ghost" type="button" onClick={() => { setAddingColumn(false); setNewColumnTitle(''); setColumnError('') }}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button
                  className="btn-ghost"
                  type="button"
                  style={{ width: '100%', textAlign: 'left', padding: '8px 4px', fontSize: 13 }}
                  onClick={() => setAddingColumn(true)}
                >
                  + Add Column
                </button>
              )}
            </div> : null}
          </div>
          <DragOverlay>{activeCard ? <SortableCard card={activeCard} /> : null}</DragOverlay>
        </DndContext>

        <aside className="activity-sidebar">
          <div className="panel-block">
            <h3 className="panel-title">Live Activity</h3>
            <ul className="log-list">
              {activityLogs.slice(0, 6).map((log) => (
                <li key={log.id} className="log-item">
                  <div>{log.action}</div>
                  <small className="muted">{new Date(log.created_at).toLocaleString()}</small>
                </li>
              ))}
              {activityLogs.length === 0 ? <li className="muted">No activity yet.</li> : null}
            </ul>
          </div>

          <div className="panel-block">
            <h3 className="panel-title">Sprint Progress</h3>
            <div className="progress-item">
              <div className="progress-head"><span>Overall</span><span>{overallProgress}%</span></div>
              <div className="progress-track"><div className="progress-fill violet" style={{ width: `${overallProgress}%` }} /></div>
            </div>
            <div className="progress-item">
              <div className="progress-head"><span>Backend</span><span>{backendProgress}%</span></div>
              <div className="progress-track"><div className="progress-fill cyan" style={{ width: `${backendProgress}%` }} /></div>
            </div>
            <div className="progress-item">
              <div className="progress-head"><span>Frontend</span><span>{frontendProgress}%</span></div>
              <div className="progress-track"><div className="progress-fill amber" style={{ width: `${frontendProgress}%` }} /></div>
            </div>
          </div>

          <div className="panel-block">
            <h3 className="panel-title">Members ({members.length})</h3>
            {members.map((member) => (
              <div className="member-item" key={member.id}>
                <span className="member-avatar">{member.name?.charAt(0)?.toUpperCase() || 'M'}</span>
                <div>
                  <div className="member-name">{member.name}</div>
                  <div className="member-role">{member.role}</div>
                </div>
                <span className="member-online" />
              </div>
            ))}
            {members.length === 0 ? <p className="muted" style={{ fontSize: 12 }}>No members loaded.</p> : null}
          </div>
        </aside>
      </div>

      <BoardInspectorModal
        open={modalOpen}
        mode={modalMode}
        column={inspectedColumn}
        card={inspectedCard}
        columns={columns}
        members={members}
        onClose={() => setModalOpen(false)}
        onSaveColumn={handleSaveColumn}
        onDeleteColumn={handleDeleteColumn}
        onSaveCard={handleSaveCard}
        onDeleteCard={handleDeleteCard}
      />
    </section>
  )
}
