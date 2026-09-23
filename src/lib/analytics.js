import { supabase } from './supabase'

/**
 * GA4 event helpers. gtag is initialised once in index.html; this only sends
 * events through it and is a no-op when the tag is blocked or absent.
 */
const send = (name, params) => {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

/** Anonymous per-tab visitor id; no Supabase Auth involved. */
const getVisitorId = () => {
  try {
    let id = sessionStorage.getItem('zenith_visitor_id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('zenith_visitor_id', id)
    }
    return id
  } catch {
    return null
  }
}

const MAX_FLOOR_NAME = 60
const DUPLICATE_WINDOW_MS = 1500
let lastLive = { name: null, at: 0 }

/** Live copy for the /admin dashboard. Fire-and-forget: never throws. */
const saveFloorSelection = (floorName) => {
  try {
    const name = typeof floorName === 'string' ? floorName.trim() : ''
    if (!name || name.length > MAX_FLOOR_NAME) return
    const visitorId = getVisitorId()
    if (!visitorId) return

    const now = Date.now()
    if (name === lastLive.name && now - lastLive.at < DUPLICATE_WINDOW_MS) return
    lastLive = { name, at: now }

    supabase
      .from('floor_plan_events')
      .insert({ floor_name: name, visitor_id: visitorId })
      .then(({ error }) => {
        if (error) console.warn('floor_plan_events insert failed:', error.message)
      })
      .catch((err) => console.warn('floor_plan_events insert failed:', err))
  } catch (err) {
    console.warn('floor_plan_events insert failed:', err)
  }
}

export const trackFloorPlanView = (floorName = 'Floor Plan') =>
  send('floor_plan_view', { floor_name: floorName })

export const trackFloorPlanSelect = (floorName) => {
  if (!floorName) return
  send('floor_plan_select', { floor_name: floorName })
  saveFloorSelection(floorName)
}

const MAX_UNIT_NAME = 120
let lastUnitLive = { key: null, at: 0 }

/** Live copy for the /admin Unit Interest section. Fire-and-forget: never throws. */
const saveUnitSelection = (unitId, unitName) => {
  try {
    const name = typeof unitName === 'string' ? unitName.trim() : ''
    if (!name || name.length > MAX_UNIT_NAME) return
    const visitorId = getVisitorId()
    if (!visitorId) return

    const dedupeKey = unitId || name
    const now = Date.now()
    if (dedupeKey === lastUnitLive.key && now - lastUnitLive.at < DUPLICATE_WINDOW_MS) return
    lastUnitLive = { key: dedupeKey, at: now }

    supabase
      .from('unit_selection_events')
      .insert({ unit_id: unitId || null, unit_name: name, visitor_id: visitorId })
      .then(({ error }) => {
        if (error) console.warn('unit_selection_events insert failed:', error.message)
      })
      .catch((err) => console.warn('unit_selection_events insert failed:', err))
  } catch (err) {
    console.warn('unit_selection_events insert failed:', err)
  }
}

/**
 * Fires when a visitor selects a residence on "Search by unit" (FloorExplorer's
 * search mode) — `unit` is the actual plan record from lib/floorplans.js
 * (`{ key, name, ... }`), never a hard-coded name.
 */
export const trackUnitSelect = (unit) => {
  const unitName = typeof unit?.name === 'string' ? unit.name.trim() : ''
  if (!unitName) return
  const unitId = unit.key ?? unit.id ?? ''
  send('unit_select', { unit_id: unitId, unit_name: unitName })
  saveUnitSelection(unitId, unitName)
}

/** The site's six real navigation items, keyed by the id `onMenuSelect` in
 *  Landing.jsx already receives from OrbitMenu / the standing Enquire CTA —
 *  see src/lib/views.js MENU_ITEMS for where those ids come from. */
const MENU_EVENTS = {
  views: 'views_click',
  amenities: 'amenities_click',
  location: 'location_click',
  floorplan: 'floorplan_click',
  gallery: 'gallery_click',
  enquire: 'generate_lead',
}

// Fire-and-forget copy for the /admin visitor-location dashboard, so section
// views can be cross-referenced against a visitor's locality (e.g. "which
// sections are visitors from Borivali looking at"). Deliberately a separate,
// narrow table from the abandoned interaction_events experiment — this only
// ever stores which of the six real nav items was opened, nothing generic.
const savePageView = (page) => {
  try {
    const visitorId = getVisitorId()
    if (!visitorId) return

    supabase
      .from('visitor_page_views')
      .insert({ visitor_id: visitorId, page })
      .then(({ error }) => {
        if (error) console.warn('visitor_page_views insert failed:', error.message)
      })
      .catch((err) => console.warn('visitor_page_views insert failed:', err))
  } catch (err) {
    console.warn('visitor_page_views insert failed:', err)
  }
}

export const trackMenuSelect = (id) => {
  const eventName = MENU_EVENTS[id]
  if (!eventName) return
  send(eventName)
  savePageView(id)
}

/* =========================================================
   WEBSITE INTERACTION HEATMAP
   A global click listener (attached once from App.jsx) queues normalized
   click coordinates and flushes them in small batches — never one request
   per click — so it can't affect site responsiveness.
========================================================= */

const HEATMAP_QUEUE_LIMIT = 20
const HEATMAP_FLUSH_MS = 5000

let heatmapQueue = []
let heatmapInitialized = false

const flushHeatmapQueue = () => {
  if (!heatmapQueue.length) return
  const batch = heatmapQueue
  heatmapQueue = []

  supabase
    .from('website_heatmap_events')
    .insert(batch)
    .then(({ error }) => {
      if (error) console.warn('website_heatmap_events insert failed:', error.message)
    })
    .catch((err) => console.warn('website_heatmap_events insert failed:', err))
}

/**
 * Attaches one capturing click listener for the app's lifetime. Call once
 * from the top-level App component — never per-page — so no component has
 * to be individually instrumented. Admin's own clicks are excluded so the
 * dashboard doesn't pollute its own heatmap data.
 */
export const initHeatmapTracking = () => {
  if (heatmapInitialized || typeof document === 'undefined') return
  heatmapInitialized = true

  const onClick = (e) => {
    try {
      if (window.location.pathname.startsWith('/admin')) return

      const vw = window.innerWidth
      const vh = window.innerHeight
      if (!vw || !vh) return

      const visitorId = getVisitorId()
      if (!visitorId) return

      // clientX/clientY are viewport-relative — exactly what x_percent /
      // y_percent need to mean the same place on any screen size.
      heatmapQueue.push({
        visitor_id: visitorId,
        page: window.location.pathname || '/',
        event_type: 'click',
        x_percent: Math.min(1, Math.max(0, e.clientX / vw)),
        y_percent: Math.min(1, Math.max(0, e.clientY / vh)),
        viewport_width: vw,
        viewport_height: vh,
      })

      if (heatmapQueue.length >= HEATMAP_QUEUE_LIMIT) flushHeatmapQueue()
    } catch (err) {
      console.warn('heatmap click capture failed:', err)
    }
  }

  // capture + passive: sees every click (even ones an inner handler stops
  // from bubbling) without ever blocking the click itself.
  document.addEventListener('click', onClick, { capture: true, passive: true })

  setInterval(flushHeatmapQueue, HEATMAP_FLUSH_MS)

  // Best-effort flush of whatever's still queued when the tab is hidden or
  // closed, instead of waiting for the next interval.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushHeatmapQueue()
  })
  window.addEventListener('pagehide', flushHeatmapQueue)
}

/** 1 → "1st Floor", 2 → "2nd Floor", 11 → "11th Floor". */
export const ordinalFloorName = (n) => {
  const v = n % 100
  const suffix = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix} Floor`
}
