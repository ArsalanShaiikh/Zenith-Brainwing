/**
 * Per-point showcase media. Each point has an ordered list of items (videos and
 * images) that pan across the screen in a seamless loop. Order matters — the
 * first item is what shows on arrival.
 *
 * `sub` is the space's location on the tower. It doesn't render in the showcase
 * itself (the title carries that screen); it is the second line the space gets
 * when a visitor marks it for their take-away sheet — see lib/saveables.js.
 */
export const SHOWCASE = {
  rooftop: {
    id: 'rooftop',
    title: 'Rooftop Podium',
    sub: 'Sky deck · Level 52',
    media: [
      { type: 'video', src: '/showcase/rooftop/rooftop.mp4', poster: '/showcase/rooftop/rooftop.jpg' },
      { type: 'image', webp: '/showcase/rooftop/rooftop.webp', jpg: '/showcase/rooftop/rooftop.jpg' },
      { type: 'image', webp: '/showcase/rooftop/rooftop1.webp', jpg: '/showcase/rooftop/rooftop1.jpg' },
      { type: 'image', webp: '/showcase/rooftop/rooftop2.webp', jpg: '/showcase/rooftop/rooftop2.jpg' },
    ],
  },
  // Single-media point: shown static (no pan/loop) — see Showcase.jsx.
  podium: {
    id: 'podium',
    title: 'Podium Amenities',
    sub: 'The amenity deck · Level 05',
    media: [{ type: 'image', webp: '/showcase/podium/podium.webp', jpg: '/showcase/podium/podium.jpg' }],
  },
  kids: {
    id: 'kids',
    title: "Kids' Play Area",
    sub: 'Podium garden · Level 05',
    media: [
      { type: 'video', src: '/showcase/kids/kids.mp4', poster: '/showcase/kids/kids.jpg' },
      { type: 'image', webp: '/showcase/kids/kids.webp', jpg: '/showcase/kids/kids.jpg' },
    ],
  },
  dining: {
    id: 'dining',
    title: 'Outdoor Dining',
    sub: 'Podium garden · Level 05',
    media: [
      { type: 'video', src: '/showcase/dining/dining.mp4', poster: '/showcase/dining/dining.jpg' },
      { type: 'image', webp: '/showcase/dining/dining.webp', jpg: '/showcase/dining/dining.jpg' },
    ],
  },
  pool: {
    id: 'pool',
    title: 'Swimming Pool',
    sub: 'Podium edge · Level 05',
    media: [
      { type: 'video', src: '/showcase/pool/pool.mp4', poster: '/showcase/pool/pool.jpg' },
      { type: 'image', webp: '/showcase/pool/pool.webp', jpg: '/showcase/pool/pool.jpg' },
    ],
  },
}

export const showcaseFor = (id) => SHOWCASE[id] ?? null
