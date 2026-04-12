import { useEffect, useState } from 'react'
import { getAnalytics } from '../services/api.js'

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState([])
  const [chartRows, setChartRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    getAnalytics()
      .then((payload) => {
        if (!alive) {
          return
        }
        setMetrics(payload.metrics || [])
        setChartRows(payload.trend || [])
      })
      .catch(() => {
        if (alive) {
          setError('Could not load analytics data')
        }
      })

    return () => {
      alive = false
    }
  }, [])

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Analytics</h2>
          <p>Delivery insights across your latest sprint cycles</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <div className="workspace-grid" style={{ marginTop: 24 }}>
        {metrics.map((metric) => (
          <article className="workspace-card" key={metric.label}>
            <h3>{metric.label}</h3>
            <p style={{ fontSize: 24, margin: '8px 0 6px', fontWeight: 800 }}>{metric.value}</p>
            <span className="muted">{metric.note}</span>
          </article>
        ))}
        {metrics.length === 0 && !error ? <p className="muted">No analytics available yet.</p> : null}
      </div>

      <article className="workspace-card" style={{ marginTop: 18 }}>
        <h3>Sprint Completion Trend</h3>
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {chartRows.map((row) => (
            <div key={row.sprint}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{row.sprint}</span>
                <strong>{row.done}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill violet" style={{ width: `${row.done}%` }} />
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
