import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { countUp } from '../animations/countUp'
import { VIEWS } from '../lib/views'
import { preloadSrc } from '../lib/images'
import {
  FRAME_COUNT,
  START_INDEX,
  framePath,
  wrapFrame,
} from '../lib/orbit'
import {
  FP_FRAME_COUNT,
  FP_PLATE_FRAMES,
  fpFramePath,
  nearestFpPlate,
  seamFromFp,
  seamFromOrbit,
  wrapFp,
} from '../lib/floorplanOrbit'
import { floorFromRank } from '../lib/floorplans'
import { useVisitor } from '../hooks/useVisitor'
import Logo from './Logo'
import OrbitMenu from './OrbitMenu'
import FloorExplorer from './FloorExplorer'
import floorHighlightSvg from '../assets/floor-highlight.svg?raw'
import floorFrontSvg from '../assets/floor-front.svg?raw'

/** Playback rate for a turn — a swipe plays the frames to the next stop at a
 *  fixed frame rate, so every turn takes exactly the same time. */
const FPS = 24
/** Horizontal travel (px) that commits a swipe to the next stop. */
const SWIPE_PX = 24

/** Frames are a constant 16:9 (1440×810). */
const IMG_AR = 1440 / 810

/**
 * Which rest frames a drag is allowed to land on, per mode. The landing (mode
 * `none`) turns through every stop; the two focused modes snap only across the
 * frames that carry their content, so a drag never stops "in between".
 *   amenities → the three point frames (20 = podium, 60, 80 = pool/dining/kids)
 *   floorplan → the two plate frames (0 frontal, 40 the 3/4 elevation)
 */
const STOPS_BY_MODE = {
  none: [0, 20, 40, 60, 80],
  amenities: [20, 60, 80],
  floorplan: [0, 40],
}

/**
 * Hotspots, each pinned to one rest frame (web index). The anchor is in
 * normalised image space (0–1) so it tracks the tower through cover-crop at
 * any viewport. `side` mirrors the leader/label for anchors on the right.
 * Point tags show only in Amenities mode; SVG overlays only in Floorplan mode.
 */
const HOTSPOTS = [
  // Full-facade SVG overlays (no label): the tower itself is the hoverable
  // target. Each SVG (16:9 viewBox) was traced over its own render.
  { frame: 0, overlay: floorFrontSvg }, // orbit-000 — frontal elevation
  { frame: 20, label: 'Rooftop Podium', nx: 0.555, ny: 0.27, to: 'rooftop' },
  { frame: 40, overlay: floorHighlightSvg }, // orbit-040 — 3/4 elevation
  { frame: 60, label: 'Podium Amenities', nx: 0.63, ny: 0.71, to: 'podium' },
  // Frame 80 (orbit-080, frontal pool) carries several point tags at once.
  { frame: 80, label: 'Swimming Pool', nx: 0.46, ny: 0.82, side: 'left', to: 'pool' },
  { frame: 80, label: 'Dining Area', nx: 0.675, ny: 0.76, side: 'left', to: 'dining' },
  { frame: 80, label: "Kids' Play Area", nx: 0.762, ny: 0.69, side: 'right', to: 'kids' },
]
/** Point-tag callouts (many per frame allowed) vs the single full-frame SVG. */
const LABEL_SPOTS = HOTSPOTS.filter((h) => h.label)
const overlayForFrame = (frame) =>
  HOTSPOTS.find((h) => h.frame === frame && h.overlay) ?? null

/**
 * The same two plate SVGs, keyed by their frame in the *floorplan* turntable.
 * They are traced against poses that set shares pixel-for-pixel with the
 * landing orbit, so the identical artwork lands true on either set.
 */
const FP_OVERLAYS = {
  0: floorFrontSvg, // fp-000 ≡ orbit-000 — frontal elevation
  50: floorHighlightSvg, // fp-050 ≡ orbit-040 — 3/4 elevation
}

/** The two seam frames, warmed ahead of the rest of the floorplan set. */
const SEAM_FIRST = Object.keys(FP_OVERLAYS).map(Number)

/** How long the two frame sets cross-dissolve at a seam. Long enough to carry
 *  the change in acuity between the two renders, short enough that it reads as
 *  the picture resolving rather than as a transition between two screens. */
const SEAM_FADE = 0.22

