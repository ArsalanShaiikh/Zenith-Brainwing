import { THEMED_LAYER_IDS } from './mapTheme'

/**
 * Apply a theme to the live map instance, instantly. Iterates the explicit
 * allow-list (never walks the style's layers), and skips any layer not yet
 * present — safe to call while the style is still loading.
 */
export function applyMapTheme(map, theme) {
  if (!map) return
  for (const id of THEMED_LAYER_IDS) {
    const paint = theme[id]
    if (!paint || !map.getLayer(id)) continue
    for (const prop of Object.keys(paint)) {
      map.setPaintProperty(id, prop, paint[prop])
    }
  }
}
