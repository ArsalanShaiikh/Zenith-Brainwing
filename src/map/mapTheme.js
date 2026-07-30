/**
 * Runtime map palette — the same contract as arcade-sapphire, tuned to Zenith.
 *
 * Every value MUST be a flat hex string or a flat number. Zoom-dependent paint
 * (road-width interpolations, extrusion-height ramps) lives in zenith-style.json,
 * never here. `zenithTheme` mirrors the values already baked into that style, so
 * applyMapTheme(map, zenithTheme) on load is a no-op that asserts the contract
 * and gives one place to re-tune colours later.
 *
 * Palette lifted from the "Portraits from Life" brochure map (cream terrain,
 * sky-blue water, sage parkland) rather than the previous dark ink/brass plate.
 */

export const CREAM = '#f7eedc'
export const CREAM_MASS = '#fff7ea'
export const CREAM_DEEP = '#f0e5d4'
export const SKY = '#c3e2ec'
export const SKY_DEEP = '#9ecddb'
export const SAGE = '#c7d8a0'
export const ROAD_FAINT = '#c7c1b1'
export const ROAD_MID = '#c7c1b1'
export const ROAD_MAIN = '#c7c1b1'
export const ROAD_HIGHWAY = '#c7c1b1'
export const LINE_SOFT = '#c9bc9c'
export const INK = '#33302a'
export const INK_DIM = '#5c5748'

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
  bg: { 'background-color': CREAM },
  landcover: { 'fill-color': CREAM_MASS, 'fill-opacity': 0.6 },
  landuse: { 'fill-color': CREAM_MASS, 'fill-opacity': 0.4 },
  park: { 'fill-color': SAGE, 'fill-opacity': 0.75 },
  water: { 'fill-color': SKY, 'fill-opacity': 0.92 },
  waterway: { 'line-color': SKY_DEEP, 'line-opacity': 1 },
  'road-minor': { 'line-color': ROAD_FAINT, 'line-opacity': 0.5 },
  'road-secondary': { 'line-color': ROAD_MID, 'line-opacity': 0.8 },
  'road-primary': { 'line-color': ROAD_MAIN, 'line-opacity': 0.9 },
  'road-motorway': { 'line-color': ROAD_HIGHWAY, 'line-opacity': 1 },
  building: { 'fill-color': CREAM_MASS, 'fill-opacity': 0.85 },
  'building-3d': { 'fill-extrusion-color': CREAM_DEEP, 'fill-extrusion-opacity': 0.9 },
  boundary: { 'line-color': LINE_SOFT, 'line-opacity': 0.4 },
  'label-place-minor': {
    'text-color': INK_DIM,
    'text-halo-color': CREAM,
    'text-halo-width': 1,
  },
  'label-place-major': {
    'text-color': INK,
    'text-halo-color': CREAM,
    'text-halo-width': 1,
  },
  'label-road': {
    'text-color': INK_DIM,
    'text-halo-color': CREAM,
    'text-halo-width': 1,
  },
}
