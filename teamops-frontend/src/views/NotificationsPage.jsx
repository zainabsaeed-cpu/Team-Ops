import { useNotifications } from '../state/NotificationsContext.jsx'

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead } = useNotifications()

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Notifications</h2>
          <p>Stay updated with real-time events from your workspaces</p>
        </div>
        <button className="btn-ghost interactive-btn" onClick={markAllRead}>Mark all read</button>
      </div>

      <ul className="notification-list">
        {notifications.map((item) => (
          <li key={item.id} className={`notification-item ${item.is_read ? '' : 'unread'}`}>
            <div>{item.message}</div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <small className="muted">{new Date(item.created_at).toLocaleString()}</small>
              {!item.is_read ? (
                <button className="btn-ghost" type="button" onClick={() => markRead(item.id)}>Mark read</button>
              ) : null}
            </div>
          </li>
        ))}
        {notifications.length === 0 ? <li className="muted">No notifications yet.</li> : null}
      </ul>
    </section>
  )
}
