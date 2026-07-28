import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ViewProvider } from './context/ViewContext'
import { VIEWS } from './lib/views'
import Landing from './components/Landing'
import Menu from './components/Menu'
import Shell from './components/Shell'

/**
 * Routes are the single source of truth for where you are:
 *   /            landing gate
 *   /menu        destination menu
 *   /:viewId     the app, showing that panel
 *
 * The shell only mounts on a view route. That is deliberate — keeping it
 * mounted under the menu is what used to let the previously-open panel show
 * through during the hand-over.
 */
const AppRoutes = () => {
  const navigate = useNavigate()

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Landing
            onEnter={() => navigate('/menu')}
            onEnterView={(id) => navigate(`/${id}`)}
          />
        }
      />
      <Route
        path="/menu"
        element={<Menu onPick={(id) => navigate(`/${id}`)} />}
      />
      {VIEWS.map((v) => (
        <Route
          key={v.id}
          path={`/${v.id}`}
          element={<Shell viewId={v.id} onMenu={() => navigate('/menu')} />}
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const App = () => (
  <ViewProvider>
    <AppRoutes />
  </ViewProvider>
)

export default App
