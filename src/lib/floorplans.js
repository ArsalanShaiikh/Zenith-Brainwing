/**
 * Bundled floorplan set (images in `public/img/plans/`) and the mapping that
 * ties each floor-plate SVG on a tower elevation to a plan. Ported from the
 * `newfloor` branch — self-contained, no CMS.
 *
 * A plate's *rank* (0 = topmost floor band, going down) is bucketed across this
 * ordered list, so the crown maps to the largest jodi and the base to the
 * typical floor — top-to-bottom, just like the tower reads.
 *
 * Every area figure below is transcribed from the RERA CARPET / BALCONY / TOTAL
 * table printed on the corresponding plan sheet, and the room list is what the
 * sheet actually draws. Nothing here is estimated — if a sheet doesn't state it
 * (floor numbers, pricing), it isn't in this file.
 */

/** Amenities a plan may carry, in the order they read as filter chips. Only
 *  the ones that actually separate the plans are offered as filters; `utility`
 *  and `deck` are on every residence, so they're detail, not a facet. */
export const FEATURES = [
  { key: 'study', label: 'Study' },
  { key: 'gym', label: 'Home gym' },
  { key: 'puja', label: 'Puja room' },
  { key: 'dress', label: 'Dressing room' },
  { key: 'powder', label: 'Powder room' },
  { key: 'utility', label: 'Utility', detailOnly: true },
  { key: 'deck', label: 'Deck', detailOnly: true },
]

export const FEATURE_LABELS = Object.fromEntries(FEATURES.map((f) => [f.key, f.label]))

/** The facets offered as filter chips — everything except the universal ones. */
export const FEATURE_FILTERS = FEATURES.filter((f) => !f.detailOnly)

/** Plan families. `reference` plans are whole-floor drawings, not a residence,
 *  so they carry no carpet area. */
export const PLAN_TYPES = [
  { key: 'residence', label: '3 BHK' },
  { key: 'jodi', label: 'Jodi · 5 BHK' },
  { key: 'reference', label: 'Reference' },
]

export const FLOOR_PLANS = [
  {
    key: 'jodi-2',
    name: 'Jodi 04-05 — 5 BHK',
    sheet: 'Jodi Unit 04-05',
    band: 'Crown floors',
    base: '/img/plans/jodi-2',
    config: 'Jodi · 5 BHK',
    type: 'jodi',
    bedrooms: 5,
    carpet: { sqm: 192.35, sqft: 2040.76 },
    balcony: { sqm: 7.46, sqft: 80.3 },
    total: { sqm: 199.81, sqft: 2150.75 },
    features: ['study', 'puja', 'dress', 'utility', 'deck'],
    living: '25’7" × 10’10"',
  },
  {
    key: 'jodi-1',
    name: 'Jodi 01-02 — 5 BHK',
    sheet: 'Jodi Unit 01-02',
    band: 'Upper floors',
    base: '/img/plans/jodi-1',
    config: 'Jodi · 5 BHK',
    type: 'jodi',
    bedrooms: 5,
    carpet: { sqm: 217.78, sqft: 2344.18 },
    balcony: { sqm: 8.44, sqft: 90.85 },
    total: { sqm: 226.22, sqft: 2435.03 },
    features: ['study', 'gym', 'puja', 'dress', 'powder', 'utility', 'deck'],
    living: '23’6" × 19’1"',
  },
  {
    key: 'unit-6',
    name: 'Residence 06 — 3 BHK',
    sheet: 'Unit 6 — 3 BHK',
    band: 'High floors',
    base: '/img/plans/unit-6',
    config: '3 BHK',
    type: 'residence',
    bedrooms: 3,
    carpet: { sqm: 86.78, sqft: 934.1 },
    balcony: { sqm: 3.05, sqft: 32.83 },
    total: { sqm: 89.83, sqft: 966.93 },
    features: ['utility', 'deck'],
    living: '10’0" × 13’8"',
  },
  {
    key: 'unit-5',
    name: 'Residence 05 — 3 BHK',
    sheet: 'Unit 5 — 3 BHK',
    band: 'High floors',
    base: '/img/plans/unit-5',
    config: '3 BHK',
    type: 'residence',
    bedrooms: 3,
    carpet: { sqm: 96.58, sqft: 1039.59 },
    balcony: { sqm: 3.74, sqft: 40.26 },
    total: { sqm: 100.32, sqft: 1079.84 },
    features: ['utility', 'deck'],
    living: '19’1" × 11’6"',
  },
  {
    key: 'unit-4',
    name: 'Residence 04 — 3 BHK',
    sheet: 'Unit 4 — 3 BHK',
    band: 'Upper-mid floors',
    base: '/img/plans/unit-4',
    config: '3 BHK',
    type: 'residence',
    bedrooms: 3,
    carpet: { sqm: 95.77, sqft: 1030.87 },
    balcony: { sqm: 3.72, sqft: 40.04 },
    total: { sqm: 99.49, sqft: 1070.91 },
    features: ['utility', 'deck'],
    living: '19’1" × 11’6"',
  },
  {
    key: 'unit-3',
    name: 'Residence 03 — 3 BHK',
    sheet: 'Unit 3 — 3 BHK',
    band: 'Mid floors',
    base: '/img/plans/unit-3',
    config: '3 BHK',
    type: 'residence',
    bedrooms: 3,
    carpet: { sqm: 101.57, sqft: 1093.3 },
    balcony: { sqm: 4.46, sqft: 48.01 },
    total: { sqm: 106.03, sqft: 1141.31 },
    features: ['powder', 'utility', 'deck'],
    living: '10’0" × 14’7"',
  },
  {
    key: 'unit-2',
    name: 'Residence 02 — 3 BHK',
    sheet: 'Unit 2 — 3 BHK',
    band: 'Lower-mid floors',
    base: '/img/plans/unit-2',
    config: '3 BHK',
    type: 'residence',
    bedrooms: 3,
    carpet: { sqm: 108.61, sqft: 1169.08 },
    balcony: { sqm: 4.19, sqft: 45.1 },
    total: { sqm: 112.8, sqft: 1214.18 },
    features: ['puja', 'dress', 'powder', 'utility', 'deck'],
    living: '19’0" × 11’6"',
  },
  {
    key: 'unit-1',
    name: 'Residence 01 — 3 BHK',
    sheet: 'Unit 1 — 3 BHK',
    band: 'Lower floors',
    base: '/img/plans/unit-1',
    config: '3 BHK',
    type: 'residence',
    bedrooms: 3,
    carpet: { sqm: 109.17, sqft: 1175.11 },
    balcony: { sqm: 4.25, sqft: 45.75 },
    total: { sqm: 113.42, sqft: 1220.85 },
    features: ['puja', 'dress', 'powder', 'utility', 'deck'],
    living: '19’0" × 11’6"',
  },
  {
    key: 'plate',
    name: 'Full Floor Plate',
    sheet: 'Full floor plate',
    base: '/img/plans/plate',
    band: 'All residences, one level',
    config: 'Full floor',
    type: 'reference',
    bedrooms: null,
    carpet: null,
    balcony: null,
    total: null,
    features: [],
  },
  {
    key: 'typical',
    name: 'Typical Floor Plan',
    sheet: 'Typical floor plan',
    base: '/img/plans/typical',
    band: 'Every standard floor',
    config: 'Reference',
    type: 'reference',
    bedrooms: null,
    carpet: null,
    balcony: null,
    total: null,
    features: [],
  },
]

