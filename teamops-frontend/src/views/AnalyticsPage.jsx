import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getBoardAnalytics, getBoards, getWorkspaces } from '../services/api.js'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')
  const [boards, setBoards] = useState([])
  const [boardId, setBoardId] = useState('')

  useEffect(() => {
    let alive = true

    const loadBoards = async () => {
      try {
        const workspaceId = localStorage.getItem('teamops_workspace_id') || (await getWorkspaces())[0]?.id || ''
        if (!workspaceId) return
        const payload = await getBoards(workspaceId)
        if (!alive) return
        const nextBoards = payload?.boards || []
        setBoards(nextBoards)
        setBoardId((current) => current || nextBoards[0]?.id || '')
      } catch {
        if (alive) setError('Could not load boards')
      }
    }

    loadBoards()

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true

    if (!boardId) {
      return undefined
    }

    getBoardAnalytics(boardId)
      .then((payload) => {
        if (alive) setAnalytics(payload)
      })
      .catch(() => {
        if (alive) setError('Could not load analytics data')
      })

    return () => {
      alive = false
    }
  }, [boardId])

  const cardsPerColumn = analytics?.cardsPerColumn || []
  const assigneeRows = analytics?.cardsPerAssignee || []
  const totalCards = cardsPerColumn.reduce((sum, item) => sum + item.count, 0)

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Analytics</h2>
          <p>Real board metrics from MongoDB</p>
        </div>
        <select className="input board-selector" value={boardId} onChange={(event) => setBoardId(event.target.value)}>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>{board.name || board.title}</option>
          ))}
        </select>
      </div>
      {!boardId ? <div className="error">Open a board before viewing analytics.</div> : null}
      {error ? <div className="error">{error}</div> : null}

      <div className="workspace-grid" style={{ marginTop: 24 }}>
        <article className="workspace-card">
          <h3>Total Cards</h3>
          <p style={{ fontSize: 28, margin: '8px 0 6px', fontWeight: 800 }}>{totalCards}</p>
          <span className="muted">Across all columns</span>
        </article>
        <article className="workspace-card">
          <h3>Completed This Week</h3>
          <p style={{ fontSize: 28, margin: '8px 0 6px', fontWeight: 800 }}>{analytics?.completedThisWeek || 0}</p>
          <span className="muted">Cards in Done updated this week</span>
        </article>
        <article className="workspace-card">
          <h3>Overdue</h3>
          <p style={{ fontSize: 28, margin: '8px 0 6px', fontWeight: 800 }}>{analytics?.overdueCardsCount || 0}</p>
          <span className="muted">Past due and not Done</span>
        </article>
      </div>

      <article className="workspace-card" style={{ marginTop: 18 }}>
        <h3>Total cards per column</h3>
        <div style={{ height: 280, marginTop: 18 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cardsPerColumn}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="columnTitle" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c5cfc" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="workspace-card" style={{ marginTop: 18 }}>
        <h3>Cards per assignee</h3>
        <div style={{ height: 280, marginTop: 18 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assigneeRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="assigneeName" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  )
}
