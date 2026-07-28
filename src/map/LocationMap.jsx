import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Map, Marker, AttributionControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { gsap, prefersReducedMotion } from '../Gsapconfig'
import { applyMapTheme } from './applyMapTheme'
import { zenithTheme } from './mapTheme'
import { SITE, SITE_CAMERA, POIS, findPoi } from './locationData'
import baseStyle from './zenith-style.json'

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? ''

/**
 * Resolve the style. With a MapTiler key every {key} token in the JSON is
 * filled in; without one we fall back to OpenFreeMap's free, keyless planet
 * tiles + glyphs, so the map works out of the box with no signup.
 */
function buildStyle() {
  const raw = JSON.stringify(baseStyle)
  if (MAPTILER_KEY) return JSON.parse(raw.replaceAll('{key}', MAPTILER_KEY))
  const style = JSON.parse(raw)
  style.glyphs = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
  style.sources.openmaptiles = {
    type: 'vector',
    url: 'https://tiles.openfreemap.org/planet',
  }
  return style
}

const POI_PULSE_SRC = 'zenith-poi-pulse'
const POI_PULSE_COLOR = '#c2a83a' // brass-lift — matches the destination dots

const poiPulseFeatures = () => ({
  type: 'FeatureCollection',
  features: POIS.map((p) => ({
    type: 'Feature',
    properties: { id: p.id },
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  })),
})

const ROUTE_SRC = 'zenith-route'
// A warm amber/gold route, a shade brighter and more saturated than the
// cream terrain so it still lifts off the map. The casing uses the map's own
// dark ink label colour rather than true black, so it cuts a channel through
// the road network without reading as a harsh slash across a light basemap.
const ROUTE_CASE = '#33302a' // dark ink — the channel
const ROUTE_GLOW = '#f5d17e' // amber halo
const ROUTE_LINE = '#ddc85f' // amber path
const ROUTE_PULSE = '#ffffff' // white travelling dashes
const EMPTY = { type: 'FeatureCollection', features: [] }
const lineFeature = (coords) => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }],
})

// Marching-dash phases for the flowing "pulse" along the route. Cycling through
// these shifts the gap, so the bright overlay appears to travel toward the
// destination — the Google-directions feel, done with paint only.
const DASH_STEPS = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5],
  [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5],
  [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
]