/** Wrap a running axis value into a real frame number [0, FRAME_COUNT). */
const norm = (v) => ((Math.round(v) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT

/**
 * Next allowed stop from a running axis value in a direction, returned as an
 * absolute axis target (it may exceed [0, FRAME_COUNT) so a tween animates the
 * true delta and wraps naturally past the seam).
 */
const nextAllowedTarget = (pos, dir, stops) => {
  const cur = norm(pos)
  if (dir > 0) {
    for (const s of stops) if (s > cur) return pos + (s - cur)
    return pos + (stops[0] + FRAME_COUNT - cur)
  }
  for (let i = stops.length - 1; i >= 0; i -= 1) if (stops[i] < cur) return pos - (cur - stops[i])
  return pos - (cur - (stops[stops.length - 1] - FRAME_COUNT))
}

/** Nearest allowed stop in either direction (ties resolve forward), absolute. */
const nearestAllowedTarget = (pos, stops) => {
  const cur = norm(pos)
  if (stops.includes(cur)) return pos
  const fwd = nextAllowedTarget(pos, 1, stops)
  const bwd = nextAllowedTarget(pos, -1, stops)
  return fwd - pos <= pos - bwd ? fwd : bwd
}

/** The image's on-screen rect in CSS px — the same cover-crop the canvas paints
 *  with. Everything pinned to the tower maps through this. */
const coverRectFrom = (cv) => {
  if (!cv) return null
  const w = cv.clientWidth
  const h = cv.clientHeight
  if (IMG_AR > w / h) {
    const dw = h * IMG_AR
    return { dx: (w - dw) / 2, dy: 0, dw, dh: h }
  }
  const dh = w / IMG_AR
  return { dx: 0, dy: (h - dh) / 2, dw: w, dh }
}

/**
 * One point-tag callout: a white dot on the tower, an elbow leader (a diagonal
 * up to a corner, then horizontal into a glass label), mirrored for a left-side
 * label. Self-positions through the shared cover-crop and animates on `active`.
 */
const Hotspot = ({ spot, active, canvasRef, onNavigate }) => {
  const rootRef = useRef(null)
  const lineRef = useRef(null)
  const dotRef = useRef(null)
  const labelRef = useRef(null)
  const leftSide = spot.side === 'left'

  const position = useCallback(() => {
    const el = rootRef.current
    const r = coverRectFrom(canvasRef.current)
    if (!el || !r) return
    el.style.left = `${r.dx + spot.nx * r.dw}px`
    el.style.top = `${r.dy + spot.ny * r.dh}px`
  }, [spot, canvasRef])

  useEffect(() => {
    position()
    window.addEventListener('resize', position)
    return () => window.removeEventListener('resize', position)
  }, [position])

  useGSAP(
    () => {
      const el = rootRef.current
      if (!el) return
      const dot = dotRef.current
      const line = lineRef.current
      const label = labelRef.current

      if (!active) {
        gsap.to(el, { autoAlpha: 0, duration: 0.3, ease: 'power2.out' })
        return
      }

      position()

      if (prefersReducedMotion()) {
        gsap.set(el, { autoAlpha: 1 })
        gsap.set([dot, label], { autoAlpha: 1, scale: 1, y: 0 })
        gsap.set(line, { strokeDashoffset: 0 })
        return
      }

      gsap.set(el, { autoAlpha: 1 })
      gsap.set(dot, { scale: 0, transformOrigin: '50% 50%' })
      gsap.set(line, { strokeDashoffset: 1 })
      gsap.set(label, { autoAlpha: 0, y: 8, scale: 0.96 })

      gsap
        .timeline()
        .to(dot, { scale: 1, duration: 0.5, ease: 'back.out(2)' })
        .to(line, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, '-=0.24')
        .to(label, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'zenith' }, '-=0.28')
    },
    { dependencies: [active], scope: rootRef },
  )

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={onNavigate}
      aria-label={`${spot.label} — explore`}
      style={{ left: 0, top: 0 }}
      className="group absolute z-20 origin-top-left scale-[0.7] opacity-0 outline-none min-[430px]:scale-[0.82] md:scale-90 lg:scale-100"
    >
      {/* Elbow leader: diagonal from the anchor up to a corner, then horizontal
          into the label; mirrored for a left-side label. */}
      <svg
        aria-hidden="true"
        width="170"
        height="130"
        viewBox="0 0 170 130"
        fill="none"
        className={`pointer-events-none absolute ${leftSide ? 'right-0' : 'left-0'}`}
        style={{ top: '-118px', filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.45))' }}
      >
        <path
          ref={lineRef}
          d={leftSide ? 'M170 118 L 60 17 H 20' : 'M0 118 L 110 17 H 150'}
          stroke="var(--color-paper)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="1"
        />
      </svg>

      {/* Anchor: a soft white pulse under a solid white dot. */}
      <span
        data-tag-ring
        className="pointer-events-none absolute left-0 top-0 h-4.5 w-4.5 rounded-full bg-paper/50 animate-[tag-pulse_2.6s_ease-out_infinite]"
      />
      <span className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
        <span
          ref={dotRef}
          className="block h-3 w-3 rounded-full bg-paper shadow-[0_1px_5px_rgb(0_0_0/0.55)]"
        />
      </span>

      {/* Label — the menu box's glass (cream tint, blur, white rim). */}
      <span
        ref={labelRef}
        style={leftSide ? { right: '150px', top: '-118px' } : { left: '150px', top: '-118px' }}
        className={[
          'absolute flex items-center gap-2.5 whitespace-nowrap rounded-[6px]',
          'border border-white/55 bg-[rgb(252_250_246/0.72)]',
          '[backdrop-filter:blur(24px)_saturate(1.3)]',
          '[-webkit-backdrop-filter:blur(24px)_saturate(1.3)]',
          'shadow-[0_26px_60px_-24px_rgb(0_0_0/0.5),inset_0_1px_0_0_rgb(255_255_255/0.7)]',
          'px-3 py-1.5 md:gap-3 md:px-4 md:py-2 3xl:px-5 3xl:py-2.5',
          'transition-transform duration-300 ease-zenith group-hover:-translate-y-0.5',
        ].join(' ')}
      >
        <span className="font-normal uppercase tracking-[0.18em] text-ink text-[13px] 3xl:text-[15px]">
          {spot.label}
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 fill-none stroke-ink-3 stroke-[1.6] transition-[transform,color] duration-300 ease-zenith group-hover:translate-x-0.5 group-hover:stroke-brass-ink md:h-4 md:w-4"
        >
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  )
}

/**
 * The landing — a drag-to-rotate turntable of the tower that now hosts the whole
 * navigation. On the opening frame (source 40) the menu sits on the left. Drag
 * and the menu clears; the tower turns; land back on the opening frame and it
 * returns. Two menu picks stay in the orbit as focused *modes*:
 *   • Amenities — reveals the point tags; the drag snaps only across the frames
 *     that carry them; a tag opens that point's showcase.
 *   • Floorplan — reveals the SVG plates; the drag snaps only across the two
 *     plate frames.
 * A Back button (shown in either mode) turns the tower back to the opening frame
 * by the shortest path and restores the menu. The other picks (Views, Location,
 * Enquire) wipe paper and route to their pages.
 */
