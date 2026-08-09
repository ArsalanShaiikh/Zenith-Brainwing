import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Smoothing of the displayed frame toward the target, per second. Matches the
 * feel of the old per-frame 0.15 lerp at 60 Hz, but as an exponential decay
 * against real elapsed time it holds that feel on a 120 Hz display too — the
 * per-frame version panned twice as fast there, which is half of why the
 * sequence never settled in the same place twice.
 */
const DAMP_LAMBDA = 9.75
/** How fast a re-anchor offset dissolves back into the absolute mapping. */
const BIAS_LAMBDA = 3.2
/** Offset below which the re-anchor is finished. */
const BIAS_EPSILON = 0.05
/** dt cap, so a backgrounded tab doesn't teleport the pan on return. */
const MAX_DT = 0.05
/** Pointer over anything matching this parks the pan instead of driving it. */
const PARK_SELECTOR = 'button, a, [data-no-drag]'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const damp = (from, to, lambda, dt) => from + (to - from) * (1 - Math.exp(-lambda * dt))

/**
 * Bounded-pan pointer physics for a baked frame sequence.
 *
 * Mouse & pen: the sequence follows the cursor's horizontal position, no button
 * held. Two things make that mapping usable, and both are the reason hotspots
 * stopped behaving when this was hand-rolled without them:
 *
 *   Parking — while the pointer is over a marker the pan freezes. Under a live
 *   absolute mapping every pixel of cursor travel re-renders the apartment, so
 *   a marker slides out from under the pointer on the way to a click and the
 *   whole panel keeps shifting while you try to press one.
 *
 *   Re-anchoring — control never resumes by jumping. Whenever the cursor takes
 *   over somewhere new (entering the stage, stepping off a marker, coming back
 *   from a panorama with the pointer parked on the close button) the gap
 *   between the held frame and the cursor's frame is kept as `bias` and
 *   dissolved over about a second. Without it the first pointermove hauls the
 *   sequence across to wherever the cursor happens to be — the panel and every
 *   hotspot on it lurching for no reason the visitor can see.
 *
 * The full sweep plays across the middle `hoverTravel` of the stage so both
 * ends are reachable without pinning the cursor to the edge.
 *
 * Touch: there is no hover to read, so it stays a drag, at `dragSensitivity`
 * px per frame.
 *
 * Listeners are attached natively to `elRef` rather than through React props:
 * markers are children of the stage, so their events bubble here, and a native
 * listener on the stage runs before React's delegated handlers can call
 * stopPropagation. Parking has to be decided from the event target, which is
 * what PARK_SELECTOR does.
 *
 * `target`/`render` are clamped to [0, frameCount - 1] — this is a bounded pan,
 * not a 360 loop, so nothing wraps.
 */
