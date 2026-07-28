/**
 * Drag-orbit configuration.
 *
 * The tower was rendered as a 200-frame 360° turntable. We ship every second
 * frame (100 web frames, source frame = 2 × index) — 3.6° apart, which scrubs
 * smoothly while halving the payload. See scripts/gen-orbit.sh.
 *
 * The axis is a continuous float in *frame units*. Frame on screen is
 * round(pos) wrapped into [0, FRAME_COUNT). Rest positions ("stops") fall every
 * STOP_STEP frames — i.e. the source frames 0 / 40 / 80 / 120 / 160 the brief
 * calls out. The experience opens on START_INDEX (source frame 40) and each
 * drag settles to the next multiple of STOP_STEP in the drag direction.
 */
export const FRAME_COUNT = 100
export const STOP_STEP = 20 // 20 web frames = 40 source frames = 72°
export const START_INDEX = 20 // source frame 40

export const framePath = (i) =>
  `/orbit/orbit-${String(i).padStart(3, '0')}.webp`

/** Wrap a (possibly negative or large) index into a real frame number. */
export const wrapFrame = (i) =>
  ((Math.round(i) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT

/** Nearest rest position to a continuous axis value. */
export const nearestStop = (pos) => Math.round(pos / STOP_STEP) * STOP_STEP