const Landing = ({ onView, onPoint }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { gateOpen } = useVisitor()
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const loaderRef = useRef(null)
  const coverRef = useRef(null)
  const pointCoverRef = useRef(null)
  const counterRef = useRef(null)
  const ruleRef = useRef(null)
  const chromeRef = useRef(null)
  const backRef = useRef(null)
  const enquireRef = useRef(null)
  const hintRef = useRef(null)
  const overlayRef = useRef(null)
  const floorTagRef = useRef(null)
  const floorTagShownRef = useRef(false)
  // Drives the ambient "light running down the plates" loop and its hover pause.
  const overlayAnim = useRef({
    hovering: false,
    running: false,
    pass: null,
    next: null,
    leaveTimer: 0,
    onEnter: () => {},
    onLeave: () => {},
  })

  const framesRef = useRef([])
  // The floorplan turntable, warmed in the background once the landing orbit is
  // up. `stateRef.pos` is an index into whichever set `setRef` names, and the
  // two only ever change hands on a seam (see lib/floorplanOrbit.js).
  const fpFramesRef = useRef([])
  const setRef = useRef('orbit')
  // Drives the seam hand-over: while `from` is set, the outgoing set's seam
  // frame is painted underneath and the incoming one fades in over it at `t`.
  const fadeRef = useRef({ from: null, t: 0 })
  // Open on the frame of the point we're returning from (if any), else the
  // opening shot — and if we're returning from a point, reopen in Amenities mode
  // so its tags are already showing.
  const stateRef = useRef(null)
  const returnPoint = location.state?.returnPoint ?? null
  if (stateRef.current === null) {
    const from = returnPoint ? HOTSPOTS.find((h) => h.to === returnPoint) : null
    stateRef.current = { pos: from ? from.frame : START_INDEX }
  }
  const dragRef = useRef({ active: false, startX: 0, committed: false })
  const animatingRef = useRef(false)
  const tweenRef = useRef(null)

  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [hinting, setHinting] = useState(true)
  const [exiting, setExiting] = useState(false)
  // The current rest frame (web index) or null while turning.
  const [activeFrame, setActiveFrame] = useState(null)
  // Which turntable is on screen. Mirrors `setRef` for render-time decisions.
  const [frameSet, setFrameSet] = useState('orbit')
  const [overlayHtml, setOverlayHtml] = useState('')
  // Which focused mode the orbit is in. Restored to Amenities when we return
  // from a point's showcase so its tags are already up.
  const [mode, setMode] = useState(returnPoint ? 'amenities' : 'none')
  const modeRef = useRef(mode)
  const setModeSafe = useCallback((m) => {
    modeRef.current = m
    setMode(m)
  }, [])
  // The floorplan explorer: clicking a floor plate on the tower docks the
  // building left and opens that floor's plan. `frame` = which elevation, `rank`
  // = which plate (top-to-bottom) was clicked, so it opens pre-selected.
  // `openId` bumps on each open so the explorer remounts fresh (its initial
  // elevation/floor come from these props via useState initialisers).
  const [floorDetail, setFloorDetail] = useState({ open: false, frame: 40, rank: 0, openId: 0 })
  // Floor-number tag that tracks the hovered plate on the orbit (Floorplan mode),
  // before the explorer opens. Viewport coords (root is fixed inset-0).
  const [floorHover, setFloorHover] = useState(null)

  // MUST be memoised. React 19 diffs `dangerouslySetInnerHTML` by object
  // identity, not by the html string — a fresh `{__html}` literal on every
  // render makes React re-write innerHTML, which destroys and rebuilds all the
  // plate nodes and silently drops the hover listeners bound to them (the tag
  // would then freeze on the first hovered floor and never return).
  const overlayInner = useMemo(() => ({ __html: overlayHtml }), [overlayHtml])

  const showFrame = useCallback((frame) => {
    setActiveFrame(frame)
    if (frame == null) return
    const ov =
      setRef.current === 'fp' ? FP_OVERLAYS[frame] : overlayForFrame(frame)?.overlay
    if (ov) setOverlayHtml(ov)
  }, [])

  // `returnPoint` is a one-shot hand-off from a showcase: it opens this mount in
  // Amenities, but `history.state` survives a reload, so strip it once consumed —
  // otherwise reloading the page would keep re-entering Amenities instead of the
  // menu. Clearing it doesn't reset `mode` (already initialised above).
  const clearedStateRef = useRef(false)
  useEffect(() => {
    if (clearedStateRef.current) return
    clearedStateRef.current = true
    if (returnPoint) navigate('/', { replace: true, state: null })
  }, [returnPoint, navigate])

  const viewCb = useRef(onView)
  const pointCb = useRef(onPoint)
  useEffect(() => {
    viewCb.current = onView
    pointCb.current = onPoint
  }, [onView, onPoint])

  /** The pool and wrap that go with a set name. Both turntables happen to be
   *  100 frames, but they are kept apart so one can be re-cut without the other
   *  silently indexing off the end. */
  const poolOf = useCallback(
    (set) => (set === 'fp' ? fpFramesRef.current : framesRef.current),
    [],
  )
  const wrapIn = useCallback((set, i) => (set === 'fp' ? wrapFp(i) : wrapFrame(i)), [])

  const paintImg = useCallback((ctx, cv, img, alpha) => {
    if (!img || !img.complete || !img.naturalWidth) return false
    const cw = cv.width
    const ch = cv.height
    const ir = img.naturalWidth / img.naturalHeight
    const cr = cw / ch
    let dw, dh, dx, dy
    if (ir > cr) {
      dh = ch
      dw = ch * ir
      dx = (cw - dw) / 2
      dy = 0
    } else {
      dw = cw
      dh = cw / ir
      dx = 0
      dy = (ch - dh) / 2
    }
    ctx.globalAlpha = alpha
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.globalAlpha = 1
    return true
  }, [])

  /**
   * Paint the axis. Normally that is one frame of the active set; across a seam
   * it is the outgoing set's frame with the incoming one dissolving over it.
   * Both frames are the same camera pose, so nothing moves — only the render
   * changes hands.
   */
  const drawCurrent = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const set = setRef.current
    const img = poolOf(set)[wrapIn(set, stateRef.current.pos)]
    const fade = fadeRef.current
    if (fade.from) {
      const out = poolOf(fade.from.set)[fade.from.frame]
      if (paintImg(ctx, cv, out, 1)) paintImg(ctx, cv, img, fade.t)
      else paintImg(ctx, cv, img, 1)
      return
    }
    paintImg(ctx, cv, img, 1)
  }, [poolOf, wrapIn, paintImg])


  // Stretch the SVG overlay across the whole image rect (same-aspect graphic).
  const positionOverlay = useCallback(() => {
    const el = overlayRef.current
    const r = coverRectFrom(canvasRef.current)
    if (!el || !r) return
    el.style.left = `${r.dx}px`
    el.style.top = `${r.dy}px`
    el.style.width = `${r.dw}px`
    el.style.height = `${r.dh}px`
  }, [])

  const resize = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = cv.clientWidth
    const h = cv.clientHeight
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    drawCurrent()
    positionOverlay()
  }, [drawCurrent, positionOverlay])

  // --- Preload the frame pool, counting real progress. ------------------
  useEffect(() => {
    let cancelled = false
    const total = FRAME_COUNT + 1 // + fonts
    let settled = 0
    const bump = () => {
      if (cancelled) return
      settled += 1
      setProgress(Math.round((settled / total) * 100))
      if (settled >= total) setReady(true)
    }

    const imgs = new Array(FRAME_COUNT)
    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const img = new Image()
      img.decoding = 'async'
      img.onload = img.onerror = () => {
        if (i === norm(stateRef.current.pos)) drawCurrent()
        bump()
      }
      img.src = framePath(i)
      imgs[i] = img
    }
    framesRef.current = imgs
    ;(document.fonts?.ready ?? Promise.resolve()).then(bump)

    // Warm the view plates in the background so the routed pages never wait.
    for (const v of VIEWS) {
      const warm = new Image()
      warm.decoding = 'async'
      warm.src = preloadSrc(v.img)
    }

    return () => {
      cancelled = true
    }
  }, [drawCurrent])

  // --- Warm the floorplan turntable behind the landing. ------------------
  // It never counts toward the loader: the landing is usable without it, and a
  // second hundred frames on the progress bar would double the wait for
  // something most visitors reach a minute later. The two seam frames go first
  // — one of them is the very frame the hand-over lands on, so it is the only
  // one that has to be there the moment Floorplan is picked.
  useEffect(() => {
    if (!ready) return undefined
    let cancelled = false
    const imgs = new Array(FP_FRAME_COUNT)
    const order = [
      ...SEAM_FIRST,
      ...Array.from({ length: FP_FRAME_COUNT }, (_, i) => i).filter(
        (i) => !SEAM_FIRST.includes(i),
      ),
    ]
    for (const i of order) {
      if (cancelled) break
      const img = new Image()
      img.decoding = 'async'
      // Repaint if this is the frame already on screen — entering Floorplan the
      // instant the landing settles can hand over to a frame that hasn't
      // decoded yet, and without this the canvas would hold the outgoing render
      // until the next drag.
      img.onload = () => {
        if (cancelled) return
        if (setRef.current === 'fp' && wrapFp(stateRef.current.pos) === i) drawCurrent()
      }
      img.src = fpFramePath(i)
      imgs[i] = img
    }
    fpFramesRef.current = imgs
    return () => {
      cancelled = true
    }
  }, [ready, drawCurrent])

  // --- Size the canvas to the frame, keep it sized. ---------------------
  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  // --- Loader progress: count + rule. -----------------------------------
  useGSAP(
    () => {
      if (counterRef.current) countUp(counterRef.current, progress, { pad: 3 })
      if (ruleRef.current) {
        gsap.to(ruleRef.current, {
          scaleX: progress / 100,
          duration: 0.6,
          ease: 'zenith',
          overwrite: 'auto',
        })
      }
    },
    { dependencies: [progress], scope: rootRef },
  )

  // --- Reveal the orbit once the pool is warm. --------------------------
  useGSAP(
    () => {
      if (!ready) return
      drawCurrent()
      const loader = loaderRef.current
      const canvas = canvasRef.current

      // The entry gate is holding its own sheet of paper over this screen and
      // owns the wipe. Clear our loader without playing it — two paper layers
      // wiping in sequence would read as a stutter — and hold the tower dark
      // until the gate hands over, which re-runs this effect.
      if (gateOpen) {
        gsap.set(loader, { autoAlpha: 0 })
        gsap.set(canvas, { autoAlpha: 0, scale: 1.06, transformOrigin: '50% 50%' })
        return
      }

      if (prefersReducedMotion()) {
        gsap.set(loader, { autoAlpha: 0 })
        gsap.set(canvas, { autoAlpha: 1 })
        showFrame(wrapFrame(stateRef.current.pos))
        return
      }

      gsap.set(canvas, { autoAlpha: 0, scale: 1.06, transformOrigin: '50% 50%' })

      gsap
        .timeline({
          onComplete: () => showFrame(wrapFrame(stateRef.current.pos)),
        })
        .to(canvas, { autoAlpha: 1, scale: 1, duration: 1.3, ease: 'zenith' }, 0)
        .to(
          loader,
          { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' },
          0.1,
        )
        .set(loader, { autoAlpha: 0 })
    },
    { dependencies: [ready, gateOpen], scope: rootRef },
  )

  // --- Play the turn to a rest position at a fixed 24fps. ---------------
  const playTo = useCallback(
    (target, onDone) => {
      if (animatingRef.current) return
      const from = stateRef.current.pos
      // Already there — still run the continuation, or a hand-over queued
      // behind this turn would never fire (picking Floorplan while the tower is
      // already resting on a plate frame is the ordinary way in).
      if (target === from) {
        onDone?.()
        return
      }
      animatingRef.current = true
      setActiveFrame(null)
      // Turning away from a plate — drop the floor tag so it never rides along
      // to the next frame; it only comes back on a fresh plate hover.
      floorTagShownRef.current = false
      setFloorHover(null)
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(stateRef.current, {
        pos: target,
        duration: Math.abs(target - from) / FPS,
        ease: 'none',
        onUpdate: drawCurrent,
        onComplete: () => {
          const set = setRef.current
          stateRef.current.pos = wrapIn(set, target)
          animatingRef.current = false
          showFrame(wrapIn(set, target))
          onDone?.()
        },
      })
    },
    [drawCurrent, showFrame, wrapIn],
  )

  /**
   * Change turntables. Only legal on a seam — the two sets agree on exactly two
   * camera poses, so this is the only place the picture can stay still while
   * the render underneath it changes. The outgoing frame keeps painting until
   * the incoming one has fully faded up, which carries the step in acuity
   * between the two renders without anything appearing to move.
   */
  const crossToSet = useCallback(
    (set, frame, onDone) => {
      const outSet = setRef.current
      const outFrame = wrapIn(outSet, stateRef.current.pos)
      setRef.current = set
      setFrameSet(set)
      stateRef.current.pos = frame
      setActiveFrame(null)

      if (prefersReducedMotion()) {
        fadeRef.current = { from: null, t: 0 }
        drawCurrent()
        showFrame(frame)
        onDone?.()
        return
      }

      fadeRef.current = { from: { set: outSet, frame: outFrame }, t: 0 }
      gsap.to(fadeRef.current, {
        t: 1,
        duration: SEAM_FADE,
        ease: 'none',
        onUpdate: drawCurrent,
        onComplete: () => {
          fadeRef.current = { from: null, t: 0 }
          drawCurrent()
          showFrame(frame)
          onDone?.()
        },
      })
    },
    [drawCurrent, showFrame, wrapIn],
  )

  /**
   * Advance one allowed stop in a direction (+1 forward, -1 back).
   *
   * The stops belong to whichever turntable is on screen. On the floorplan set
   * they are its two plate frames, so a swipe revolves the tower half a turn
   * and lands on the other elevation — and the next swipe carries on the same
   * way round to the first again. Always one gesture, one turn, always resting
   * where the floors are clickable, exactly as the landing behaves.
   */
  const advance = useCallback(
    (dir) => {
      const stops =
        setRef.current === 'fp'
          ? FP_PLATE_FRAMES
          : STOPS_BY_MODE[modeRef.current] || STOPS_BY_MODE.none
      playTo(nextAllowedTarget(stateRef.current.pos, dir, stops))
    },
    [playTo],
  )

  // --- Pointer swipe: commit to the next stop, don't scrub. -------------
  const onPointerDown = useCallback((e) => {
    const d = dragRef.current
    d.active = true
    d.startX = e.clientX
    d.committed = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setHinting(false)
  }, [])

  const onPointerMove = useCallback(
    (e) => {
      const d = dragRef.current
      if (!d.active || d.committed) return
      const dx = e.clientX - d.startX
      if (Math.abs(dx) < SWIPE_PX) return
      d.committed = true // one turn per gesture
      advance(dx > 0 ? 1 : -1)
    },
    [advance],
  )

  const onPointerUp = useCallback((e) => {
    const d = dragRef.current
    if (!d.active) return
    d.active = false
    d.committed = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }, [])

  // --- Keyboard: step between rest positions. ---------------------------
  useEffect(() => {
    if (!ready || exiting || gateOpen) return undefined
    const onKey = (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      e.preventDefault()
      setHinting(false)
      advance(e.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, exiting, gateOpen, advance])

  // --- Menu / mode logic. -----------------------------------------------
  // The menu shows only on the opening frame with no mode engaged. The corner
  // chrome sits behind it (logo top-left, hero title bottom-left) on every
  // rested orbit frame so the landing stays branded. The Back button shows only
  // inside a mode.
  const menuVisible = ready && !exiting && mode === 'none' && activeFrame === START_INDEX
  // Corner branding (Runwal logo, hero title, drag hint) stays up on every
  // rested orbit frame — including the menu frame — so it reads as a landing
  // and not a bare menu screen. Hidden only while turning or inside a mode.
  const chromeVisible = ready && !exiting && mode === 'none' && activeFrame != null
  const backVisible = ready && !exiting && mode !== 'none' && !floorDetail.open
  // A standing Enquire CTA — up on the orbit and the menu frame, tucked away
  // inside the focused Amenities / Floorplan modes.
  const ctaVisible = ready && !exiting && mode === 'none'

  const onMenuSelect = useCallback(
    (id) => {
      if (id === 'amenities') {
        setModeSafe('amenities') // frame 20 already carries the podium tag
      } else if (id === 'floorplan') {
        // Turn the *landing* orbit to whichever plate frame is nearer, then hand
        // over to the stabilised turntable on that seam. The tower is already
        // sitting on the shared pose when the sets change, so the swap has
        // nothing to move — only the render resolves.
        setModeSafe('floorplan')
        const target = nearestAllowedTarget(stateRef.current.pos, STOPS_BY_MODE.floorplan)
        playTo(target, () => {
          const seam = seamFromOrbit(wrapFrame(target))
          if (seam) crossToSet('fp', seam.fp)
        })
      } else {
        // Views / Location / Enquire — wipe paper and route to the page.
        const cover = coverRef.current
        if (!cover || prefersReducedMotion()) {
          viewCb.current?.(id)
          return
        }
        setExiting(true)
        gsap.set(cover, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1 })
        gsap.to(cover, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.6,
          ease: 'expo.inOut',
          onComplete: () => viewCb.current?.(id),
        })
      }
    },
    [playTo, crossToSet, setModeSafe],
  )

  /**
   * Leave a mode and come home to the opening frame.
   *
   * From the floorplan turntable that is three moves, not one: revolve to the
   * nearest seam, hand back to the landing orbit there, and only then carry on
   * turning to the opening shot. Going straight home would mean swapping sets
   * on a pose the two don't share, and the tower would jump. Because the seam
   * is a real frame of both sets, the whole thing reads as one continuous turn
   * — the visitor never learns there were two turntables.
   */
  const exitMode = useCallback(() => {
    setModeSafe('none')
    const home = () => playTo(nearestAllowedTarget(stateRef.current.pos, [START_INDEX]))

    if (setRef.current !== 'fp') {
      home()
      return
    }
    const plate = nearestFpPlate(stateRef.current.pos)
    playTo(plate, () => {
      const seam = seamFromFp(wrapFp(plate))
      if (!seam) {
        home()
        return
      }
      crossToSet('orbit', seam.orbit, home)
    })
  }, [playTo, crossToSet, setModeSafe])

  // Floorplan mode: a click on a floor plate ranks it among the elevation's
  // plates (top-to-bottom) and opens the explorer docked, on that floor.
  const onFloorPlateClick = useCallback((e) => {
    if (modeRef.current !== 'floorplan') return
    const root = overlayRef.current
    const plate = e.target.closest?.('.cls-1')
    if (!root || !plate) return
    const plates = Array.from(root.querySelectorAll('.cls-1'))
      .map((p) => ({ p, y: p.getBBox().y }))
      .sort((a, b) => a.y - b.y)
      .map((o) => o.p)
    const rank = plates.indexOf(plate)
    if (rank < 0) return
    floorTagShownRef.current = false
    setFloorHover(null)
    // The explorer keys its elevation off the *landing orbit's* frame numbers
    // (FLOOR_SIDES in floorplans.js), so a plate clicked on the floorplan
    // turntable is handed over as its seam twin rather than its own index.
    const here = wrapIn(setRef.current, stateRef.current.pos)
    const frame = setRef.current === 'fp' ? (seamFromFp(here)?.orbit ?? 40) : here
    setFloorDetail((d) => ({ open: true, frame, rank, openId: d.openId + 1 }))
  }, [wrapIn])

  const closeFloorDetail = useCallback(() => {
    setFloorDetail((d) => ({ ...d, open: false }))
  }, [])

  // --- Corner chrome + Back button visibility. --------------------------
  useGSAP(
    () => {
      if (chromeRef.current) {
        gsap.to(chromeRef.current, {
          autoAlpha: chromeVisible ? 1 : 0,
          duration: 0.45,
          ease: 'power2.out',
        })
      }
      if (backRef.current) {
        gsap.to(backRef.current, {
          autoAlpha: backVisible ? 1 : 0,
          duration: 0.4,
          ease: 'power2.out',
          pointerEvents: backVisible ? 'auto' : 'none',
        })
      }
      if (enquireRef.current) {
        gsap.to(enquireRef.current, {
          autoAlpha: ctaVisible ? 1 : 0,
          duration: 0.45,
          ease: 'power2.out',
          pointerEvents: ctaVisible ? 'auto' : 'none',
        })
      }
    },
    { dependencies: [chromeVisible, backVisible, ctaVisible], scope: rootRef },
  )

  // --- SVG overlay (Floorplan mode): wipe it up, then run a single light down
  //     the plates as a "hoverable" cue. ----------------------------------
  // The plates only come up once the floorplan turntable has the screen and the
  // tower is rested on one of the two poses traced against. Deliberately not on
  // the landing orbit's twin of that pose, even though the artwork would fit:
  // they would wipe on for the approach, then wipe again when the sets change
  // hands. Waiting for the seam means one entrance, after the dissolve settles.
  const hasOverlay =
    mode === 'floorplan' &&
    frameSet === 'fp' &&
    activeFrame != null &&
    FP_OVERLAYS[activeFrame] != null

  useGSAP(
    () => {
      const el = overlayRef.current
      if (!el) return
      const st = overlayAnim.current
      const plates = gsap.utils.toArray(el.querySelectorAll('.cls-1'))

      // Tear down any prior loop + hover wiring on every (re)run.
      st.pass?.kill()
      st.next?.kill()
      clearTimeout(st.leaveTimer)
      st.pass = st.next = null
      st.running = false
      st.hovering = false
      st.onEnter = st.onLeave = () => {}

      if (!hasOverlay) {
        gsap.to(el, { autoAlpha: 0, duration: 0.35, ease: 'power2.out' })
        gsap.set(plates, { clearProps: 'fillOpacity,fill' })
        return
      }

      positionOverlay()

      if (prefersReducedMotion()) {
        gsap.set(el, { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)' })
        return
      }

      gsap.set(el, { autoAlpha: 1, clipPath: 'inset(0% 0% 100% 0%)' })
      gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power2.out' })

      const ordered = plates
        .map((p) => ({ p, y: p.getBBox().y }))
        .sort((a, b) => a.y - b.y)
        .map((o) => o.p)

      const GAP = 1.15 // beat between passes

      function buildPass() {
        return gsap
          .timeline({
            onComplete: () => {
              st.running = false
              scheduleNext()
            },
          })
          .to(ordered, {
            keyframes: [
              { fill: '#fff4c8', fillOpacity: 1, duration: 0.12, ease: 'power2.out' },
              { fill: '#d9c158', fillOpacity: 0.3, duration: 0.2, ease: 'power2.in' },
            ],
            stagger: { each: 0.085, from: 'start' },
          })
      }
      function runPass() {
        st.running = true
        st.pass = buildPass()
      }
      function scheduleNext() {
        st.next = null
        if (st.hovering) return
        st.next = gsap.delayedCall(GAP, runPass)
      }

      st.onEnter = () => {
        clearTimeout(st.leaveTimer)
        st.hovering = true
        st.next?.kill()
        st.next = null
      }
      st.onLeave = () => {
        clearTimeout(st.leaveTimer)
        st.leaveTimer = setTimeout(() => {
          st.hovering = false
          if (!st.running && !st.next) scheduleNext()
        }, 140)
      }

      st.next = gsap.delayedCall(0.5, runPass)
    },
    { dependencies: [hasOverlay, activeFrame], scope: rootRef },
  )

  // Show the floor tag ONLY while the cursor is directly over a plate. Bind
  // mouseenter/mouseleave straight to each plate (not the container): the gaps
  // between plates and the sky are pointer-events-none, so container-level
  // mouseover/out can miss the plate↔gap boundary and leave the tag stuck. A
  // per-plate `mouseleave` is unambiguous — off the plate, the tag is gone.
  useEffect(() => {
    const root = overlayRef.current
    if (!root || mode !== 'floorplan' || !hasOverlay) return undefined
    const plates = Array.from(root.querySelectorAll('.cls-1'))
      .map((p) => ({ p, y: p.getBoundingClientRect().top }))
      .sort((a, b) => a.y - b.y)
      .map((o) => o.p)
    if (!plates.length) return undefined

    const onLeave = () => {
      floorTagShownRef.current = false
      setFloorHover(null)
    }
    const wired = plates.map((plate, i) => {
      const onEnter = () => {
        const r = plate.getBoundingClientRect()
        setFloorHover({
          floor: floorFromRank(i, plates.length),
          top: r.top + r.height / 2,
          left: r.right,
        })
      }
      plate.addEventListener('mouseenter', onEnter)
      plate.addEventListener('mouseleave', onLeave)
      return { plate, onEnter }
    })
    return () => {
      wired.forEach(({ plate, onEnter }) => {
        plate.removeEventListener('mouseenter', onEnter)
        plate.removeEventListener('mouseleave', onLeave)
      })
    }
  }, [hasOverlay, activeFrame, mode])

  // Floor tag: ease it in on first hover, then glide it between floors as the
  // cursor moves plate to plate. A plain effect (not useGSAP) so re-runs don't
  // revert the context and snap the tag back to the corner between glides.
  useEffect(() => {
    const el = floorTagRef.current
    const active = floorHover && mode === 'floorplan' && !floorDetail.open
    if (!el || !active) return
    const { top, left } = floorHover
    if (prefersReducedMotion()) {
      gsap.set(el, { top, left, yPercent: -50, autoAlpha: 1, scale: 1 })
      floorTagShownRef.current = true
      return
    }
    if (!floorTagShownRef.current) {
      floorTagShownRef.current = true
      gsap.set(el, { top, left, yPercent: -50, autoAlpha: 0, scale: 0.8 })
      gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.34, ease: 'back.out(1.7)' })
    } else {
      gsap.to(el, { top, left, autoAlpha: 1, duration: 0.32, ease: 'power3.out', overwrite: 'auto' })
    }
  }, [floorHover, mode, floorDetail.open])

  // Fade the orbit to black, then route to a point's showcase. The showcase
  // fades its media up from the same black, so the two meet without a cut.
  const leaveToPoint = (id) => {
    const cover = pointCoverRef.current
    if (!cover || prefersReducedMotion()) {
      pointCb.current?.(id)
      return
    }
    gsap.set(cover, { autoAlpha: 0 })
    gsap.to(cover, {
      autoAlpha: 1,
      duration: 0.45,
      ease: 'power2.inOut',
      onComplete: () => pointCb.current?.(id),
    })
  }

  return (
    <div ref={rootRef} data-gate className="fixed inset-0 z-100 select-none bg-void">
      {/* The turntable. */}
      <canvas
        ref={canvasRef}
        onPointerDown={ready && !exiting && !floorDetail.open ? onPointerDown : undefined}
        onPointerMove={ready && !exiting && !floorDetail.open ? onPointerMove : undefined}
        onPointerUp={ready && !exiting && !floorDetail.open ? onPointerUp : undefined}
        onPointerCancel={ready && !exiting && !floorDetail.open ? onPointerUp : undefined}
        className="absolute inset-0 h-full w-full touch-none cursor-grab opacity-0 active:cursor-grabbing"
        aria-label="Runwal Zenith, 360-degree tower view. Drag to rotate."
        role="img"
      />

      {/* Floor-plate overlay — shown only in Floorplan mode on a plate frame.
          The container is click-through; only the painted plates are hoverable
          (see `.floor-overlay` in index.css). */}
      <div
        ref={overlayRef}
        aria-hidden={hasOverlay ? undefined : 'true'}
        onClick={onFloorPlateClick}
        onMouseEnter={() => overlayAnim.current.onEnter()}
        onMouseLeave={() => {
          overlayAnim.current.onLeave()
          floorTagShownRef.current = false
          setFloorHover(null)
        }}
        style={{ left: 0, top: 0, width: 0, height: 0 }}
        className="floor-overlay pointer-events-none absolute z-8 opacity-0 outline-none"
        dangerouslySetInnerHTML={overlayInner}
      />

      {/* Legibility scrims — the renders run bright, so top and bottom get a
          soft wash for the chrome to sit on. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(11_10_8/0.45)_0%,transparent_22%,transparent_58%,rgb(11_10_8/0.72)_100%)]"
      />

      {/* The menu — on the left, over the opening frame only. */}
      <OrbitMenu show={menuVisible} onSelect={onMenuSelect} />

      {/* Corner chrome — logo, title, drag hint. Shown on the non-opening
          frames (mode `none`), where the menu isn't.
          Each piece is placed on the frame itself rather than sharing one
          padded column: the mark wants to sit tighter into its corner than the
          hero title does off the bottom edge, and a single padding could only
          give them the same inset. */}
      <div ref={chromeRef} className="pointer-events-none absolute inset-0 z-10 opacity-0">
        {/* The mark, tucked into the corner where a masthead sits — roughly
            half the frame padding, so it reads as placed rather than floated. */}
        <Logo
          width={180}
          className={[
            'pointer-events-auto absolute w-24 drop-shadow-[0_2px_18px_rgb(0_0_0/0.55)]',
            'left-2.5 top-2.5 sm:left-3 sm:top-3 sm:w-28',
            'md:left-4.5 md:top-4.5 md:w-32 lg:left-5.5 lg:top-5.5',
            '3xl:left-7.5 3xl:top-7.5 3xl:w-40',
          ].join(' ')}
        />

        <div
          ref={hintRef}
          aria-hidden="true"
          className={[
            'pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2',
            'items-center gap-3 rounded-full px-4 py-2',
            'glass-surface text-ink shadow-[0_14px_40px_-18px_rgb(0_0_0/0.7)]',
            'transition-opacity duration-500',
            hinting ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-[drift_2.4s_ease-in-out_infinite] fill-none stroke-current stroke-[1.6]">
            <path d="M9 6 3 12l6 6M15 6l6 6-6 6" />
          </svg>
          <span className="text-[10px] uppercase tracking-[0.16em] md:text-[11px]">
            Drag to rotate
          </span>
        </div>

        <div
          className={[
            'absolute bottom-4 left-4 sm:bottom-5 sm:left-5 md:bottom-8 md:left-8',
            'lg:bottom-10 lg:left-10 3xl:bottom-14 3xl:left-14',
            '[text-shadow:0_2px_22px_rgb(0_0_0/0.6)]',
          ].join(' ')}
        >
          <p className="t-label flex items-center gap-2 text-paper/75 before:h-px before:w-3.5 before:bg-brass before:content-['']">
            Runwal &middot; Balkum, Thane (W)
          </p>
          <h1 className="mt-1 font-fine text-[clamp(34px,7vw,72px)] leading-[0.95] tracking-[-0.02em] text-paper">
            Zenith
          </h1>
          <p className="mt-1 text-[11px] font-light text-paper/70 md:text-[12px]">
            A 52-storey landmark, seen from every side
          </p>
        </div>
      </div>

      {/* Back — leave a mode, turning the tower back to the opening frame. */}
      <button
        ref={backRef}
        type="button"
        onClick={exitMode}
        aria-label="Back to menu"
        style={{ pointerEvents: 'none' }}
        className={[
          'absolute left-2 top-2 z-40 grid h-9 w-9 place-items-center rounded-full opacity-0',
          'glass-surface shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)]',
          'transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100',
          'touch:h-11 touch:w-11',
          'sm:left-2.5 sm:top-2.5 md:left-5 md:top-5 md:h-10 md:w-10',
          'lg:left-3 lg:top-3 3xl:left-4 3xl:top-4 3xl:h-11 3xl:w-11',
        ].join(' ')}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.5]">
          <path d="M15 5 8 12l7 7" />
        </svg>
      </button>

      {/* Standing Enquire CTA — bottom-right, over the orbit and menu frame. */}
      <button
        ref={enquireRef}
        type="button"
        onClick={() => onMenuSelect('enquire')}
        style={{ pointerEvents: 'none' }}
        className={[
          'absolute right-4 top-4 z-40 inline-flex items-center gap-2.5 rounded-full px-5 py-3 opacity-0',
          'glass-surface text-[10px] uppercase tracking-[0.16em] text-ink',
          'shadow-[0_18px_50px_-20px_rgb(0_0_0/0.75)] transition-colors duration-200',
          'hover:bg-ink hover:text-paper hover:backdrop-brightness-100',
          'sm:right-5 sm:top-5 md:right-8 md:top-8 md:px-6 md:text-[11px]',
          'lg:right-10 lg:top-10 3xl:right-14 3xl:top-14',
        ].join(' ')}
      >
        <span>Enquire</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.5]">
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      </button>

      {/* Point-tag callouts — active only in Amenities mode, on their frame. */}
      {LABEL_SPOTS.map((spot, i) => (
        <Hotspot
          key={`${spot.frame}-${i}`}
          spot={spot}
          active={ready && !exiting && mode === 'amenities' && activeFrame === spot.frame}
          canvasRef={canvasRef}
          onNavigate={() => (spot.to ? leaveToPoint(spot.to) : undefined)}
        />
      ))}

      {/* Floor-number tag — pure text (no plate), tracking the hovered floor on
          the orbit. Position + motion are driven by GSAP (see above). */}
      {floorHover && mode === 'floorplan' && !floorDetail.open && (
        <div
          ref={floorTagRef}
          className="pointer-events-none fixed left-0 top-0 z-30 pl-3 opacity-0 md:pl-4"
        >
          <span className="flex flex-col leading-none text-brass-lift [text-shadow:0_2px_20px_rgb(0_0_0/0.6),0_0_18px_rgb(217_193_88/0.35)]">
            <span className="text-[9px] font-normal uppercase tracking-[0.3em] min-[430px]:text-[10px] md:text-[11px]">
              Floor
            </span>
            <span className="t-fig text-[40px] leading-[0.9] min-[430px]:text-[48px] md:text-[56px] lg:text-[64px] 3xl:text-[76px]">
              {floorHover.floor}
            </span>
          </span>
        </div>
      )}

      {/* Floorplan explorer — the split view. Opens on a floor-plate click in
          Floorplan mode; docks the building left with a plan on the right. */}
      <FloorExplorer
        key={floorDetail.openId}
        open={floorDetail.open}
        initialFrame={floorDetail.frame}
        initialRank={floorDetail.rank}
        onClose={closeFloorDetail}
        onEnquire={() => onView?.('enquire')}
      />

      {/* Loader — paper over the whole surface, wiped off on ready. */}
      <div
        ref={loaderRef}
        className="absolute inset-0 z-40 grid place-content-center place-items-center gap-6 bg-paper px-6 text-ink md:gap-7"
        style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      >
        <div className="flex flex-col items-center gap-4 text-center md:gap-5">
          <Logo reveal delay={0.2} width={200} className="w-33 sm:w-37.5 md:w-42 3xl:w-50" />
          <div className="flex flex-col items-center gap-1">
            <span className="font-fine text-[clamp(38px,min(8vw,11vh),88px)] leading-none tracking-[-0.02em]">
              Zenith
            </span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.2em] text-ink-3 md:text-[10px]">
              Balkum &middot; Thane (W)
            </span>
          </div>
        </div>

        {/* The readout belongs to whichever paper the visitor is actually
            looking at. While the gate is up it owns the screen and carries its
            own hairline, so ours stays out of the way — if the pool is still
            cold when the gate hands over, this reappears and finishes the job. */}
        <p
          ref={counterRef}
          className={[
            't-fig absolute bottom-6 right-6 text-[11px] tracking-[0.12em] text-ink-3',
            'transition-opacity duration-300 md:bottom-9 md:right-10 md:text-[12px]',
            gateOpen ? 'opacity-0' : 'opacity-100',
          ].join(' ')}
        >
          000
        </p>
        <span
          ref={ruleRef}
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-brass ${
            gateOpen ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <span className="sr" role="status" aria-live="polite">
          {ready ? 'Ready. Drag the tower to rotate, or use the menu.' : `Loading ${progress} percent`}
        </span>
      </div>

      {/* Exit cover — paper wiped on for a seamless hand to a routed page. */}
      <div
        ref={coverRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-50 bg-paper opacity-0"
      />

      {/* Point cover — black fade-out into a showcase. */}
      <div
        ref={pointCoverRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-50 bg-void opacity-0"
      />
    </div>
  )
}

export default Landing
