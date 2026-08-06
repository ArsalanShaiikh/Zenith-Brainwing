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
 * How far the picture actually travels between each frame and the next,
 * normalised so 1.0 is the average. Measured off the rendered frames.
 *
 * The camera in this render does not turn at a constant rate: it swings
 * quickly past the two plate elevations and all but stops midway between them,
 * around frames 24 and 75. Across the sequence the fastest frame moves about
 * ten times as far as the slowest. Played back at a fixed frame rate that reads
 * as the tower revolving, coasting to a halt in the middle of the turn, then
 * setting off again — which is not a turntable, it's a stutter.
 *
 * So playback is driven along this table rather than along the frame index (see
 * fpArc / fpFrameAt): the tween covers equal *travel* per unit time, spending
 * longer on the frames that move a lot and skimming the ones that barely
 * change. The result is a constant-speed revolve that comes to rest only where
 * it is meant to.
 *
 * Regenerate alongside the frames — if the render is re-exported with a
 * different camera curve, this table has to be re-measured with it.
 */
export const FP_STEP = [
  1.141, 1.390, 1.543, 1.630, 1.693, 1.748, 1.763, 1.693, 1.652, 1.628,
  1.660, 1.621, 1.546, 1.438, 1.312, 1.145, 1.022, 0.899, 0.824, 0.720,
  0.624, 0.537, 0.438, 0.326, 0.319, 0.410, 0.584, 0.706, 0.811, 0.916,
  1.024, 1.115, 1.152, 1.217, 1.276, 1.379, 1.439, 1.482, 1.517, 1.507,
  1.423, 1.339, 1.278, 1.261, 1.198, 1.097, 0.991, 0.871, 0.736, 0.689,
  0.711, 0.815, 0.877, 0.927, 0.963, 1.007, 1.007, 1.018, 0.998, 1.000,
  0.970, 0.936, 0.895, 0.843, 0.784, 0.694, 0.635, 0.579, 0.541, 0.465,
  0.381, 0.302, 0.231, 0.180, 0.180, 0.180, 0.180, 0.262, 0.363, 0.465,
  0.580, 0.672, 0.801, 0.935, 1.099, 1.228, 1.351, 1.465, 1.513, 1.426,
  1.326, 1.244, 1.251, 1.240, 1.262, 1.265, 1.237, 1.133, 0.988, 0.995,
]

/** Running total of FP_STEP, so index → travel is a lookup rather than a sum. */
const FP_CUM = FP_STEP.reduce((acc, s) => (acc.push(acc[acc.length - 1] + s), acc), [0])
const FP_ARC_TOTAL = FP_CUM[FP_FRAME_COUNT]

/** Frame axis → distance travelled. Whole turns carry a whole lap of travel. */
export const fpArc = (pos) => {
  const turns = Math.floor(pos / FP_FRAME_COUNT)
  const f = pos - turns * FP_FRAME_COUNT
  const i = Math.min(FP_FRAME_COUNT - 1, Math.floor(f))
  return turns * FP_ARC_TOTAL + FP_CUM[i] + (f - i) * FP_STEP[i]
}

/** Distance travelled → frame axis. The inverse of fpArc. */
export const fpFrameAt = (arc) => {
  const turns = Math.floor(arc / FP_ARC_TOTAL)
  const a = arc - turns * FP_ARC_TOTAL
  let lo = 0
  let hi = FP_FRAME_COUNT
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (FP_CUM[mid] <= a) lo = mid
    else hi = mid
  }
  return turns * FP_FRAME_COUNT + lo + (a - FP_CUM[lo]) / FP_STEP[lo]
}

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
