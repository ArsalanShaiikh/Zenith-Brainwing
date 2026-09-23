/**
 * Minimal dependency-free heatmap renderer for the Admin dashboard.
 *
 * No heatmap library is installed in this project and this is a one-off
 * canvas draw, so pulling one in would be a large dependency for a small
 * job. Instead this hand-rolls the same two-pass technique libraries like
 * heatmap.js use:
 *
 *   1. Draw a soft, low-alpha white blob per point onto an offscreen canvas
 *      with additive ('lighter') compositing, so overlapping clicks build up
 *      brightness — the more clicks near a spot, the brighter it gets.
 *   2. Read that grayscale intensity back and map each pixel through a
 *      blue → green → amber → red gradient onto the visible canvas.
 *
 * Points are `{ x_percent, y_percent }` in [0, 1], so this works at any
 * canvas size — the caller sizes the canvas to match its own preview box.
 */

const GRADIENT_STOPS = [
  { t: 0, c: [0, 0, 0, 0] },
  { t: 0.25, c: [37, 99, 235, 130] }, // blue
  { t: 0.5, c: [16, 185, 129, 175] }, // green
  { t: 0.75, c: [234, 179, 8, 205] }, // amber
  { t: 1, c: [239, 68, 68, 235] }, // red
]

const colorFor = (t) => {
  const clamped = Math.min(1, Math.max(0, t))
  for (let i = 1; i < GRADIENT_STOPS.length; i++) {
    const a = GRADIENT_STOPS[i - 1]
    const b = GRADIENT_STOPS[i]
    if (clamped <= b.t) {
      const localT = (clamped - a.t) / (b.t - a.t || 1)
      return a.c.map((v, idx) => Math.round(v + (b.c[idx] - v) * localT))
    }
  }
  return GRADIENT_STOPS[GRADIENT_STOPS.length - 1].c
}

// A single click should read as a small, cool dot — only a real cluster of
// several overlapping clicks should read hot. Each blob's centre adds
// roughly BASE_ALPHA*255 to the channel via 'lighter' blending, so normalizing
// against a *fixed* ceiling (not the scene's own observed max) is what makes
// that distinction possible — normalizing against the observed max would
// make even one isolated click read as the hottest thing on screen, since
// its own peak *is* the max when nothing overlaps it.
const BASE_ALPHA = 0.16
const HOT_AT_CLICKS = 4 // this many overlapping clicks reads as fully red
const INTENSITY_CEILING = 255 * BASE_ALPHA * HOT_AT_CLICKS

/**
 * Draws `points` (each `{ x_percent, y_percent }`) onto `canvas` as a
 * coloured density heatmap. `radius` is in canvas pixels.
 */
export const drawHeatmap = (canvas, points, { radius = 16 } = {}) => {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  if (!points.length || w <= 0 || h <= 0) return

  const gray = document.createElement('canvas')
  gray.width = w
  gray.height = h
  const gctx = gray.getContext('2d')
  gctx.globalCompositeOperation = 'lighter'

  points.forEach((p) => {
    const px = p.x_percent * w
    const py = p.y_percent * h
    const grad = gctx.createRadialGradient(px, py, 0, px, py, radius)
    grad.addColorStop(0, `rgba(255,255,255,${BASE_ALPHA})`)
    grad.addColorStop(0.6, `rgba(255,255,255,${BASE_ALPHA * 0.35})`)
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    gctx.fillStyle = grad
    gctx.beginPath()
    gctx.arc(px, py, radius, 0, Math.PI * 2)
    gctx.fill()
  })

  const src = gctx.getImageData(0, 0, w, h)
  const out = ctx.createImageData(w, h)

  for (let i = 0; i < src.data.length; i += 4) {
    const intensity = src.data[i] / INTENSITY_CEILING
    if (intensity <= 0.04) continue
    const [r, g, b, a] = colorFor(intensity)
    out.data[i] = r
    out.data[i + 1] = g
    out.data[i + 2] = b
    out.data[i + 3] = a
  }

  ctx.putImageData(out, 0, 0)
}
