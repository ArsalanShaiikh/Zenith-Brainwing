import { supabase, supabaseConfigured } from './supabase'

/**
 * Visitor device/location profile.
 *
 * PRIVACY NOTES (read before touching this file):
 *  - No fingerprinting: device/browser/OS come from a few `navigator.userAgent`
 *    substring checks, giving only coarse categories (e.g. "Chrome"), not an
 *    identifying signal.
 *  - No MAC address collection — browsers cannot expose this, and nothing
 *    here tries to.
 *  - GPS coordinates are rounded to 2 decimal places (~1.1km) before they
 *    ever leave this module, so nothing more precise than "neighbourhood
 *    level" is stored or sent anywhere.
 *  - The visitor's public IP is never sent to, or stored by, the frontend.
 *    When GPS isn't available, a Supabase Edge Function resolves the caller's
 *    IP itself (server-side), does the IP→city lookup, and writes the row
 *    directly with a truncated IP (last octet zeroed) — see visitor-geo.
 *  - Location is requested at most once per browser session (guarded by a
 *    sessionStorage flag), whatever the outcome — granted, denied, or failed.
 *
 * WRITE MODEL (read before changing how rows are saved):
 *  The anon role may INSERT into visitor_locations but may not UPDATE it —
 *  and an upsert is an update, so it is refused with 42501 "permission
 *  denied". That is deliberate on the database side (anon must never be able
 *  to read or rewrite other visitors' rows), so the browser writes exactly
 *  one row per visitor, once everything it knows has been gathered:
 *    GPS granted  → one INSERT with device + rounded coords + place names
 *    GPS refused, → the visitor-geo Edge Function, which writes the row
 *    timed out,     server-side (service role) with device + IP-derived place
 *    or missing
 *  Never both, and never an upsert from here.
 */

const VISITOR_ID_KEY = 'zenith_visitor_id'
const GEO_ATTEMPTED_KEY = 'zenith_geo_attempted'

/** Same anonymous id every other tracker in analytics.js already uses. */
const getVisitorId = () => {
  try {
    let id = sessionStorage.getItem(VISITOR_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(VISITOR_ID_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

/* ---------- device / browser / OS: categorical UA checks only ---------- */

const detectDevice = (ua) => {
  if (/ipad|tablet(?!.*mobile)/i.test(ua)) return 'tablet'
  if (/mobi|iphone|ipod|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

const detectBrowser = (ua) => {
  if (/edg\//i.test(ua)) return 'Edge'
  if (/opr\/|opera/i.test(ua)) return 'Other'
  if (/chrome|crios/i.test(ua)) return 'Chrome'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua)) return 'Safari'
  return 'Other'
}

const detectOS = (ua) => {
  if (/windows/i.test(ua)) return 'Windows'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/android/i.test(ua)) return 'Android'
  if (/mac os x|macintosh/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Other'
}

const deviceProfile = () => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  return {
    device_type: detectDevice(ua),
    browser: detectBrowser(ua),
    os: detectOS(ua),
  }
}

/* ---------- GPS → Nominatim reverse geocode ---------- */

const round = (n) => Math.round(n * 100) / 100 // ~1.1km precision

const reverseGeocode = async (lat, lon) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`nominatim ${res.status}`)
  const data = await res.json()
  const a = data?.address || {}
  return {
    locality: a.suburb || a.neighbourhood || a.locality || null,
    city: a.city || a.town || a.city_district || a.county || null,
    state: a.state || null,
    country: a.country || null,
  }
}

/** Resolves with `fallback` if `promise` hasn't settled within `ms`. */
const withTimeout = (promise, ms, fallback) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))])

// The browser's own `timeout` option does not run while the permission
// prompt is open, so a visitor who never answers it would leave the promise
// pending forever. This outer cap covers that case.
const GPS_HARD_TIMEOUT_MS = 15000
const GEOCODE_TIMEOUT_MS = 6000

const getGpsPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation unavailable'))
      return
    }
    const timer = setTimeout(() => reject(new Error('no answer to location prompt')), GPS_HARD_TIMEOUT_MS)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve(pos.coords)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    )
  })

/* ---------- the single visitor_locations write ---------- */

/** One INSERT per visitor — see WRITE MODEL at the top of this file. */
const insertVisitorLocation = async (row) => {
  const { error } = await supabase.from('visitor_locations').insert(row)
  // 23505 = this visitor already has a row (e.g. written earlier this
  // session); nothing to do, anon can't update it anyway.
  if (error && error.code !== '23505') {
    console.warn('visitor_locations insert failed:', error.message)
    return false
  }
  return true
}

/** IP fallback — server-side only; see visitor-geo Edge Function. */
const requestIpFallback = async (visitorId, profile) => {
  try {
    const { error } = await supabase.functions.invoke('visitor-geo', {
      body: { visitor_id: visitorId, ...profile },
    })
    if (error) console.warn('visitor-geo function failed:', error.message)
  } catch (err) {
    console.warn('visitor-geo function failed:', err)
  }
}

/**
 * Call once per app load, after the visitor has actually entered the site
 * (see VisitorProfileTracker.jsx, gated on VisitorContext's `gateOpen`).
 * Fire-and-forget throughout: never throws, never blocks anything the
 * visitor is doing.
 */
export const initVisitorProfile = async () => {
  if (!supabaseConfigured) return
  try {
    const visitorId = getVisitorId()
    if (!visitorId) return

    // Once per session: a reload in the same tab already has its row.
    try {
      if (sessionStorage.getItem(GEO_ATTEMPTED_KEY) === '1') return
      sessionStorage.setItem(GEO_ATTEMPTED_KEY, '1')
    } catch {
      /* sessionStorage unavailable — carry on; the insert de-dupes itself */
    }

    const profile = deviceProfile()

    let coords
    try {
      coords = await getGpsPosition()
    } catch (err) {
      // Denied, timed out, unanswered or unsupported — the Edge Function
      // resolves the IP server-side and writes the whole row.
      console.warn('GPS location unavailable, falling back to IP:', err?.message || err)
      await requestIpFallback(visitorId, profile)
      return
    }

    const lat = round(coords.latitude)
    const lon = round(coords.longitude)
    // Coordinates are worth keeping even if the place lookup fails or stalls.
    const place = await withTimeout(
      reverseGeocode(lat, lon).catch((err) => {
        console.warn('reverse geocode failed:', err)
        return {}
      }),
      GEOCODE_TIMEOUT_MS,
      {}
    )

    const saved = await insertVisitorLocation({
      visitor_id: visitorId,
      last_seen: new Date().toISOString(),
      ...profile,
      latitude: lat,
      longitude: lon,
      ...place,
    })
    // If the direct write was refused, the server-side path can still
    // record the visitor (by IP) rather than losing them entirely.
    if (!saved) await requestIpFallback(visitorId, profile)
  } catch (err) {
    console.warn('visitor profile init failed:', err)
  }
}
