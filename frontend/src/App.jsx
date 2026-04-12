import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'
import { AuthProvider } from './state/AuthContext.jsx'
import { NotificationsProvider } from './state/NotificationsContext.jsx'
import { ThemeProvider } from './state/ThemeContext.jsx'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          <RouterProvider router={router} />
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
