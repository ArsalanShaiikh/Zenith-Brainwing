import { supabase } from './supabase'

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

const getGpsPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    )
  })

/* ---------- upsert into visitor_locations ---------- */

const upsertVisitorLocation = async (visitorId, patch) => {
  const { error } = await supabase
    .from('visitor_locations')
    .upsert(
      { visitor_id: visitorId, last_seen: new Date().toISOString(), ...patch },
      { onConflict: 'visitor_id' }
    )
  if (error) console.warn('visitor_locations upsert failed:', error.message)
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
  try {
    const visitorId = getVisitorId()
    if (!visitorId) return

    const profile = deviceProfile()

    // Record device/browser/OS immediately, even before location resolves —
    // that way a GPS denial or a slow/failed lookup still leaves a usable row.
    await upsertVisitorLocation(visitorId, profile)

    let alreadyAttempted = false
    try {
      alreadyAttempted = sessionStorage.getItem(GEO_ATTEMPTED_KEY) === '1'
    } catch {
      /* sessionStorage unavailable — treat as not-yet-attempted this call */
    }
    if (alreadyAttempted) return

    const markAttempted = () => {
      try {
        sessionStorage.setItem(GEO_ATTEMPTED_KEY, '1')
      } catch {
        /* ignore */
      }
    }

    try {
      const coords = await getGpsPosition()
      const lat = round(coords.latitude)
      const lon = round(coords.longitude)
      let place = {}
      try {
        place = await reverseGeocode(lat, lon)
      } catch (err) {
        console.warn('reverse geocode failed:', err)
        // Coordinates still worth keeping even if the place lookup failed.
      }
      await upsertVisitorLocation(visitorId, { latitude: lat, longitude: lon, ...place })
    } catch (err) {
      // Denied, timed out, or unsupported — fall back to the IP-based
      // Edge Function exactly once, never retried this session either way.
      console.warn('GPS location unavailable, falling back to IP:', err?.message || err)
      await requestIpFallback(visitorId, profile)
    } finally {
      markAttempted()
    }
  } catch (err) {
    console.warn('visitor profile init failed:', err)
  }
}
