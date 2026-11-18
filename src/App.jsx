import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { ViewProvider } from './context/ViewContext'
import { VisitorProvider } from './context/VisitorContext'
import { VIEWS } from './lib/views'
import { initHeatmapTracking } from './lib/analytics'
import { flushPendingEnquiries } from './lib/enquiries'

import Landing from './components/Landing'
import Shell from './components/Shell'
import EntryGate from './components/EntryGate'
import FullscreenGuard from './components/FullscreenGuard'
import BrandMark from './components/BrandMark'
import VisitorProfileTracker from './components/VisitorProfileTracker'

import Showcase from './views/Showcase'
import Gallery from './views/Gallery'
import InteriorViewer from './InteriorViewer'

import Admin from './admin/Admin'

const AppRoutes = () => {
  const navigate = useNavigate()

  return (
    <Routes>
      {/* ================================================= */}
      {/* ADMIN — KEEP THIS BEFORE THE /:viewId ROUTES     */}
      {/* ================================================= */}

      <Route
        path="/admin"
        element={<Admin />}
      />

      {/* ================================================= */}
      {/* MAIN ZENITH WEBSITE                              */}
      {/* ================================================= */}

      <Route
        path="/"
        element={
          <Landing
            onView={(id, opts) => navigate(`/${id}`, opts)}
            onPoint={(pid) => navigate(`/showcase/${pid}`)}
          />
        }
      />

      {/* ================================================= */}
      {/* SHOWCASE                                         */}
      {/* ================================================= */}

      <Route
        path="/showcase/:id"
        element={<Showcase />}
      />

      {/* ================================================= */}
      {/* GALLERY                                          */}
      {/* ================================================= */}

      <Route
        path="/gallery"
        element={
          <Gallery
            onBack={() => navigate('/')}
          />
        }
      />

      {/* ================================================= */}
      {/* DEV INTERIORS                                    */}
      {/* ================================================= */}

      {import.meta.env.DEV && (
        <Route
          path="/dev/interiors"
          element={<InteriorViewer />}
        />
      )}

      {/* ================================================= */}
      {/* ZENITH VIEW ROUTES                               */}
      {/* ================================================= */}

      {VIEWS.map((v) => (
        <Route
          key={v.id}
          path={`/${v.id}`}
          element={
            <Shell
              viewId={v.id}
              onMenu={(state) =>
                navigate(
                  '/',
                  state
                    ? { state }
                    : undefined
                )
              }
            />
          }
        />
      ))}

      {/* ================================================= */}
      {/* FALLBACK                                          */}
      {/* ================================================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  )
}

const App = () => {
  // One global capturing click listener for the whole app's lifetime — this
  // is the single place website-interaction heatmap clicks are captured, so
  // no page/view component needs its own tracking code. Excludes /admin
  // itself; see initHeatmapTracking in lib/analytics.js.
  useEffect(() => {
    initHeatmapTracking()
    // Leads that couldn't be saved earlier on this device (offline, etc.).
    flushPendingEnquiries()
  }, [])

  // /admin is staff-only: none of the visitor chrome belongs on it — not the
  // entry gate's name prompt, not the full-screen guard, not visitor
  // profiling (which would also count staff as visitors).
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  return (
    <VisitorProvider>
      <ViewProvider>
        <AppRoutes />

        {!isAdmin && (
          <>
            <VisitorProfileTracker />
            <BrandMark />
            <EntryGate />
            <FullscreenGuard />
          </>
        )}
      </ViewProvider>
    </VisitorProvider>
  )
}

export default App