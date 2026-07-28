/**
 * Location data for the map. All wiring is by `id`, never by array index.
 *
 * Coordinates are geocoded from OpenStreetMap (Nominatim); the km / min figures
 * are real driving distances from the site, measured via OSRM. The site sits in
 * Balkum, Thane (W) — the Runwal Zenith plot itself isn't in OSM, so this is the
 * Balkum locality centre and is within a few hundred metres of the tower.
 */

export const SITE = {
  id: 'zenith',
  name: 'Runwal Zenith',
  lng: 72.9879,
  lat: 19.2206,
}

export const SITE_CAMERA = {
  center: [SITE.lng, SITE.lat],
  zoom: 12.9,
  pitch: 45,
  bearing: -14,
}

export const GROUPS = [
  {
    id: 'connect',
    label: 'Connectivity',
    pois: [
      { id: 'station', place: 'Thane Station', dist: '6.6 km', time: '6 min', lng: 72.9710278, lat: 19.1846144 },
      { id: 'airoli', place: 'Airoli Bridge', dist: '13.1 km', time: '12 min', lng: 72.9794025, lat: 19.1509383 },
      { id: 'bkc', place: 'BKC', dist: '26.6 km', time: '22 min', lng: 72.8613260, lat: 19.0592671 },
    ],
  },
  {
    id: 'everyday',
    label: 'Everyday',
    pois: [
      { id: 'jupiter', place: 'Jupiter Hospital', dist: '3.4 km', time: '5 min', lng: 72.9725219, lat: 19.2094740 },
      { id: 'viviana', place: 'Viviana Mall', dist: '3.8 km', time: '4 min', lng: 72.9716069, lat: 19.2087735 },
      { id: 'upvan', place: 'Upvan Lake', dist: '4.9 km', time: '5 min', lng: 72.9559909, lat: 19.2214484 },
    ],
  },
]

export const POIS = GROUPS.flatMap((g) =>
  g.pois.map((p) => ({ ...p, category: g.id })),
)

export const findPoi = (id) => POIS.find((p) => p.id === id) ?? null
