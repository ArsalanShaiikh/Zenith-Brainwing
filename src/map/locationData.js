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
    label: 'Access & Connectivity',
    pois: [
      { id: 'metro', place: 'Balkum Naka Metro Station', dist: '0.6 km', time: '2 min', lng: 72.98863910022668, lat: 19.22069125928903 },
      { id: 'kolshet', place: 'Kolshet Road', dist: '1.1 km', time: '3 min', lng: 72.9862269, lat: 19.2312494 },
      { id: 'ghodbunder', place: 'Ghodbunder Road', dist: '2.0 km', time: '3 min', lng: 72.9777398, lat: 19.2138060 },
      { id: 'majiwada', place: 'Majiwada Junction', dist: '2.3 km', time: '3 min', lng: 72.9784852, lat: 19.2130251 },
      { id: 'eastern-express', place: 'Eastern Express Highway', dist: '2.0 km', time: '6 min', lng: 72.9746972, lat: 19.2102507 },
      { id: 'kapurbawadi', place: 'Kapurbawadi Junction', dist: '3.0 km', time: '4 min', lng: 72.9780453, lat: 19.2203492 },
      { id: 'station', place: 'Thane Railway Station', dist: '6.0 km', time: '8 min', lng: 72.9710278, lat: 19.1846144 },
      { id: 'airoli', place: 'Airoli Bridge', dist: '13.1 km', time: '12 min', lng: 72.9794025, lat: 19.1509383 },
      { id: 'bkc', place: 'BKC', dist: '26.6 km', time: '22 min', lng: 72.8613260, lat: 19.0592671 },
    ],
  },
  {
    id: 'parks',
    label: 'Parks & Greenery',
    pois: [
      { id: 'namo-park', place: 'NaMo Grand Central Park', dist: '1.5 km', time: '3 min', lng: 72.9898355, lat: 19.2283658 },
      { id: 'upvan', place: 'Upvan Lake', dist: '4.9 km', time: '5 min', lng: 72.9559909, lat: 19.2214484 },
      { id: 'thane-creek', place: 'Thane Creek Promenade', dist: '6.2 km', time: '8 min', lng: 72.9843368, lat: 19.1792418 },
    ],
  },
  {
    id: 'schools',
    label: 'Schools & Education',
    pois: [
      { id: 'goenka-school', place: 'CP Goenka International School', dist: '1.6 km', time: '2 min', lng: 72.97932181335179, lat: 19.21709491176578 },
      { id: 'lodha-world-school', place: 'Lodha World School', dist: '2.2 km', time: '4 min', lng: 72.9851359, lat: 19.2140066 },
      { id: 'orchid-school', place: 'Orchid International School', dist: '3.2 km', time: '6 min', lng: 72.9830751260466, lat: 19.241920587117857 },
      { id: 'singhania-school', place: 'Smt. Sulochanadevi Singhania School', dist: '4.0 km', time: '5 min', lng: 72.9662331, lat: 19.2073475 },
      { id: 'vasant-vihar-school', place: 'Vasant Vihar High School', dist: '4.2 km', time: '5 min', lng: 72.9658652, lat: 19.2229033 },
      { id: 'lok-puram-school', place: 'Lok Puram Public School', dist: '4.4 km', time: '6 min', lng: 72.96868270464957, lat: 19.225967590087222 },
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    pois: [
      { id: 'jupiter', place: 'Jupiter Hospital', dist: '3.1 km', time: '6 min', lng: 72.9725219, lat: 19.2094740 },
      { id: 'bansal-arogya', place: "Dr. Bansal's Arogya Hospital", dist: '2.8 km', time: '3 min', lng: 72.9770842, lat: 19.2111354 },
      { id: 'horizon-prime', place: 'Horizon Prime Hospital', dist: '5.2 km', time: '6 min', lng: 72.9757217, lat: 19.2481804 },
      { id: 'bethany', place: 'Bethany Hospital', dist: '4.3 km', time: '5 min', lng: 72.9619365, lat: 19.2199339 },
      { id: 'currae', place: 'Currae Specialty Hospital', dist: '6.2 km', time: '7 min', lng: 72.9717230, lat: 19.2558300 },
    ],
  },
  {
    id: 'leisure',
    label: 'Leisure, Malls & Entertainment',
    pois: [
      { id: 'high-street-mall', place: 'High Street Mall', dist: '1.6 km', time: '2 min', lng: 72.9808332, lat: 19.2171636 },
      { id: 'rmall', place: 'R Mall', dist: '2.1 km', time: '5 min', lng: 72.9773143, lat: 19.2298846 },
      { id: 'viviana', place: 'Viviana Mall', dist: '3.8 km', time: '4 min', lng: 72.9716069, lat: 19.2087735 },
      { id: 'korum-mall', place: 'Korum Mall', dist: '4.1 km', time: '5 min', lng: 72.9650957, lat: 19.2030177 },
      { id: 'lakeshore-mall', place: 'Lake Shore Mall', dist: '4.3 km', time: '6 min', lng: 72.9715504, lat: 19.2091795 },
      { id: 'the-walk', place: 'The Walk, Hiranandani Estate', dist: '6.7 km', time: '8 min', lng: 72.9844225, lat: 19.2555409 },
    ],
  },
  {
    id: 'business',
    label: 'Business & Commercial Hubs',
    pois: [
      { id: 'thane-one', place: 'Thane One IT Park', dist: '2.7 km', time: '4 min', lng: 72.9761121, lat: 19.2215569 },
      { id: 'konar-business-park', place: 'Konar Business Park', dist: '5.7 km', time: '7 min', lng: 72.95379430455462, lat: 19.2014479342195 },
      { id: 'ashar-it-park', place: 'Ashar IT Park', dist: '6.0 km', time: '8 min', lng: 72.9538984, lat: 19.1985105 },
    ],
  },
]

export const POIS = GROUPS.flatMap((g) =>
  g.pois.map((p) => ({ ...p, category: g.id })),
)

export const findPoi = (id) => POIS.find((p) => p.id === id) ?? null
