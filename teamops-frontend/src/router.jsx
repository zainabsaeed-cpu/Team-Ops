/* eslint-disable react-refresh/only-export-components */
import { Navigate, createBrowserRouter } from 'react-router-dom'
import LoginPage from './views/LoginPage.jsx'
import RegisterPage from './views/RegisterPage.jsx'
import CreateWorkspacePage from './views/CreateWorkspacePage.jsx'
import JoinWorkspacePage from './views/JoinWorkspacePage.jsx'
import JoinInvitePage from './views/JoinInvitePage.jsx'
import DashboardPage from './views/DashboardPage.jsx'
import ProjectsPage from './views/ProjectsPage.jsx'
import BoardPage from './views/BoardPage.jsx'
import NotificationsPage from './views/NotificationsPage.jsx'
import ProfilePage from './views/ProfilePage.jsx'
import LandingPage from './views/LandingPage.jsx'
import VerifyPage from './views/VerifyPage.jsx'
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
  const { token, authReady } = useAuth()
  if (!authReady) {
    return null
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

const appRoutes = [
  { path: 'dashboard', element: <DashboardPage /> },
  { path: 'projects', element: <ProjectsPage /> },
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
]

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
    path: '/create-workspace',
    element: (
      <Protected>
        <CreateWorkspacePage />
      </Protected>
    ),
  },
  {
    path: '/join-workspace',
    element: (
      <Protected>
        <JoinWorkspacePage />
      </Protected>
    ),
  },
  {
    path: '/join/invite',
    element: <JoinInvitePage />,
  },
  {
    path: '/join/:code',
    element: <JoinWorkspacePage />,
  },
  {
    path: '/verify',
    element: <VerifyPage />,
  },
  {
    path: '/',
    element: (
      <Protected>
        <AppLayout />
      </Protected>
    ),
    children: appRoutes,
  },
  {
    path: '/app',
    element: (
      <Protected>
        <AppLayout />
      </Protected>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'projects', element: <ProjectsPage /> },
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
