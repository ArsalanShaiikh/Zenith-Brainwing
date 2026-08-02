/**
 * The floorplan turntable — the second frame set.
 *
 * The landing orbit's camera rises and falls as it goes round, which is right
 * for a hero but wrong for reading floors: the tower drifts up and down the
 * frame while you turn it. This set is the same building rendered on a
 * stabilised path — the camera holds its height and simply revolves, so the
 * tower turns flat and the traced floor plates stay where they are.
 *
 * The two sets are otherwise different renders and share exactly two camera
 * poses. Those two are the ones the floor-plate SVGs were traced against, and
 * they were verified as pixel-aligned against the landing orbit (best fit is
 * scale 1.00, dx 0, dy 0 — no correction needed, so an SVG traced on one lands
 * true on the other). They are the seams: the only frames where the app can
 * change sets without the picture moving.
 *
 * What they do *not* share is detail. The landing orbit was rendered at
 * 3840×2160 and supersampled down; this set came in at 1916×1080, so it
 * carries roughly half the acuity at the same display size. The hand-over is
 * therefore a short cross-dissolve rather than a cut — the pose doesn't move,
 * only the sharpness resolves.
 */

export const FP_FRAME_COUNT = 100

export const fpFramePath = (i) =>
  `/floorplan-orbit/fp-${String(i).padStart(3, '0')}.webp`

/**
 * The hand-over points, as (landing orbit web frame ↔ floorplan web frame).
 * `side` is the elevation each one shows, matching FLOOR_SIDES in floorplans.js.
 */
export const SEAMS = [
  { orbit: 0, fp: 0, side: 'frontal' },
  { orbit: 40, fp: 50, side: 'three-quarter' },
]

export const FP_PLATE_FRAMES = SEAMS.map((s) => s.fp)

export const seamFromOrbit = (frame) => SEAMS.find((s) => s.orbit === frame) ?? null
export const seamFromFp = (frame) => SEAMS.find((s) => s.fp === frame) ?? null

/** Wrap a (possibly negative or large) index into a real floorplan frame. */
export const wrapFp = (i) =>
  ((Math.round(i) % FP_FRAME_COUNT) + FP_FRAME_COUNT) % FP_FRAME_COUNT

/**
 * The nearest plate frame to a continuous axis value, returned as an absolute
 * target so a tween animates the true (possibly seam-crossing) delta rather
 * than unwinding the long way round.
 */
export const nearestFpPlate = (pos) => {
  let best = null
  for (const fp of FP_PLATE_FRAMES) {
    // Consider the plate one turn either side, so a position at frame 98 walks
    // forward to 100 (= 0) instead of backwards through the whole turntable.
    for (const candidate of [fp - FP_FRAME_COUNT, fp, fp + FP_FRAME_COUNT]) {
      const delta = candidate - pos
      if (best === null || Math.abs(delta) < Math.abs(best - pos)) best = candidate
    }
  }
  return best
}
