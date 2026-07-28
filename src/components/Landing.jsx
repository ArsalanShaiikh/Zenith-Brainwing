import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { countUp } from '../animations/countUp'
import { VIEWS } from '../lib/views'
import { preloadSrc } from '../lib/images'
import {
  FRAME_COUNT,
  STOP_STEP,
  START_INDEX,
  framePath,
  wrapFrame,
  nearestStop,
} from '../lib/orbit'
import Logo from './Logo'
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
 * Hotspots, each pinned to one rest frame (web index). The anchor is in
 * normalised image space (0–1) so it tracks the tower through cover-crop at
 * any viewport — nudge nx/ny to re-aim. `side` is which way the leader/label
 * extend from the dot ('right' default, 'left' mirrors it — use 'left' when
 * the anchor sits on the right so the label doesn't run off-screen). Only the
 * hotspot for the current stop is shown. Destination TBD → menu placeholder.
 */
const HOTSPOTS = [
  // Full-facade SVG overlays (no label): the tower itself is the hoverable /
  // clickable target. Each SVG (16:9 viewBox) was traced over its own render,
  // so laid across the whole cover-crop rect the plates cover the facade.
  { frame: 0, overlay: floorFrontSvg }, // orbit-000 — frontal elevation
  { frame: 20, label: 'Rooftop Podium', nx: 0.555, ny: 0.27 },
  { frame: 40, overlay: floorHighlightSvg }, // orbit-040 — 3/4 elevation
  { frame: 60, label: 'Podium Amenities', nx: 0.63, ny: 0.71 },
  // Frame 80 (orbit-080, frontal pool) carries several point tags at once.
  // Swimming + Dining point left, Kids points right, so the labels never
  // collide even though the anchors sit close on the deck.
  { frame: 80, label: 'Swimming Pool', nx: 0.46, ny: 0.82, side: 'left' },
  { frame: 80, label: 'Dining Area', nx: 0.675, ny: 0.76, side: 'left' },
  { frame: 80, label: "Kids' Play Area", nx: 0.762, ny: 0.69, side: 'right' },
]
/** Point-tag callouts (many per frame allowed) vs the single full-frame SVG. */
const LABEL_SPOTS = HOTSPOTS.filter((h) => h.label)
const overlayForFrame = (frame) =>
  HOTSPOTS.find((h) => h.frame === frame && h.overlay) ?? null

/** The tower-click quick-preview — a static teaser, ahead of the full,
 *  CMS-driven Floorplan view (which lets you pick a specific unit). The
 *  building overlay's plates are individually clickable, one per floor (see
 *  `.floor-overlay .cls-1` in index.css) — this table buckets a plate's
 *  position, top to bottom, into the plan that floor band would show. */
const FLOOR_TYPE_PLANS = [
  { name: 'Duplex Jodi — Penthouse', subtitle: 'Top floors, combined units', base: '/img/plans/jodi-2' },
  { name: 'Jodi — 3 BHK combined', subtitle: 'Upper floors', base: '/img/plans/jodi-1' },
  { name: 'Unit 4 — 3 BHK', subtitle: 'High floors', base: '/img/plans/unit-4' },
  { name: 'Unit 3 — 3 BHK', subtitle: 'Upper-mid floors', base: '/img/plans/unit-3' },
  { name: 'Unit 2 — 3 BHK', subtitle: 'Mid floors', base: '/img/plans/unit-2' },
  { name: 'Unit 1 — 3 BHK', subtitle: 'Lower-mid floors', base: '/img/plans/unit-1' },
  { name: 'Typical Floor Plan', subtitle: 'Every standard floor', base: '/img/plans/typical' },
]
/** Bucket a plate's rank (0 = topmost floor) among `count` plates into one of
 *  the plans above. */
const planForPlateRank = (rank, count) => {
  const bucket = Math.min(
    FLOOR_TYPE_PLANS.length - 1,
    Math.floor((rank / Math.max(count, 1)) * FLOOR_TYPE_PLANS.length),
  )
  return FLOOR_TYPE_PLANS[bucket]
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
 * Many can live on one frame.
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
      // Scaled about the dot (origin-top-left = the anchor) so the whole callout
      // shrinks proportionally on small screens instead of overflowing.
      className="group absolute z-20 origin-top-left scale-[0.7] opacity-0 outline-none min-[430px]:scale-[0.82] md:scale-90 lg:scale-100"
    >
      {/* Elbow leader: diagonal from the anchor up to a corner, then horizontal
          into the label. Drawn first so the dot paints over the join; mirrored
          for a left-side label. Starts at the dot so it reveals outward. */}
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
 * The landing gate — a drag-to-rotate turntable of the tower.
 *
 * Frames are pre-decoded into an off-DOM Image pool and painted to a single
 * canvas, so a turn swaps frames with zero layout and no flash. A swipe doesn't
 * scrub with the finger — it commits to the next rest position and plays the
 * frames there at a fixed 24fps, so every turn is identically paced. A press on
 * "Enter" wipes paper over the orbit and hands the surface to the menu.
 */
const Landing = ({ onEnter, onEnterView }) => {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const loaderRef = useRef(null)
  const coverRef = useRef(null)
  const counterRef = useRef(null)
  const ruleRef = useRef(null)
  const chromeRef = useRef(null)
  const hintRef = useRef(null)
  const overlayRef = useRef(null)
  const floorplanScrimRef = useRef(null)
  const floorplanCardRef = useRef(null)
  // Drives the ambient "light running down the plates" loop and its hover
  // pause. Handlers are (re)assigned when the overlay shows; noops otherwise.
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
  const stateRef = useRef({ pos: START_INDEX })
  const dragRef = useRef({ active: false, startX: 0, committed: false })
  const animatingRef = useRef(false)
  const tweenRef = useRef(null)

  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [hinting, setHinting] = useState(true)
  const [exiting, setExiting] = useState(false)
  // The current rest frame (web index) or null while turning. Drives which
  // hotspots + overlay are shown. `overlayHtml` persists the last SVG so it
  // stays put through its fade-out.
  const [activeFrame, setActiveFrame] = useState(null)
  const [overlayHtml, setOverlayHtml] = useState('')

  const showFrame = useCallback((frame) => {
    setActiveFrame(frame)
    const ov = frame == null ? null : overlayForFrame(frame)
    if (ov) setOverlayHtml(ov.overlay)
  }, [])

  const enterCb = useRef(onEnter)
  useEffect(() => {
    enterCb.current = onEnter
  }, [onEnter])

  const enterViewCb = useRef(onEnterView)
  useEffect(() => {
    enterViewCb.current = onEnterView
  }, [onEnterView])

  // Floorplan quick-preview — clicking a floor plate on the building overlay
  // opens a small square glimpse of that floor's plan rather than jumping
  // straight to the menu.
  const [floorplanOpen, setFloorplanOpen] = useState(false)
  const [previewPlan, setPreviewPlan] = useState(null)

  const openPreview = useCallback((plan) => {
    setPreviewPlan(plan)
    setFloorplanOpen(true)
  }, [])

  // A click anywhere on the building overlay resolves to the specific plate
  // under the cursor, ranks it top-to-bottom among that overlay's plates, and
  // opens the plan that floor band maps to — so different floors (up/down)
  // show different images, not just different tower sides.
  const onOverlayClick = useCallback(
    (e) => {
      const root = overlayRef.current
      const plate = e.target.closest?.('.cls-1')
      if (!root || !plate) return
      const plates = Array.from(root.querySelectorAll('.cls-1'))
      const ordered = plates
        .map((p) => ({ p, y: p.getBBox().y }))
        .sort((a, b) => a.y - b.y)
      const rank = ordered.findIndex((o) => o.p === plate)
      if (rank === -1) return
      openPreview(planForPlateRank(rank, ordered.length))
    },
    [openPreview],
  )


  const drawFrame = useCallback((axis) => {
    const cv = canvasRef.current
    const img = framesRef.current[wrapFrame(axis)]
    if (!cv || !img || !img.complete || !img.naturalWidth) return
    const ctx = cv.getContext('2d')
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
    ctx.drawImage(img, dx, dy, dw, dh)
  }, [])

   
  const drawCurrent = useCallback(() => drawFrame(stateRef.current.pos), [drawFrame])

  // The image's on-screen rect in CSS px — the same cover-crop the canvas
  // paints with. Everything pinned to the tower (hotspot, SVG overlay) maps
  // through this, so it tracks the frame at any viewport.
  // Stretch the SVG overlay across the whole image rect (it's a full-frame,
  // same-aspect graphic, so it lands 1:1 on the render). Hotspots self-position.
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
        if (i === START_INDEX) drawCurrent()
        bump()
      }
      img.src = framePath(i)
      imgs[i] = img
    }
    framesRef.current = imgs
    ;(document.fonts?.ready ?? Promise.resolve()).then(bump)

    // Warm the view plates in the background so the menu and first transition
    // never wait on them. Not counted toward progress — the orbit is the gate.
    for (const v of VIEWS) {
      const warm = new Image()
      warm.decoding = 'async'
      warm.src = preloadSrc(v.img)
    }

    return () => {
      cancelled = true
    }
  }, [drawCurrent])

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
  // The opening frame stays perfectly still — an auto-rotate to hint the drag
  // read as glitchy, and the "Drag to rotate" pill says it plainly enough.
  useGSAP(
    () => {
      if (!ready) return
      drawCurrent()
      const loader = loaderRef.current
      const canvas = canvasRef.current
      const chrome = chromeRef.current

      if (prefersReducedMotion()) {
        gsap.set(loader, { autoAlpha: 0 })
        gsap.set([canvas, chrome], { autoAlpha: 1 })
        showFrame(wrapFrame(stateRef.current.pos))
        return
      }

      gsap.set(canvas, { autoAlpha: 0, scale: 1.06, transformOrigin: '50% 50%' })
      gsap.set(chrome, { autoAlpha: 0 })

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
        .to(chrome, { autoAlpha: 1, duration: 0.9, ease: 'zenith' }, '-=0.7')
    },
    { dependencies: [ready], scope: rootRef },
  )

  // --- Play the turn to a rest position at a fixed 24fps. ---------------
  // Linear time + integer frames = the on-screen frame changes 24× a second
  // no matter the display refresh, so every turn is paced identically.

  const playTo = useCallback(
    (target) => {
      if (animatingRef.current) return
      const from = stateRef.current.pos
      if (target === from) return
      animatingRef.current = true
      setActiveFrame(null)
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(stateRef.current, {
        pos: target,
        duration: Math.abs(target - from) / FPS,
        ease: 'none',
        onUpdate: drawCurrent,
        onComplete: () => {
          // Renormalise so the running total never drifts unbounded.
          stateRef.current.pos = ((target % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT
          animatingRef.current = false
          // Show whichever hotspots / overlay live on the frame we landed on.
          showFrame(wrapFrame(target))
        },
      })
    },
    [drawCurrent, showFrame],
  )

  // Advance one rest position in a direction (+1 forward, -1 back).
  const advanceStop = useCallback(
    (dir) => playTo(nearestStop(stateRef.current.pos) + dir * STOP_STEP),
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
      advanceStop(dx > 0 ? 1 : -1)
    },
    [advanceStop],
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
    if (!ready || exiting) return undefined
    const onKey = (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      e.preventDefault()
      setHinting(false)
      advanceStop(e.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, exiting, advanceStop])

  // --- Keyboard: dismiss the floorplan preview with Escape. --------------
  useEffect(() => {
    if (!floorplanOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setFloorplanOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [floorplanOpen])

  // --- Exit to the menu: wipe paper on, then hand over. -----------------
  useGSAP(
    () => {
      if (!exiting) return
      const cover = coverRef.current
      if (!cover || prefersReducedMotion()) {
        enterCb.current?.()
        return
      }
      gsap.set(cover, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1 })
      gsap.to(cover, {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 0.6,
        ease: 'expo.inOut',
        onComplete: () => enterCb.current?.(),
      })
    },
    { dependencies: [exiting], scope: rootRef },
  )

  // --- SVG overlay for spots that carry one: wipe it up, then run a single
  //     light down the plates as a "hoverable" cue. -----------------------
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

      const hasOverlay = activeFrame != null && !!overlayForFrame(activeFrame)
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

      // Order the plates top-to-bottom so the light descends cleanly.
      const ordered = plates
        .map((p) => ({ p, y: p.getBBox().y }))
        .sort((a, b) => a.y - b.y)
        .map((o) => o.p)

      const GAP = 1.15 // beat between passes

      // One descent: a single crest travels down — each plate flares bright and
      // eases back, tightly staggered so it reads as one moving light, not a band.
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
            // Stagger ~ the pulse length, so only a couple plates glow at once —
            // a single light stepping down rather than a lit band.
            stagger: { each: 0.085, from: 'start' },
          })
      }
      function runPass() {
        st.running = true
        st.pass = buildPass()
      }
      // Queue the next pass — unless a hover has paused the loop.
      function scheduleNext() {
        st.next = null
        if (st.hovering) return
        st.next = gsap.delayedCall(GAP, runPass)
      }

      // Hover: let a running descent finish, but cancel any queued/idle pass so
      // nothing new starts while hovering. Leave: resume once we're idle.
      st.onEnter = () => {
        clearTimeout(st.leaveTimer)
        st.hovering = true
        st.next?.kill()
        st.next = null
      }
      st.onLeave = () => {
        clearTimeout(st.leaveTimer)
        // Small debounce so crossing seams between plates doesn't flicker.
        st.leaveTimer = setTimeout(() => {
          st.hovering = false
          if (!st.running && !st.next) scheduleNext()
        }, 140)
      }

      st.next = gsap.delayedCall(0.5, runPass) // first pass after the wipe lands
    },
    { dependencies: [activeFrame], scope: rootRef },
  )

  const hasOverlay = activeFrame != null && !!overlayForFrame(activeFrame)
  const plan = previewPlan ?? FLOOR_TYPE_PLANS[FLOOR_TYPE_PLANS.length - 1]

  // --- Floorplan preview: fade the scrim, pop the card in. ---------------
  useGSAP(
    () => {
      const scrim = floorplanScrimRef.current
      const card = floorplanCardRef.current
      if (!scrim || !card) return

      if (!floorplanOpen) {
        if (prefersReducedMotion()) {
          gsap.set([scrim, card], { autoAlpha: 0 })
        } else {
          gsap.to(scrim, { autoAlpha: 0, duration: 0.25, ease: 'power2.in' })
          gsap.to(card, { autoAlpha: 0, scale: 0.96, y: 6, duration: 0.25, ease: 'power2.in' })
        }
        return
      }

      if (prefersReducedMotion()) {
        gsap.set(scrim, { autoAlpha: 1 })
        gsap.set(card, { autoAlpha: 1, scale: 1, y: 0 })
        return
      }

      gsap.set(scrim, { autoAlpha: 0 })
      gsap.set(card, { autoAlpha: 0, scale: 0.94, y: 10 })
      gsap
        .timeline()
        .to(scrim, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, 0)
        .to(card, { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, ease: 'zenith' }, 0.05)
    },
    { dependencies: [floorplanOpen], scope: rootRef },
  )

  return (
    <div ref={rootRef} data-gate className="fixed inset-0 z-100 select-none bg-void">
      {/* The turntable. */}
      <canvas
        ref={canvasRef}
        onPointerDown={ready && !exiting && !floorplanOpen ? onPointerDown : undefined}
        onPointerMove={ready && !exiting && !floorplanOpen ? onPointerMove : undefined}
        onPointerUp={ready && !exiting && !floorplanOpen ? onPointerUp : undefined}
        onPointerCancel={ready && !exiting && !floorplanOpen ? onPointerUp : undefined}
        className="absolute inset-0 h-full w-full touch-none cursor-grab opacity-0 active:cursor-grabbing"
        aria-label="Runwal Zenith, 360-degree tower view. Drag to rotate."
        role="img"
      />

      {/* Floor-highlight overlay — inlined SVG pinned to the image rect so its
          plates sit on the tower. Shown only on a stop that carries one
          (frames 0 and 40 today). The container is click-through; only the
          painted plates are hoverable/clickable (see `.floor-overlay` in
          index.css). Clicking a plate opens the floorplan quick-preview below,
          for the floor that plate represents. */}
      <div
        ref={overlayRef}
        role="button"
        tabIndex={hasOverlay ? 0 : -1}
        aria-label="Preview a floor's plan"
        onClick={onOverlayClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openPreview(FLOOR_TYPE_PLANS[FLOOR_TYPE_PLANS.length - 1])
          }
        }}
        onMouseEnter={() => overlayAnim.current.onEnter()}
        onMouseLeave={() => overlayAnim.current.onLeave()}
        style={{ left: 0, top: 0, width: 0, height: 0 }}
        className="floor-overlay pointer-events-none absolute z-8 opacity-0 outline-none"
        dangerouslySetInnerHTML={{ __html: overlayHtml }}
      />

      {/* Legibility scrims — the renders run bright, so top and bottom get a
          soft wash for the chrome to sit on. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(11_10_8/0.45)_0%,transparent_22%,transparent_58%,rgb(11_10_8/0.72)_100%)]"
      />

      {/* Overlay chrome. */}
      <div
        ref={chromeRef}
        className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 opacity-0 sm:p-5 md:p-8 lg:p-10 3xl:p-14"
      >
        <div className="flex items-start justify-between">
          <Logo
            width={180}
            className="pointer-events-auto w-24 sm:w-28 md:w-32 3xl:w-40 drop-shadow-[0_2px_18px_rgb(0_0_0/0.55)]"
          />
          <span className="t-label hidden text-paper/80 [text-shadow:0_2px_18px_rgb(0_0_0/0.6)] sm:block">
            360&deg; &middot; Turntable
          </span>
        </div>

        {/* Drag affordance, centred. Fades the moment you take hold. */}
        <div
          ref={hintRef}
          aria-hidden="true"
          className={[
            'pointer-events-none mx-auto flex items-center gap-3 rounded-full px-4 py-2',
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

        <div className="flex items-end justify-between gap-4">
          <div className="[text-shadow:0_2px_22px_rgb(0_0_0/0.6)]">
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

          <button
            type="button"
            disabled={!ready || exiting}
            onClick={() => setExiting(true)}
            className={[
              'pointer-events-auto inline-flex shrink-0 items-center gap-2.5 rounded-full px-5 py-3',
              'glass-surface text-[10px] uppercase tracking-[0.16em] text-ink',
              'shadow-[0_18px_50px_-20px_rgb(0_0_0/0.75)] transition-colors duration-200',
              'hover:bg-ink hover:text-paper hover:backdrop-brightness-100',
              'md:px-6 md:text-[11px]',
              'disabled:pointer-events-none disabled:opacity-60',
            ].join(' ')}
          >
            <span>Enter experience</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.5]">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Point-tag callouts. Each self-positions and animates on its `active`
          flag; a frame can carry several (frame 80 has three). */}
      {LABEL_SPOTS.map((spot, i) => (
        <Hotspot
          key={`${spot.frame}-${i}`}
          spot={spot}
          active={ready && !exiting && activeFrame === spot.frame}
          canvasRef={canvasRef}
          onNavigate={() => enterCb.current?.()}
        />
      ))}

      {/* Floorplan quick-preview — opens on a click of the tower, or a number
          on the floor rail. A large look at one plan (at least half the
          screen), with a way through to the full Floorplan view; the scrim
          dismisses it on click or Escape. */}
      <div
        ref={floorplanScrimRef}
        aria-hidden={!floorplanOpen}
        onClick={() => setFloorplanOpen(false)}
        className={[
          'absolute inset-0 z-70 flex items-center justify-center bg-void/70 p-4 opacity-0 sm:p-6',
          floorplanOpen ? 'pointer-events-auto' : 'pointer-events-none',
        ].join(' ')}
      >
        <div
          ref={floorplanCardRef}
          role="dialog"
          aria-modal="true"
          aria-label="Floorplan preview"
          onClick={(e) => e.stopPropagation()}
          className={[
            'glass-surface relative flex w-[92vw] max-w-[560px] flex-col gap-4 overflow-y-auto',
            'rounded-2xl p-4 text-ink opacity-0 shadow-[0_50px_120px_-30px_rgb(0_0_0/0.7)] sm:p-6',
            'md:h-[80vh] md:max-h-[760px] md:w-[85vw] md:max-w-[1080px] md:flex-row md:gap-8 md:overflow-hidden',
          ].join(' ')}
        >
          <button
            type="button"
            onClick={() => setFloorplanOpen(false)}
            aria-label="Close floorplan preview"
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-paper/85 text-ink transition-colors duration-200 hover:bg-paper md:right-4 md:top-4"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-paper-2 md:aspect-auto md:h-full md:flex-1">
            <picture>
              <source srcSet={`${plan.base}-960.webp`} type="image/webp" />
              <img
                src={`${plan.base}-960.jpg`}
                alt={`${plan.name} floorplan`}
                className="h-full w-full object-contain p-2 md:p-5"
              />
            </picture>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-4 md:w-[280px] md:flex-none md:py-2">
            <div>
              <p className="t-label text-ink-3">{plan.subtitle}</p>
              <h3 className="mt-1.5 font-fine text-[22px] leading-tight text-ink md:text-[28px] 3xl:text-[32px]">
                {plan.name}
              </h3>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-2 md:text-[13px]">
                A closer look at this floor, ahead of the full, unit-by-unit Floorplan view.
              </p>
            </div>
            <button
              type="button"
              onClick={() => enterViewCb.current?.('floorplan')}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-paper transition-colors duration-200 hover:bg-brass-ink md:text-[11px]"
            >
              View full plan
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-[1.6]">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

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

        <p
          ref={counterRef}
          className="t-fig absolute bottom-6 right-6 text-[11px] tracking-[0.12em] text-ink-3 md:bottom-9 md:right-10 md:text-[12px]"
        >
          000
        </p>
        <span
          ref={ruleRef}
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-brass"
        />
        <span className="sr" role="status" aria-live="polite">
          {ready ? 'Ready. Drag the tower, or press enter experience.' : `Loading ${progress} percent`}
        </span>
      </div>

      {/* Exit cover — paper wiped on for a seamless hand to the menu. */}
      <div
        ref={coverRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-50 bg-paper opacity-0"
      />
    </div>
  )
}

export default Landing
