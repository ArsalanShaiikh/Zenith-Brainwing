/** Thin cross-browser wrapper around the Fullscreen API (plus webkit prefixes
 *  for older Safari), shared by the hotspot click handler — which needs to
 *  fire the request synchronously inside the click to count as a user
 *  gesture — and the panorama modal's own fullscreen toggle/tracking. */

export const fullscreenSupported = () => {
  if (typeof document === 'undefined') return false
  const el = document.documentElement
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen)
}

export const isFullscreenActive = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement)

export const requestFullscreen = (el) => {
  const req = el?.requestFullscreen || el?.webkitRequestFullscreen
  if (!req) return
  // Fire-and-forget: some browsers reject this outside a "fresh" user
  // gesture, in which case the UI just stays as a fixed full-viewport
  // overlay instead — nothing is actually broken.
  Promise.resolve(req.call(el)).catch(() => {})
}

export const exitFullscreen = () => {
  const exit = document.exitFullscreen || document.webkitExitFullscreen
  if (!exit) return
  Promise.resolve(exit.call(document)).catch(() => {})
}
