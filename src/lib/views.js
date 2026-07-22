export const VIEWS = [
  { id: 'home', label: 'Home', num: '01', img: 'home' },
  { id: 'residences', label: 'Residences', num: '02', img: 'residences' },
  { id: 'amenities', label: 'Amenities', num: '03', img: 'amenities' },
  { id: 'location', label: 'Location', num: '04', img: 'location' },
  { id: 'aerial', label: 'Aerial Tour', num: '05', img: 'aerial' },
  { id: 'enquire', label: 'Enquire', num: '06', img: 'enquire' },
]

/** Views reachable from the nav bar; home and enquire have their own slots. */
export const NAV_VIEWS = ['residences', 'amenities', 'location', 'aerial']
