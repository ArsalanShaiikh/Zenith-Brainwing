export const VIEWS = [
  { id: 'views', label: 'Views', num: '01', img: 'home' },
  { id: 'amenities', label: 'Amenities', num: '02', img: 'amenities' },
  { id: 'location', label: 'Location', num: '03', img: 'location' },
  { id: 'floorplan', label: 'Floorplan', num: '04', img: 'residences' },
  { id: 'enquire', label: 'Enquire', num: '05', img: 'enquire' },
]

/**
 * The orbit menu's items. Superset of VIEWS with the Gallery, which is its own
 * full-screen route (not a Shell panel), so it lives here rather than in VIEWS —
 * keeping Shell's index-aligned component list untouched. Renumbered so the menu
 * reads 01–06 in display order.
 */
export const MENU_ITEMS = [
  { id: 'views', label: 'Views', num: '01' },
  { id: 'amenities', label: 'Amenities', num: '02' },
  { id: 'location', label: 'Location', num: '03' },
  { id: 'floorplan', label: 'Floorplan', num: '04' },
  { id: 'gallery', label: 'Gallery', num: '05' },
  { id: 'enquire', label: 'Enquire', num: '06' },
]
