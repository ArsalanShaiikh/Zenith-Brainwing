import { sqft } from './floorplans'

/**
 * Every surface that can be marked builds its record here, so the shape is
 * defined once and the sheet builder never has to know which view a selection
 * came from.
 *
 * A record is deliberately flat and self-contained:
 *   id    stable across a session — it is what the heart toggles on
 *   kind  which section of the sheet it prints under
 *   title / sub / meta  the three lines under the plate, in falling weight
 *   img   a JPEG url. pdf-lib embeds JPEG and PNG only, and every source here
 *         ships a .jpg alongside its .webp, so records always point at the jpg.
 */

/** Sheet sections, in print order. */
export const SECTIONS = [
  {
    kind: 'residence',
    title: 'Residences',
    note: 'The plans you spent time with.',
  },
  {
    kind: 'amenity',
    title: 'Amenities & Spaces',
    note: 'The shared floors of the tower, as you saw them.',
  },
  {
    kind: 'gallery',
    title: 'From the Gallery',
    note: 'Renders of Zenith, in the light you chose.',
  },
]

/** Group a flat selection into the ordered sections, dropping the empty ones. */
export const groupSelection = (saved) =>
  SECTIONS.map((s) => ({ ...s, items: saved.filter((r) => r.kind === s.kind) })).filter(
    (s) => s.items.length > 0,
  )

/**
 * An amenity tile from the Amenities panel. `level` arrives as "L52".
 * The 960px variant, not the 1600: these print two to a row at about 3.4in, so
 * 960 already clears 280dpi and the larger file only weighs the sheet down.
 */
export const amenityRecord = (tile) => ({
  id: `amenity:${tile.id}`,
  kind: 'amenity',
  title: tile.name,
  sub: tile.sub,
  meta: tile.level ? `Level ${tile.level.replace(/^L/, '')}` : '',
  img: `/img/${tile.img}-960.jpg`,
})

/**
 * A point showcase reached from a tower hotspot. Keyed by the point, not by the
 * slide: a point's two media are the same space shot twice, and a sheet that
 * printed both would read as a duplicate. Videos have no still of their own, so
 * every point resolves to the one .jpg it ships.
 */
export const showcaseRecord = (data) => ({
  id: `space:${data.id}`,
  kind: 'amenity',
  title: data.title,
  sub: data.sub ?? '',
  meta: '',
  img: `/showcase/${data.id}/${data.id}.jpg`,
})

/** A floor plan from the explorer. Reference sheets carry no carpet figure. */
export const planRecord = (plan) => ({
  id: `residence:${plan.key}`,
  kind: 'residence',
  title: plan.name,
  sub: plan.sheet,
  meta: plan.carpet
    ? `${plan.config} · ${sqft(plan.carpet.sqft)} sq.ft RERA carpet`
    : plan.config,
  img: `${plan.base}-1600.jpg`,
})

/** A render from the gallery. */
export const galleryRecord = (g) => ({
  id: `gallery:${g.base.split('/').pop()}`,
  kind: 'gallery',
  title: g.title,
  sub: g.group,
  meta: '',
  img: `${g.base}.jpg`,
})
