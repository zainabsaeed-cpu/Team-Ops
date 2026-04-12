/* eslint-disable react-refresh/only-export-components */
import { Navigate, createBrowserRouter } from 'react-router-dom'
import LoginPage from './views/LoginPage.jsx'
import RegisterPage from './views/RegisterPage.jsx'
import DashboardPage from './views/DashboardPage.jsx'
import BoardPage from './views/BoardPage.jsx'
import NotificationsPage from './views/NotificationsPage.jsx'
import ProfilePage from './views/ProfilePage.jsx'
import LandingPage from './views/LandingPage.jsx'
import AnalyticsPage from './views/AnalyticsPage.jsx'
import ActivityPage from './views/ActivityPage.jsx'
import MembersPage from './views/MembersPage.jsx'
import AchievementsPage from './views/AchievementsPage.jsx'
import SchedulePage from './views/SchedulePage.jsx'
import MessagesPage from './views/MessagesPage.jsx'
import SettingsPage from './views/SettingsPage.jsx'
import { useAuth } from './state/AuthContext.jsx'
import AppLayout from './views/AppLayout.jsx'

function Protected({ children }) {
  const { token } = useAuth()
  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/app',
    element: (
      <Protected>
        <AppLayout />
      </Protected>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'board/:boardId', element: <BoardPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'members', element: <MembersPage /> },
      { path: 'achievements', element: <AchievementsPage /> },
      { path: 'schedule', element: <SchedulePage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
