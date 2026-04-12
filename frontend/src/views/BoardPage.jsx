import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core'
import { useParams } from 'react-router-dom'
import { getBoard, moveCard } from '../services/api.js'
import { getSocket } from '../services/socket.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useNotifications } from '../state/NotificationsContext.jsx'
import BoardColumn from './BoardColumn.jsx'
import SortableCard from './SortableCard.jsx'
import { moveCardInColumns } from './boardUtils.js'

const makeLog = (text) => ({
  id: `${Date.now()}-${Math.random()}`,
  action: text,
  created_at: new Date().toISOString(),
})

export default function BoardPage() {
  const { boardId } = useParams()
  const { token, user } = useAuth()
  const { addNotification } = useNotifications()
  const [board, setBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [activeCardId, setActiveCardId] = useState(null)
  const [activityLogs, setActivityLogs] = useState([])
  const [error, setError] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    let alive = true

    getBoard(boardId)
      .then((data) => {
        if (!alive) {
          return
        }
        setBoard(data)
        setColumns(data.columns || [])
        setActivityLogs(data.activityLogs || [])
      })
      .catch(() => {
        if (alive) {
          setError('Unable to load board data.')
        }
      })

    return () => {
      alive = false
    }
  }, [boardId])

  useEffect(() => {
    if (!token || !boardId) {
      return undefined
    }

    const socket = getSocket(token)
    socket.connect()
    socket.emit('board:join', { boardId })

    const handleMoved = (payload) => {
      if (String(payload.boardId) !== String(boardId)) {
        return
      }
      if (String(payload.actorId) === String(user?.id)) {
        return
      }

      setColumns((current) => {
        const nextState = moveCardInColumns(current, {
          activeId: payload.cardId,
          overId: payload.overId,
          overColumnId: payload.toColumnId,
        })

        return nextState.columns || current
      })

      setActivityLogs((current) => [
        makeLog(payload.activity || `A teammate moved a card to ${payload.toColumnId}`),
        ...current,
      ])
    }

    const handleLog = (payload) => {
      setActivityLogs((current) => [payload, ...current])
    }

    socket.on('card:moved', handleMoved)
    socket.on('activity:new', handleLog)

    return () => {
      socket.emit('board:leave', { boardId })
      socket.off('card:moved', handleMoved)
      socket.off('activity:new', handleLog)
    }
  }, [boardId, token, user?.id])

  const activeCard = useMemo(() => {
    if (!activeCardId) {
      return null
    }

    for (const column of columns) {
      const found = column.cards.find((card) => card.id === activeCardId)
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

    const activity = `${user?.name || 'A user'} moved "${nextState.movedCard.title}" to ${nextState.destinationColumn.title}`
    setActivityLogs((current) => [makeLog(activity), ...current])

    const notification = {
      id: `${Date.now()}-${Math.random()}`,
      message: activity,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    addNotification(notification)

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

    const socket = getSocket(token)
    socket.emit('card:moved', {
      boardId,
      actorId: user?.id,
      cardId: nextState.movedCard.id,
      toColumnId: nextState.destinationColumn.id,
      overId: over.id,
      activity,
    })
  }

  const onAddCardClick = () => {
    window.dispatchEvent(
      new CustomEvent('teamops:interaction', {
        detail: { message: 'Card Composer coming next. For now, drag cards to choreograph your workflow.' },
      }),
    )
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
        <button className="btn interactive-btn" onClick={onAddCardClick}>+ Add Card</button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="board-layout">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="board-columns">
            {columns.map((column) => (
              <BoardColumn key={column.id} column={column} />
            ))}
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
            <h3 className="panel-title">Members Online</h3>
            <div className="member-item">
              <span className="member-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              <div>
                <div className="member-name">{user?.name || 'Team Member'}</div>
                <div className="member-role">Owner</div>
              </div>
              <span className="member-online" />
            </div>
            <div className="member-item">
              <span className="member-avatar secondary">T</span>
              <div>
                <div className="member-name">Teammate</div>
                <div className="member-role">Admin</div>
              </div>
              <span className="member-online" />
            </div>
            <button className="invite-btn" type="button">Invite teammate</button>
          </div>
        </aside>
      </div>
    </section>
  )
}
