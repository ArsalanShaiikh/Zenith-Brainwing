/**
 * Per-point showcase media. Each point has an ordered list of items (videos and
 * images) that pan across the screen in a seamless loop. Order matters — the
 * first item is what shows on arrival.
 */
export const SHOWCASE = {
  rooftop: {
    id: 'rooftop',
    title: 'Rooftop Podium',
    media: [
      { type: 'video', src: '/showcase/rooftop/rooftop.mp4', poster: '/showcase/rooftop/rooftop.jpg' },
      { type: 'image', webp: '/showcase/rooftop/rooftop.webp', jpg: '/showcase/rooftop/rooftop.jpg' },
    ],
  },
  // Single-media point: shown static (no pan/loop) — see Showcase.jsx.
  podium: {
    id: 'podium',
    title: 'Podium Amenities',
    media: [{ type: 'image', webp: '/showcase/podium/podium.webp', jpg: '/showcase/podium/podium.jpg' }],
  },
  kids: {
    id: 'kids',
    title: "Kids' Play Area",
    media: [
      { type: 'video', src: '/showcase/kids/kids.mp4', poster: '/showcase/kids/kids.jpg' },
      { type: 'image', webp: '/showcase/kids/kids.webp', jpg: '/showcase/kids/kids.jpg' },
    ],
  },
  dining: {
    id: 'dining',
    title: 'Outdoor Dining',
    media: [
      { type: 'video', src: '/showcase/dining/dining.mp4', poster: '/showcase/dining/dining.jpg' },
      { type: 'image', webp: '/showcase/dining/dining.webp', jpg: '/showcase/dining/dining.jpg' },
    ],
  },
  pool: {
    id: 'pool',
    title: 'Swimming Pool',
    media: [
      { type: 'video', src: '/showcase/pool/pool.mp4', poster: '/showcase/pool/pool.jpg' },
      { type: 'image', webp: '/showcase/pool/pool.webp', jpg: '/showcase/pool/pool.jpg' },
    ],
  },
}

export const showcaseFor = (id) => SHOWCASE[id] ?? null
