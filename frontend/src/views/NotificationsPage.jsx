import { useNotifications } from '../state/NotificationsContext.jsx'

export default function NotificationsPage() {
  const { notifications, markAllRead } = useNotifications()

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
            <small className="muted">{new Date(item.created_at).toLocaleString()}</small>
          </li>
        ))}
        {notifications.length === 0 ? <li className="muted">No notifications yet.</li> : null}
      </ul>
    </section>
  )
}
