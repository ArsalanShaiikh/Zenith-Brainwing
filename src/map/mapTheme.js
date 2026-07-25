/**
 * Runtime map palette — the same contract as arcade-sapphire, tuned to Zenith.
 *
 * Every value MUST be a flat hex string or a flat number. Zoom-dependent paint
 * (road-width interpolations, extrusion-height ramps) lives in zenith-style.json,
 * never here. `zenithTheme` mirrors the values already baked into that style, so
 * applyMapTheme(map, zenithTheme) on load is a no-op that asserts the contract
 * and gives one place to re-tune colours later.
 *
 * The map is deliberately dark — it reads as one more graded plate, with the
 * light glass destination panel floating over it, exactly like every other view.
 */

export const INK_BG = '#14110c'
export const INK_MASS = '#1a1610'
export const INK_3D = '#1e1913'
export const SLATE = '#12171b'
export const STRUCT = '#4a453a'
export const BRASS_SHADOW = '#6f5d1e'
export const BRASS = '#a28a00'
export const BRASS_LIFT = '#c2a83a'
export const BONE = '#8a8272'
export const BONE_DIM = '#7a7263'
export const PAPER = '#f4f1ea'

/** The full allow-list of themeable layer ids. Must match zenith-style.json. */
export const THEMED_LAYER_IDS = [
  'bg',
  'landcover',
  'landuse',
  'park',
  'water',
  'waterway',
  'road-minor',
  'road-secondary',
  'road-primary',
  'road-motorway',
  'building',
  'building-3d',
  'boundary',
  'label-place-minor',
  'label-place-major',
  'label-road',
]

export const zenithTheme = {
  bg: { 'background-color': INK_BG },
  landcover: { 'fill-color': INK_MASS, 'fill-opacity': 0.6 },
  landuse: { 'fill-color': INK_MASS, 'fill-opacity': 0.4 },
  park: { 'fill-color': INK_MASS, 'fill-opacity': 0.75 },
  water: { 'fill-color': SLATE, 'fill-opacity': 0.92 },
  waterway: { 'line-color': SLATE, 'line-opacity': 1 },
  'road-minor': { 'line-color': STRUCT, 'line-opacity': 0.25 },
  'road-secondary': { 'line-color': BRASS_SHADOW, 'line-opacity': 0.75 },
  'road-primary': { 'line-color': BRASS, 'line-opacity': 0.85 },
  'road-motorway': { 'line-color': BRASS_LIFT, 'line-opacity': 1 },
  building: { 'fill-color': INK_MASS, 'fill-opacity': 0.85 },
  'building-3d': { 'fill-extrusion-color': INK_3D, 'fill-extrusion-opacity': 0.9 },
  boundary: { 'line-color': STRUCT, 'line-opacity': 0.3 },
  'label-place-minor': {
    'text-color': BONE,
    'text-halo-color': INK_BG,
    'text-halo-width': 1,
  },
  'label-place-major': {
    'text-color': PAPER,
    'text-halo-color': INK_BG,
    'text-halo-width': 1,
  },
  'label-road': {
    'text-color': BONE_DIM,
    'text-halo-color': INK_BG,
    'text-halo-width': 1,
  },
}
