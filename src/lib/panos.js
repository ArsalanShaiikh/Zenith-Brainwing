import DAY from '../data_Day'
import EVENING from '../data_Evening'

/**
 * The view panos. Two Marzipano tile sets — one shot in daylight, one at dusk —
 * of the same six elevations, so the panel switches on two axes: how high you
 * are, and what hour it is. Both are derived from the tool's own export rather
 * than re-typed, so re-rendering the panos only means pasting the new
 * `data_*.js` in.
 *
 * Tiles live at `public/panos/<Day|Evening>/tiles/<sceneId>/...`, which is the
 * layout the tool writes; nothing here needs the files renamed.
 */
const ROOT = '/panos'

/** Scene names are `<metres>_day` / `<metres>_eve`. */
const metresOf = (scene) => Number.parseInt(scene.name, 10)

/**
 * Names for the six elevations. Descriptive only — the metre figure is the
 * factual part of the readout, so rename these freely without touching
 * anything else. An unlisted height falls back to its own figure.
 */
const TIERS = {
  65: 'Low rise',
  97: 'Mid rise',
  129: 'Upper rise',
  161: 'High rise',
  165: 'Sky rise',
  171: 'Crown',
}

/**
 * One tile set, keyed by elevation. `levels` and `faceSize` are carried per
 * scene because they are not uniform — the 161 m day pano was shot at a higher
 * resolution than the rest and has a sixth level, which its geometry and zoom
 * limit both need to know about.
 */
const indexByMetres = (data, dir) =>
  new Map(
    data.scenes.map((s) => {
      const base = `${ROOT}/${dir}/tiles/${s.id}`
      return [
        metresOf(s),
        {
          id: s.id,
          tileUrl: `${base}/{z}/{f}/{y}/{x}.jpg`,
          previewUrl: `${base}/preview.jpg`,
          // The front face alone, at the first real tile level (a single
          // 512×512 tile — level 0 is the `preview.jpg` fallback, a 256×256
          // cube-map strip meant only to hold the screen until real tiles
          // arrive, not for standalone display). Anywhere that wants one
          // ordinary-looking photo of a vantage without opening the pano
          // itself — a thumbnail, a compare card — wants this over
          // `previewUrl`.
          frontUrl: `${base}/1/f/0/0.jpg`,
          levels: s.levels,
          faceSize: s.faceSize,
          initialView: s.initialViewParameters,
        },
      ]
    }),
  )

const day = indexByMetres(DAY, 'Day')
const evening = indexByMetres(EVENING, 'Evening')

export const TIMES = [
  { id: 'day', label: 'Day' },
  { id: 'evening', label: 'Evening' },
]

/**
 * Descending by elevation, and only heights that exist in *both* sets — the
 * hour toggle must never be able to land on a missing tile folder.
 *
 * The order is the list order on the panel, and the panel reads like the tower:
 * the crown at the top, the ground end at the bottom. Reading down the list is
 * therefore descending — the same direction as coming down the building.
 */
export const VANTAGES = [...day.keys()]
  .filter((m) => evening.has(m))
  .sort((a, b) => b - a)
  .map((metres) => ({
    id: `v${metres}`,
    metres,
    label: TIERS[metres] ?? `${metres} metres`,
    scenes: { day: day.get(metres), evening: evening.get(metres) },
  }))

/** Opens at the top of the tower: the highest pano is the one worth arriving
 *  on, and it now heads the list. The hour toggle keeps whichever elevation is
 *  selected, so day and evening both open on the crown. */
export const DEFAULT_VANTAGE = 0