/** Fast lookup for a plan by key — used wherever a plan must be resolved
 *  outside the filtered result list (e.g. compare selections that have since
 *  scrolled out of the active facets). */
export const PLAN_BY_KEY = Object.fromEntries(FLOOR_PLANS.map((p) => [p.key, p]))

/** Carpet-area extent across the plans that state one, rounded outward to a
 *  round number so the slider ends land somewhere legible. */
export const AREA_BOUNDS = (() => {
  const areas = FLOOR_PLANS.filter((p) => p.carpet).map((p) => p.carpet.sqft)
  return {
    min: Math.floor(Math.min(...areas) / 10) * 10,
    max: Math.ceil(Math.max(...areas) / 10) * 10,
    step: 10,
  }
})()

export const SORT_OPTIONS = [
  { value: 'default', label: 'Tower order' },
  { value: 'area-desc', label: 'Carpet area · large to small' },
  { value: 'area-asc', label: 'Carpet area · small to large' },
  { value: 'name', label: 'Name · A to Z' },
]

/** Whole square feet with a thousands separator — the sheets print two
 *  decimals, which is more precision than a list row needs. */
export const sqft = (n) => Math.round(n).toLocaleString('en-US')

/**
 * Apply the search-by-unit facets. `types` and `features` are Sets — empty
 * means "no constraint", the same convention the filter chips read from.
 * Reference plans state no carpet area, so they drop out as soon as the area
 * range is narrowed off its full extent.
 */
export const filterPlans = ({ types, features, area, sortBy }) => {
  const narrowed = area[0] > AREA_BOUNDS.min || area[1] < AREA_BOUNDS.max

  const out = FLOOR_PLANS.filter((p) => {
    if (types.size && !types.has(p.type)) return false
    if (features.size && ![...features].every((f) => p.features.includes(f))) return false
    if (p.carpet) {
      if (p.carpet.sqft < area[0] || p.carpet.sqft > area[1]) return false
    } else if (narrowed) return false
    return true
  })

  switch (sortBy) {
    case 'area-desc':
      return [...out].sort((a, b) => (b.carpet?.sqft ?? -1) - (a.carpet?.sqft ?? -1))
    case 'area-asc':
      return [...out].sort((a, b) => (a.carpet?.sqft ?? Infinity) - (b.carpet?.sqft ?? Infinity))
    case 'name':
      return [...out].sort((a, b) => a.name.localeCompare(b.name))
    default:
      return out
  }
}

