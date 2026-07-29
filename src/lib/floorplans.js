/**
 * Bundled floorplan set (images in `public/img/plans/`) and the mapping that
 * ties each floor-plate SVG on a tower elevation to a plan. Ported from the
 * `newfloor` branch — self-contained, no CMS.
 *
 * A plate's *rank* (0 = topmost floor band, going down) is bucketed across this
 * ordered list, so the crown maps to the penthouse duplex and the base to the
 * typical floor — top-to-bottom, just like the tower reads. Each plan carries
 * descriptive attributes only (config, floor band, elevation), never fabricated
 * RERA figures.
 */
export const FLOOR_PLANS = [
  { key: 'jodi-2', name: 'Duplex Jodi — Penthouse', band: 'Crown floors', base: '/img/plans/jodi-2', config: 'Jodi Duplex' },
  { key: 'jodi-1', name: 'Jodi — Combined 3 BHK', band: 'Upper floors', base: '/img/plans/jodi-1', config: 'Jodi' },
  { key: 'unit-6', name: 'Residence 06 — 3 BHK', band: 'High floors', base: '/img/plans/unit-6', config: '3 BHK' },
  { key: 'unit-5', name: 'Residence 05 — 3 BHK', band: 'High floors', base: '/img/plans/unit-5', config: '3 BHK' },
  { key: 'unit-4', name: 'Residence 04 — 3 BHK', band: 'Upper-mid floors', base: '/img/plans/unit-4', config: '3 BHK' },
  { key: 'unit-3', name: 'Residence 03 — 3 BHK', band: 'Mid floors', base: '/img/plans/unit-3', config: '3 BHK' },
  { key: 'unit-2', name: 'Residence 02 — 3 BHK', band: 'Lower-mid floors', base: '/img/plans/unit-2', config: '3 BHK' },
  { key: 'unit-1', name: 'Residence 01 — 3 BHK', band: 'Lower floors', base: '/img/plans/unit-1', config: '3 BHK' },
  { key: 'plate', name: 'Full Floor Plate', base: '/img/plans/plate', band: 'All residences, one level', config: 'Full floor' },
  { key: 'typical', name: 'Typical Floor Plan', base: '/img/plans/typical', band: 'Every standard floor', config: 'Reference' },
]

/** Bucket a plate's rank (0 = topmost) among `count` plates into one plan. */
export const planForPlateRank = (rank, count) => {
  const bucket = Math.min(
    FLOOR_PLANS.length - 1,
    Math.floor((rank / Math.max(count, 1)) * FLOOR_PLANS.length),
  )
  return FLOOR_PLANS[bucket]
}

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
