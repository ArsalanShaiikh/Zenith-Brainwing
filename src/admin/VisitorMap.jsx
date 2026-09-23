import { useEffect, useState } from 'react'
import { Map, Marker, AttributionControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from '../lib/supabase'

/* =========================================================
   LOCATION MAP
   Uses the project's existing maplibre-gl / react-map-gl stack (already a
   dependency for the site's own Location page) instead of adding a second
   map library. The basemap is OpenFreeMap's hosted "positron" style — the
   same free, keyless tile source the site's own LocationMap.jsx already
   falls back to when no MapTiler key is configured (see buildStyle() there)
   — not the site's branded zenith-style.json, which is built for a scenic
   property map with routes/POIs and isn't a fit for a plain admin density
   view. (CARTO's raster basemaps, used here originally, now require an API
   key on their free tier, which is why this doesn't use those.)

   Every marker here is an AREA aggregate from visitor_area_summary (count +
   an averaged, already-rounded coordinate) — never a single visitor's exact
   position — sized by visitor count, not plotted per-visitor.
========================================================= */

const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 30

// Fits Mumbai/Thane by default.
const DEFAULT_VIEW = { longitude: 72.95, latitude: 19.2, zoom: 9.2 }

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

const radiusFor = (count, max) => 8 + (Math.min(count, max) / max) * 20

const VisitorMap = () => {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS).toISOString()

    supabase
      .rpc('visitor_area_summary', { since })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return
        if (rpcError) {
          setError(rpcError.message)
        } else {
          setError('')
          setRows(
            (data || []).filter(
              (r) => Number.isFinite(Number(r.avg_lat)) && Number.isFinite(Number(r.avg_lon))
            )
          )
        }
        setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) {
    return (
      <div className="flex h-[320px] items-center justify-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        Loading map...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[320px] items-center justify-center text-[9px] uppercase tracking-[0.2em] text-red-300/60">
        Unable to load map data
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex h-[320px] items-center justify-center text-[9px] uppercase tracking-[0.2em] text-white/20">
        No location data yet
      </div>
    )
  }

  const maxVisitors = Math.max(...rows.map((r) => Number(r.visitors) || 0), 1)

  return (
    <div className="h-[320px] w-full overflow-hidden border border-white/[0.08]">
      <Map
        initialViewState={DEFAULT_VIEW}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        scrollZoom={false}
      >
        <AttributionControl
          compact
          customAttribution="© OpenStreetMap contributors"
        />

        {rows.map((r) => {
          const size = radiusFor(Number(r.visitors) || 0, maxVisitors) * 2
          return (
            <Marker
              key={r.area}
              longitude={Number(r.avg_lon)}
              latitude={Number(r.avg_lat)}
              anchor="center"
            >
              <div
                title={`${r.area} — ${Number(r.visitors).toLocaleString('en-IN')} visitors`}
                className="rounded-full border border-[#b79b68] bg-[#b79b68]/35"
                style={{ width: size, height: size }}
              />
            </Marker>
          )
        })}
      </Map>
    </div>
  )
}

export default VisitorMap