/** Every plate on the visual elevation opens the same typical-floor reference
 *  plan — the tower doesn't have unit-specific renders yet, so the click
 *  target is rank-independent for now. */
export const planForPlateRank = () => PLAN_BY_KEY.typical

/**
 * Floor number for a plate, counted straight off the plates that are drawn on
 * the elevation: the lowest plate is floor 1 and it climbs one per plate to the
 * crown. Ranks arrive top-to-bottom (0 = crown), so invert — a tower with N
 * plates reads 1…N from the base up. This is the honest count of what's traced,
 * not a fabricated storey table.
 */
export const floorFromRank = (rank, count) => Math.max(1, count - rank)

/** The two tower elevations that carry floor-plate SVGs, in cycle order. Each is
 *  one still frame from the orbit render + its traced plate SVG (attached in the
 *  explorer, which imports the raw SVGs). `frame` is the orbit web-index the
 *  plates were traced against, so opening from the orbit lines up. */
export const FLOOR_SIDES = [
  { key: 'three-quarter', frame: 40, img: '/orbit/orbit-040.webp', label: 'Three-quarter elevation' },
  { key: 'frontal', frame: 0, img: '/orbit/orbit-000.webp', label: 'Frontal elevation' },
]

export const sideIndexForFrame = (frame) => {
  const i = FLOOR_SIDES.findIndex((s) => s.frame === frame)
  return i === -1 ? 0 : i
}

/**
 * Click zones for the six residences drawn on the typical-floor sheet
 * (typical-1600.jpg, a 1600×1131 page) — traced directly against that exact
 * image (`public/svg/Typical Floor plan.svg`, ids `_1`…`_6`), so these sit
 * pixel-for-pixel on the real walls rather than an approximated box.
 */
export const TYPICAL_PLAN_VIEWBOX = '0 0 1600 1131'
export const TYPICAL_PLAN_ZONES = [
  {
    key: 'unit-1',
    tag: 'polygon',
    points:
      '661 586.65 661 712.39 607.26 712.39 599.43 712.39 599.43 706.65 588.48 706.65 588.48 748.39 607.26 748.39 607.26 892.39 529.52 892.39 529.52 868.91 484.65 868.91 484.65 885.09 507.61 885.09 507.61 893.43 445.52 893.43 445.52 679 473.7 679 473.7 649.78 442.91 649.78 442.91 570.48 635.96 570.48 635.96 585.61 661 586.65',
  },
  {
    key: 'unit-2',
    tag: 'polygon',
    points:
      '446.04 243.87 607.26 243.87 607.26 389.43 590.57 389.43 590.57 431.17 597.87 431.17 597.87 425.43 663.61 425.43 663.61 555.87 635.43 555.87 635.43 569.43 441.35 569.43 441.35 490.65 474.74 490.65 474.74 458.3 445.52 458.3 446.04 243.87',
  },
  {
    key: 'unit-3',
    tag: 'polygon',
    points:
      '690.22 312.22 690.22 417.09 770.04 417.09 770.04 449.43 825.35 449.43 825.35 461.43 850.91 461.43 850.91 504.74 897.87 504.74 897.87 460.91 1004.3 460.91 1004.3 416.57 1053.87 416.57 1053.87 313.26 983.96 313.26 983.96 279.87 858.74 279.87 858.74 312.61 690.22 312.22',
  },
  {
    key: 'unit-4',
    tag: 'path',
    d: 'M1126.91,286h160.83v200.74h4.7v83.74h-222.91v-128.87h56.35v-12.52h21.39v-52.17h-19.83s-2.09-90.91-.52-90.91Z',
  },
  {
    key: 'unit-5',
    tag: 'polygon',
    points:
      '1069.78 696.48 1069.78 569.3 1290.87 569.3 1290.87 652.65 1286.96 652.65 1286.96 853.78 1125.74 853.78 1125.74 763.39 1146.87 763.39 1146.87 710.57 1124.96 710.57 1124.96 696.87 1069.78 696.48',
  },
  {
    key: 'unit-6',
    tag: 'path',
    d: 'M853,627.87v29.22h-39.65v15.13h-55.83v31.3h-40.17v96h133.57v21.91s114.52,1.83,116.35,0,0-24,0-24h68.87v-91.83h-43.3v-48h-105.39v-30.78s-35.74-.26-34.43,1.04Z',
  },
]