export default function useIsoPan({
  elRef,
  frameCount,
  enabled = true,
  hoverTravel = 0.86,
  dragSensitivity = 5,
}) {
  const maxFrame = Math.max(0, frameCount - 1)

  const [frameIndex, setFrameIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [supportsHover, setSupportsHover] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
      : true,
  )

  const stateRef = useRef({
    target: 0,
    render: 0,
    /** Frame the cursor currently maps to (null = cursor isn't driving). */
    pointerFrame: null,
    /** Offset from the mapping, dissolving after control resumes. */
    bias: 0,
    /** Next hover sample re-anchors instead of jumping. */
    reanchor: true,
    dragging: false,
    dragStartX: 0,
    dragStartFrame: 0,
  })

  // Read by the native handlers, which are attached once and outlive renders.
  const enabledRef = useRef(enabled)
  const supportsHoverRef = useRef(supportsHover)
  useEffect(() => {
    enabledRef.current = enabled
    supportsHoverRef.current = supportsHover
  })

  useEffect(() => {
    const mql = window.matchMedia('(hover: hover) and (pointer: fine)')
    const onChange = (e) => setSupportsHover(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // Going idle drops the cursor's claim on the pan. Otherwise the sample taken
  // before the stage was disabled is still sitting there when it comes back —
  // and the loop would act on it before the pointer has moved again, which is
  // the same unexplained lurch the re-anchor exists to prevent.
  useEffect(() => {
    if (enabled) return
    const s = stateRef.current
    s.pointerFrame = null
    s.reanchor = true
    s.bias = 0
  }, [enabled])

  useEffect(() => {
    const el = elRef.current
    if (!el) return undefined
    const s = stateRef.current

    /** Hand control back, and ease rather than jump when it's taken up again. */
    const park = () => {
      s.pointerFrame = null
      s.reanchor = true
    }

    const hoverDrives = (e) => supportsHoverRef.current && e.pointerType !== 'touch'

    /** Mouse/pen: absolute cursor position → frame. */
    const onHover = (e) => {
      if (e.target?.closest?.(PARK_SELECTOR)) {
        park()
        return
      }
      const rect = el.getBoundingClientRect()
      if (!rect.width) return
      const span = rect.width * hoverTravel
      const t = clamp((e.clientX - rect.left - (rect.width - span) / 2) / span, 0, 1)
      const mapped = t * maxFrame
      if (s.reanchor) {
        s.bias = s.target - mapped
        s.reanchor = false
      }
      s.pointerFrame = mapped
    }

    const onDown = (e) => {
      if (!enabledRef.current || hoverDrives(e)) return
      // Pressing a marker opens the room; it must never start a drag.
      if (e.target?.closest?.(PARK_SELECTOR)) return
      park()
      s.dragging = true
      s.dragStartX = e.clientX
      s.dragStartFrame = s.target
      setIsDragging(true)
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // Capture is best-effort; safe to ignore if unsupported.
      }
    }

    const onMove = (e) => {
      if (!enabledRef.current) return
      if (hoverDrives(e)) {
        onHover(e)
        return
      }
      if (!s.dragging) return
      const steps = Math.trunc((e.clientX - s.dragStartX) / dragSensitivity)
      s.target = clamp(s.dragStartFrame - steps, 0, maxFrame)
    }

    const onUp = () => {
      if (!s.dragging) return
      s.dragging = false
      setIsDragging(false)
    }

    const onLeave = () => {
      park()
      onUp()
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onLeave)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onLeave)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [elRef, maxFrame, hoverTravel, dragSensitivity])

  // One loop for the lifetime of the stage. It only ever calls setState when
  // the whole frame number changes, so an idle pan costs nothing downstream —
  // and there is no "did the loop get restarted?" state to get wrong.
  useEffect(() => {
    let rafId
    let lastT = performance.now()

    const tick = (now) => {
      rafId = requestAnimationFrame(tick)
      const dt = Math.min((now - lastT) / 1000, MAX_DT)
      lastT = now

      const s = stateRef.current
      if (enabledRef.current && !s.dragging && s.pointerFrame !== null) {
        if (s.bias !== 0) {
          s.bias = damp(s.bias, 0, BIAS_LAMBDA, dt)
          if (Math.abs(s.bias) < BIAS_EPSILON) s.bias = 0
        }
        s.target = clamp(s.pointerFrame + s.bias, 0, maxFrame)
      }

      s.render = clamp(damp(s.render, s.target, DAMP_LAMBDA, dt), 0, maxFrame)
      const rounded = Math.round(s.render)
      setFrameIndex((prev) => (prev !== rounded ? rounded : prev))
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [maxFrame])

  /** Programmatic jump (the tagger's frame slider). Hands control back to the
   *  cursor only on its next move, and through a re-anchor. */
  const setFrame = useCallback(
    (next) => {
      const n = clamp(Math.round(next), 0, maxFrame)
      const s = stateRef.current
      s.target = n
      s.render = n
      s.bias = 0
      s.pointerFrame = null
      s.reanchor = true
      setFrameIndex(n)
    },
    [maxFrame],
  )

  return { frameIndex, setFrame, isDragging, supportsHover }
}
