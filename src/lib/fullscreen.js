/**
 * Full screen, in the one shape the app needs it.
 *
 * This is a walk-in kiosk: the tower is composed for the whole glass, so the
 * entry gate asks for it and `FullscreenGuard` asks again the moment the
 * browser hands it back (Esc, F11, the swipe-down chrome on a tablet).
 *
 * Vendor prefixes are still here for iPad Safari, which carries the whole API
 * on `webkit*` and — on the phone — only exposes it for <video>, which is why
 * `fullscreenSupported()` exists at all.
 */

/** Whether this browser will put the *document* into full screen. */
export const fullscreenSupported = () => {
  if (typeof document === 'undefined') return false
  const el = document.documentElement
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen)
}

/** Whether it is in full screen right now. */
export const isFullscreen = () => {
  if (typeof document === 'undefined') return false
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement)
}

/** Ask for it. Must be called inside a user gesture or the browser refuses.
 *  A refusal is not an error here — the visit carries on windowed. */
export const requestFullscreen = async () => {
  const el = document.documentElement
  const req = el.requestFullscreen || el.webkitRequestFullscreen
  if (!req) return false
  try {
    await req.call(el, { navigationUI: 'hide' })
    return true
  } catch {
    return false
  }
}

/** Subscribe to enter/exit. Returns the unsubscribe. */
export const onFullscreenChange = (handler) => {
  document.addEventListener('fullscreenchange', handler)
  document.addEventListener('webkitfullscreenchange', handler)
  return () => {
    document.removeEventListener('fullscreenchange', handler)
    document.removeEventListener('webkitfullscreenchange', handler)
  }
}
