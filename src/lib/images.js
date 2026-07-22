/**
 * Source widths available per slug. These are the TRUE pixel widths of the
 * generated files — the renders top out at 1600px (1920 for home), so
 * advertising a 2560w that is really 1600 would make the browser pick an
 * undersized file on a 4K screen. Regenerate from higher-res masters and
 * extend these lists when final artwork lands.
 */
const WIDTHS = {
  home: [960, 1440, 1920],
  default: [960, 1440, 1600],
}

export const widthsFor = (slug) => WIDTHS[slug] ?? WIDTHS.default

export const srcSet = (slug, ext) =>
  widthsFor(slug)
    .map((w) => `/img/${slug}-${w}.${ext} ${w}w`)
    .join(', ')

export const fallbackSrc = (slug) => {
  const ws = widthsFor(slug)
  return `/img/${slug}-${ws[Math.min(1, ws.length - 1)]}.jpg`
}

/** Largest variant — what the preloader warms so transitions never wait. */
export const preloadSrc = (slug) => {
  const ws = widthsFor(slug)
  return `/img/${slug}-${ws[ws.length - 1]}.webp`
}
