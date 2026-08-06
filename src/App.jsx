import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ViewProvider } from './context/ViewContext'
import { VisitorProvider } from './context/VisitorContext'
import { VIEWS } from './lib/views'
import Landing from './components/Landing'
import Shell from './components/Shell'
import EntryGate from './components/EntryGate'
import FullscreenGuard from './components/FullscreenGuard'
import Showcase from './views/Showcase'
import Gallery from './views/Gallery'

/**
 * Routes are the single source of truth for where you are:
 *   /            the orbit — it now hosts the menu (as an in-orbit overlay) and
 *                the Amenities / Floorplan modes; there is no separate menu page
 *   /showcase/:id  a point's media
 *   /:viewId     the app, showing that panel (Views / Location / Enquire)
 *
 * The shell only mounts on a view route. Its back button returns to the orbit,
 * which reopens on the menu frame.
 */
const AppRoutes = () => {
  const navigate = useNavigate()

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Landing
            onView={(id) => navigate(`/${id}`)}
            onPoint={(pid) => navigate(`/showcase/${pid}`)}
          />
        }
      />
      <Route path="/showcase/:id" element={<Showcase />} />
      <Route path="/gallery" element={<Gallery onBack={() => navigate('/')} />} />
      {VIEWS.map((v) => (
        <Route
          key={v.id}
          path={`/${v.id}`}
          element={<Shell viewId={v.id} onMenu={() => navigate('/')} />}
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * The gate renders alongside the routes rather than instead of them: the
 * landing mounts and warms its hundred orbit frames while the visitor is still
 * being introduced, so the tower is ready the moment the paper lifts.
 *
 * `FullscreenGuard` is the gate's standing order: once full screen has been
 * held, leaving it puts the same paper back until the screen is whole again.
 */
const App = () => (
  <VisitorProvider>
    <ViewProvider>
      <AppRoutes />
      <EntryGate />
      <FullscreenGuard />
    </ViewProvider>
  </VisitorProvider>
)

export default App
