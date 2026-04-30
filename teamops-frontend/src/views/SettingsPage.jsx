import { useEffect, useState } from 'react'
import { getSettings, updateSettings } from '../services/api.js'

export default function SettingsPage() {
  const [form, setForm] = useState({
    workspaceName: 'TeamOps Workspace',
    notifyEmail: true,
    notifyPush: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    let alive = true

    getSettings()
      .then((payload) => {
        if (alive) {
          setForm(payload)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Could not load settings')
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false)
        }
      })

    return () => {
      alive = false
    }
  }, [])

  const onSave = async () => {
    setSaving(true)
    setError('')

    try {
      const payload = await updateSettings(form)
      setForm(payload)
      window.dispatchEvent(
        new CustomEvent('teamops:interaction', {
          detail: { message: 'Settings saved successfully.' },
        }),
      )
    } catch {
      setError('Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Settings</h2>
          <p>Polish the demo workspace preferences before presenting.</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <article className="workspace-card" style={{ marginTop: 24 }}>
        {loading ? <p className="muted">Loading settings...</p> : null}
        <div className="form-grid" style={{ maxWidth: 560 }}>
          <label className="muted" htmlFor="workspace-name">Workspace name</label>
          <input
            id="workspace-name"
            className="input"
            value={form.workspaceName}
            disabled={loading || saving}
            onChange={(event) => update('workspaceName', event.target.value)}
          />

          <label className="row" style={{ justifyContent: 'space-between' }}>
            <span>Email notifications</span>
            <input
              type="checkbox"
              checked={form.notifyEmail}
              disabled={loading || saving}
              onChange={(event) => update('notifyEmail', event.target.checked)}
            />
          </label>

          <label className="row" style={{ justifyContent: 'space-between' }}>
            <span>Push notifications</span>
            <input
              type="checkbox"
              checked={form.notifyPush}
              disabled={loading || saving}
              onChange={(event) => update('notifyPush', event.target.checked)}
            />
          </label>

          <button
            className="btn interactive-btn"
            type="button"
            disabled={loading || saving}
            onClick={onSave}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </article>
    </section>
  )
}