/** Fetch a road-following route (site -> dest) from the public OSRM server. */
async function fetchRoute(dest, signal) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${SITE.lng},${SITE.lat};${dest.lng},${dest.lat}` +
    `?overview=full&geometries=geojson`
  const res = await fetch(url, { signal })
  const json = await res.json()
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error('no route')
  return json.routes[0].geometry.coordinates
}

const LocationMap = ({ activeId = null, hoveredId = null, onSelect, onHover }) => {
  const mapRef = useRef(null)
  const mapStyle = useMemo(() => buildStyle(), [])
  const dashRaf = useRef(0)
  const poiPulseRaf = useRef(0)
  const camTween = useRef(null)
  const routeAbort = useRef(null)

  // A sawtooth ring-radius/opacity loop, ground-projected via circle-pitch-
  // alignment: 'map' so the pulse reads as sitting on the terrain rather than
  // as a flat sticker facing the camera.
  const startPoiPulse = useCallback((map) => {
    cancelAnimationFrame(poiPulseRaf.current)
    if (prefersReducedMotion()) {
      map.setPaintProperty('poi-pulse', 'circle-radius', 6)
      map.setPaintProperty('poi-pulse', 'circle-opacity', 0.25)
      return
    }
    const DURATION = 2400
    const MIN_R = 3
    const MAX_R = 15
    const tick = (now) => {
      const t = (now % DURATION) / DURATION
      if (map.getLayer('poi-pulse')) {
        map.setPaintProperty('poi-pulse', 'circle-radius', MIN_R + (MAX_R - MIN_R) * t)
        map.setPaintProperty('poi-pulse', 'circle-opacity', 0.45 * (1 - t))
      }
      poiPulseRaf.current = requestAnimationFrame(tick)
    }
    poiPulseRaf.current = requestAnimationFrame(tick)
  }, [])

  const handleLoad = useCallback((e) => {
    const map = e.target
    mapRef.current = map
    applyMapTheme(map, zenithTheme)

    if (!map.getSource(POI_PULSE_SRC)) {
      map.addSource(POI_PULSE_SRC, { type: 'geojson', data: poiPulseFeatures() })
      // A ring that breathes out from each destination, drawn in map space
      // (not a screen-facing DOM element) so it lies flat on the tilted
      // ground instead of billboarding toward the camera.
      map.addLayer(
        {
          id: 'poi-pulse',
          type: 'circle',
          source: POI_PULSE_SRC,
          paint: {
            'circle-color': POI_PULSE_COLOR,
            'circle-radius': 3,
            'circle-opacity': 0.35,
            'circle-stroke-width': 0,
            'circle-pitch-alignment': 'map',
            'circle-pitch-scale': 'map',
          },
        },
        map.getLayer('building-3d') ? 'building-3d' : undefined,
      )
      startPoiPulse(map)
    }

    if (!map.getSource(ROUTE_SRC)) {
      map.addSource(ROUTE_SRC, { type: 'geojson', data: EMPTY })
      // Amber halo, spreading beyond the casing.
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: ROUTE_SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROUTE_GLOW, 'line-width': 16, 'line-opacity': 0, 'line-blur': 10 },
      })
      // Dark casing — the channel that lifts the route off the gold roads.
      map.addLayer({
        id: 'route-case',
        type: 'line',
        source: ROUTE_SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROUTE_CASE, 'line-width': 9, 'line-opacity': 0 },
      })
      // The path itself — a brighter amber lifted off the cream map.
      map.addLayer({
        id: 'route-base',
        type: 'line',
        source: ROUTE_SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROUTE_LINE, 'line-width': 4.5, 'line-opacity': 0 },
      })
      // The travelling pulse — white dashes marching along the path.
      map.addLayer({
        id: 'route-flow',
        type: 'line',
        source: ROUTE_SRC,
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: {
          'line-color': ROUTE_PULSE,
          'line-width': 4.5,
          'line-opacity': 0,
          'line-dasharray': [0, 4, 3],
        },
      })
    }
  }, [startPoiPulse])

  // ---- route pulse -----------------------------------------------------
  const startPulse = useCallback((map) => {
    cancelAnimationFrame(dashRaf.current)
    if (prefersReducedMotion()) {
      map.setPaintProperty('route-flow', 'line-opacity', 0)
      return
    }
    let step = -1
    const tick = () => {
      const now = performance.now()
      const next = Math.floor((now / 55) % DASH_STEPS.length)
      if (next !== step) {
        step = next
        if (map.getLayer('route-flow')) {
          map.setPaintProperty('route-flow', 'line-dasharray', DASH_STEPS[step])
        }
      }
      dashRaf.current = requestAnimationFrame(tick)
    }
    dashRaf.current = requestAnimationFrame(tick)
  }, [])

  const stopPulse = useCallback(() => cancelAnimationFrame(dashRaf.current), [])

  const showRoute = useCallback(
    (map, coords) => {
      map.getSource(ROUTE_SRC)?.setData(lineFeature(coords))
      const reduced = prefersReducedMotion()
      gsap.to({ o: 0 }, {
        o: 1,
        duration: reduced ? 0 : 0.6,
        ease: 'zenith',
        onUpdate() {
          const o = this.targets()[0].o
          if (!map.getLayer('route-base')) return
          map.setPaintProperty('route-glow', 'line-opacity', 0.22 * o)
          map.setPaintProperty('route-case', 'line-opacity', 0.9 * o)
          map.setPaintProperty('route-base', 'line-opacity', o)
          map.setPaintProperty('route-flow', 'line-opacity', 0.95 * o)
        },
      })
      startPulse(map)
    },
    [startPulse],
  )

  const clearRoute = useCallback(
    (map) => {
      stopPulse()
      const reduced = prefersReducedMotion()
      gsap.to({ o: 1 }, {
        o: 0,
        duration: reduced ? 0 : 0.4,
        ease: 'zenith',
        onUpdate() {
          const o = this.targets()[0].o
          if (!map.getLayer('route-base')) return
          map.setPaintProperty('route-glow', 'line-opacity', 0.22 * o)
          map.setPaintProperty('route-case', 'line-opacity', 0.9 * o)
          map.setPaintProperty('route-base', 'line-opacity', o)
          map.setPaintProperty('route-flow', 'line-opacity', 0.95 * o)
        },
        onComplete() {
          map.getSource(ROUTE_SRC)?.setData(EMPTY)
        },
      })
    },
    [stopPulse],
  )

  // ---- GSAP camera -----------------------------------------------------
  // Drive the camera through a proxy so the move carries the app's zenith ease,
  // with a gentle zoom-out arc through the middle for a cinematic pull rather
  // than a flat pan. Far targets arc more than near ones.
  const flyCamera = useCallback((map, target) => {
    camTween.current?.kill()
    if (prefersReducedMotion()) {
      map.jumpTo(target)
      return
    }
    const from = {
      lng: map.getCenter().lng,
      lat: map.getCenter().lat,
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    }
    const dz = Math.abs(target.zoom - from.zoom)
    const arc = Math.min(1.3, 0.35 + dz * 0.5)
    const proxy = { t: 0 }
    camTween.current = gsap.to(proxy, {
      t: 1,
      duration: 1.7,
      ease: 'zenith',
      onUpdate() {
        const t = proxy.t
        const dip = arc * Math.sin(Math.PI * t)
        map.jumpTo({
          center: [
            from.lng + (target.center[0] - from.lng) * t,
            from.lat + (target.center[1] - from.lat) * t,
          ],
          zoom: from.zoom + (target.zoom - from.zoom) * t - dip,
          pitch: from.pitch + (target.pitch - from.pitch) * t,
          bearing: from.bearing + (target.bearing - from.bearing) * t,
        })
      },
    })
  }, [])

  // ---- react to selection ---------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const poi = activeId ? findPoi(activeId) : null

    if (!poi) {
      clearRoute(map)
      flyCamera(map, {
        center: SITE_CAMERA.center,
        zoom: SITE_CAMERA.zoom,
        pitch: SITE_CAMERA.pitch,
        bearing: SITE_CAMERA.bearing,
      })
      return
    }

    routeAbort.current?.abort()
    const ctrl = new AbortController()
    routeAbort.current = ctrl

    const frameTo = (coords) => {
      // Frame the whole route: extend a bounds over every vertex, then let the
      // map tell us the camera that fits it, and GSAP-move there.
      const b = coords.reduce(
        (acc, c) => [
          Math.min(acc[0], c[0]), Math.min(acc[1], c[1]),
          Math.max(acc[2], c[0]), Math.max(acc[3], c[1]),
        ],
        [180, 90, -180, -90],
      )
      const cam = map.cameraForBounds(
        [[b[0], b[1]], [b[2], b[3]]],
        { padding: { top: 90, right: 80, bottom: 80, left: 80 }, bearing: -14, maxZoom: 15.5 },
      )
      flyCamera(map, {
        center: [cam.center.lng, cam.center.lat],
        zoom: cam.zoom,
        pitch: 48,
        bearing: -14,
      })
    }

    fetchRoute(poi, ctrl.signal)
      .then((coords) => {
        showRoute(map, coords)
        frameTo(coords)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        // OSRM down: fall back to a straight tie-line, still framed + pulsing.
        const straight = [[SITE.lng, SITE.lat], [poi.lng, poi.lat]]
        showRoute(map, straight)
        frameTo(straight)
      })

    return () => ctrl.abort()
  }, [activeId, clearRoute, flyCamera, showRoute])

  useEffect(() => () => {
    stopPulse()
    cancelAnimationFrame(poiPulseRaf.current)
    camTween.current?.kill()
  }, [stopPulse])

  const toggle = (id) => onSelect?.(activeId === id ? null : id)

  return (
    <Map
      initialViewState={{
        longitude: SITE.lng,
        latitude: SITE.lat,
        zoom: SITE_CAMERA.zoom,
        pitch: SITE_CAMERA.pitch,
        bearing: SITE_CAMERA.bearing,
      }}
      mapStyle={mapStyle}
      onLoad={handleLoad}
      attributionControl={false}
      maxPitch={70}
      dragRotate
      touchPitch
      style={{ width: '100%', height: '100%' }}
    >
      <AttributionControl compact position="bottom-right" />

      {/* The tower. */}
      <Marker longitude={SITE.lng} latitude={SITE.lat} anchor="bottom">
        <div className="pointer-events-none flex flex-col items-center">
          <span className="chip mb-2 h-auto gap-2 px-3.5 py-2.5">
            <img
              src="/img/brand/runwal-240.webp"
              alt="Runwal Zenith"
              draggable="false"
              className="h-7 w-auto select-none object-contain"
            />
          </span>
          <span className="relative block h-3 w-3">
            <span className="absolute inset-0 animate-ping rounded-full bg-brass/40" />
            <span className="absolute inset-0 rounded-full bg-brass ring-2 ring-paper/50 shadow-[0_0_0.6rem_rgba(162,138,0,0.7)]" />
          </span>
        </div>
      </Marker>

      {/* Destinations. */}
      {POIS.map((poi) => {
        const isActive = activeId === poi.id
        const isHover = hoveredId === poi.id
        const lifted = isActive || isHover
        return (
          <Marker key={poi.id} longitude={poi.lng} latitude={poi.lat} anchor="center">
            <button
              type="button"
              data-observer-ignore
              onClick={() => toggle(poi.id)}
              onPointerEnter={() => onHover?.(poi.id)}
              onPointerLeave={() => onHover?.(null)}
              aria-label={`${poi.place}, ${poi.dist}`}
              className="relative flex flex-col items-center border-0 bg-transparent p-0"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  isActive
                    ? 'h-3.5 w-3.5 bg-brass-lift ring-2 ring-paper/60 shadow-[0_0_0.7rem_rgba(194,168,58,0.8)]'
                    : isHover
                      ? 'h-3 w-3 bg-brass ring-2 ring-paper/45'
                      : 'h-2 w-2 bg-paper/85 ring-1 ring-brass/70'
                }`}
              />
              <span
                className={`chip pointer-events-none absolute bottom-full mb-2 gap-2 whitespace-nowrap px-2.5 py-1 transition-all duration-300 ${
                  lifted ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                }`}
              >
                <span className="text-[11px] font-normal text-ink">{poi.place}</span>
                <span className="t-fig text-[10px] text-brass-ink">{poi.dist}</span>
              </span>
            </button>
          </Marker>
        )
      })}
    </Map>
  )
}

export default LocationMap
