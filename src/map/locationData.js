/**
 * Location data for the map. All wiring is by `id`, never by array index.
 *
 * Coordinates are geocoded from OpenStreetMap (Nominatim); the km / min figures
 * are real driving distances from the site, measured via OSRM. SITE is the
 * actual Runwal Zenith plot in Balkum, Thane (W).
 */

export const SITE = {
  id: 'zenith',
  name: 'Runwal Zenith',
  lng: 72.98867357951626,
  lat: 19.223534714182655,
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
      { id: 'metro', place: 'Balkum Naka Metro Station', dist: '0.6 km', time: '2 min', lng: 72.98863910022668, lat: 19.22069125928903 },
      { id: 'ghodbunder', place: 'Ghodbunder Road', dist: '2.0 km', time: '3 min', lng: 72.9777398, lat: 19.2138060 },
      { id: 'eastern-express', place: 'Eastern Express Highway', dist: '2.0 km', time: '6 min', lng: 72.9746972, lat: 19.2102507 },
      { id: 'station', place: 'Thane Railway Station', dist: '6.0 km', time: '8 min', lng: 72.9710278, lat: 19.1846144 },
      { id: 'airoli', place: 'Airoli Bridge', dist: '13.1 km', time: '12 min', lng: 72.9794025, lat: 19.1509383 },
      { id: 'bkc', place: 'BKC', dist: '26.6 km', time: '22 min', lng: 72.8613260, lat: 19.0592671 },
    ],
  },
  {
    id: 'everyday',
    label: 'Everyday',
    pois: [
      { id: 'jupiter', place: 'Jupiter Hospital', dist: '3.1 km', time: '6 min', lng: 72.9725219, lat: 19.2094740 },
      { id: 'rmall', place: 'R Mall', dist: '2.1 km', time: '5 min', lng: 72.9773143, lat: 19.2298846 },
      { id: 'viviana', place: 'Viviana Mall', dist: '3.8 km', time: '4 min', lng: 72.9716069, lat: 19.2087735 },
      { id: 'upvan', place: 'Upvan Lake', dist: '4.9 km', time: '5 min', lng: 72.9559909, lat: 19.2214484 },
    ],
  },
]

export const POIS = GROUPS.flatMap((g) =>
  g.pois.map((p) => ({ ...p, category: g.id })),
)

export const findPoi = (id) => POIS.find((p) => p.id === id) ?? null
