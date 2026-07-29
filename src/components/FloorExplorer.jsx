import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { FLOOR_SIDES, planForPlateRank, sideIndexForFrame } from '../lib/floorplans'
import floorHighlightSvg from '../assets/floor-highlight.svg?raw'
import floorFrontSvg from '../assets/floor-front.svg?raw'

/** The plate SVG that goes with each side, by key. */
const SIDE_SVG = {
  'three-quarter': floorHighlightSvg,
  frontal: floorFrontSvg,
}

/** The plates of an elevation, ordered top-to-bottom (rank 0 = crown). Uses
 *  getBoundingClientRect (never throws — getBBox can, on a mid-animation SVG). */
const orderPlates = (wrap) =>
  Array.from(wrap.querySelectorAll('.cls-1'))
    .map((p) => ({ p, y: p.getBoundingClientRect().top }))
    .sort((a, b) => a.y - b.y)
    .map((o) => o.p)

/**
 * The floorplan explorer — the Rustomjee-style split. The tower elevation sits
 * in a framed container on the left with its floor plates painted over it; hover
 * a plate to light it, click to select. The selected floor's plan renders large
 * on the right. Left/right arrows flip the tower to its other elevation (a 3D
 * swing) so you can read floors from another face. Opens docked from the orbit
 * (the building "moves left") and closes back to it.
 */
const FloorExplorer = ({ open, initialFrame, initialRank, onClose, onEnquire }) => {
  const rootRef = useRef(null)
  const buildingRef = useRef(null)
  const rightRef = useRef(null)
  const svgWrapRef = useRef(null)
  const platesRef = useRef([])
  const flipDirRef = useRef(1)
  // Set only by the arrows, so the 3D swing fires on a user side-change and not
  // on the side reset that happens when the explorer opens.
  const userFlipRef = useRef(false)

  // Initial elevation + floor come from the orbit hand-off. The explorer is
  // remounted (via a `key` in Landing) on each open, so these initialisers run
  // fresh every time — no prop→state syncing effect needed.
  const [sideIdx, setSideIdx] = useState(() => sideIndexForFrame(initialFrame))
  const [selectedRank, setSelectedRank] = useState(() =>
    typeof initialRank === 'number' ? initialRank : 0,
  )
  const [plateCount, setPlateCount] = useState(1)

  const side = FLOOR_SIDES[sideIdx]
  const plan = planForPlateRank(selectedRank, plateCount)

  // Wire the plates for the current side: order them top-to-bottom so a rank
  // maps to a floor band, and record the count for the plan bucketing.
  useEffect(() => {
    if (!open) return
    const wrap = svgWrapRef.current
    if (!wrap) return
    const plates = orderPlates(wrap)
    if (!plates.length) return
    platesRef.current = plates
    setPlateCount(plates.length)
    setSelectedRank((r) => Math.min(r, plates.length - 1))
  }, [open, sideIdx])

  // Persistent highlight on the selected plate.
  useEffect(() => {
    platesRef.current.forEach((p, i) => p.classList.toggle('is-active', i === selectedRank))
  }, [selectedRank, plateCount, sideIdx])

  // Reveal / dismiss: the building slides in from centre to its left dock while
  // the plan panel rises in beside it.
  useGSAP(
    () => {
      const root = rootRef.current
      const building = buildingRef.current
      const right = rightRef.current
      if (!root) return

      if (!open) {
        gsap.to(root, { autoAlpha: 0, duration: 0.35, ease: 'power2.in' })
        return
      }
      if (prefersReducedMotion()) {
        gsap.set(root, { autoAlpha: 1 })
        gsap.set([building, right], { autoAlpha: 1, x: 0, scale: 1 })
        return
      }
      gsap.set(root, { autoAlpha: 1 })
      gsap.set(building, { autoAlpha: 0, xPercent: 14, scale: 1.06 })
      gsap.set(right, { autoAlpha: 0, x: 46 })
      gsap
        .timeline()
        .to(building, { autoAlpha: 1, xPercent: 0, scale: 1, duration: 0.85, ease: 'zenith' }, 0)
        .to(right, { autoAlpha: 1, x: 0, duration: 0.7, ease: 'zenith' }, 0.18)
    },
    { dependencies: [open], scope: rootRef },
  )

  // 3D swing when the elevation swaps — only on a user arrow press.
  useGSAP(
    () => {
      if (!userFlipRef.current) return
      userFlipRef.current = false
      const building = buildingRef.current
      if (!building || prefersReducedMotion()) return
      gsap.fromTo(
        building,
        { rotateY: flipDirRef.current * 42, autoAlpha: 0.25, scale: 0.965 },
        { rotateY: 0, autoAlpha: 1, scale: 1, duration: 0.6, ease: 'zenith' },
      )
    },
    { dependencies: [sideIdx], scope: rootRef },
  )

  const changeSide = (dir) => {
    flipDirRef.current = dir
    userFlipRef.current = true
    setSideIdx((s) => (s + dir + FLOOR_SIDES.length) % FLOOR_SIDES.length)
  }

  // Rank the clicked plate fresh from the DOM, so selection works even if the
  // wiring effect hasn't run yet — and keep count/refs in sync for the bucket.
  const onPlateClick = (e) => {
    const plate = e.target.closest?.('.cls-1')
    const wrap = svgWrapRef.current
    if (!plate || !wrap) return
    const plates = orderPlates(wrap)
    const rank = plates.indexOf(plate)
    if (rank < 0) return
    platesRef.current = plates
    setPlateCount(plates.length)
    setSelectedRank(rank)
  }

  const SPECS = [
    ['Configuration', plan.config],
    ['Floor band', plan.band],
    ['Elevation', side.label],
  ]

  return (
    <div
      ref={rootRef}
      aria-hidden={!open}
      className={[
        'absolute inset-0 z-90 flex flex-col overflow-y-auto bg-void opacity-0',
        'md:grid md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:overflow-hidden',
        open ? '' : 'pointer-events-none',
      ].join(' ')}
    >
      {/* ---------- Left: the tower elevation, plates painted on ---------- */}
      <section className="perspective-[1600px] relative flex min-h-0 flex-[1.05] flex-col justify-center px-4 pt-14 pb-3 sm:px-6 md:h-full md:flex-none md:px-8 md:py-10 lg:px-12">
        <div className="mx-auto flex w-full max-w-140 flex-col gap-3 md:max-w-none">
          <p className="t-label flex items-center gap-2 text-paper/70 before:h-px before:w-3.5 before:bg-brass before:content-['']">
            {side.label}
          </p>

          <div ref={buildingRef} className="transform-3d relative">
            {/* Building box: full 16:9 frame so the traced SVG lands 1:1. */}
            <div className="relative mx-auto aspect-1440/810 w-full">
              <img
                key={side.key}
                src={side.img}
                alt={`Runwal Zenith — ${side.label}`}
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
              <div
                key={`svg-${side.key}`}
                ref={svgWrapRef}
                onClick={onPlateClick}
                className="floor-overlay floor-explorer absolute inset-0"
                dangerouslySetInnerHTML={{ __html: SIDE_SVG[side.key] }}
              />
            </div>

            {/* Elevation arrows. */}
            <button
              type="button"
              onClick={() => changeSide(-1)}
              aria-label="Previous elevation"
              className="group absolute left-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full glass-surface text-ink shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)] transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100 md:h-12 md:w-12 lg:-left-2"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.5] transition-transform duration-300 ease-zenith group-hover:-translate-x-0.5">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => changeSide(1)}
              aria-label="Next elevation"
              className="group absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full glass-surface text-ink shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)] transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100 md:h-12 md:w-12 lg:-right-2"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.5] transition-transform duration-300 ease-zenith group-hover:translate-x-0.5">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-center gap-3">
            <span className="t-label text-paper/55">Select a floor</span>
            <span className="flex gap-1.5">
              {FLOOR_SIDES.map((s, i) => (
                <span
                  key={s.key}
                  className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${i === sideIdx ? 'bg-brass' : 'bg-paper/25'}`}
                />
              ))}
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Right: the selected plan ---------- */}
      <section
        ref={rightRef}
        className="relative flex min-h-0 flex-1 flex-col gap-3 bg-paper p-4 text-ink sm:p-6 md:h-full md:gap-4 md:p-8 lg:p-10 3xl:p-14"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="t-label flex items-center gap-2 text-ink-3 before:h-px before:w-3.5 before:bg-brass before:content-['']">
              Floor plan
            </p>
            <h2 className="mt-1.5 font-fine text-[clamp(24px,3vw,44px)] leading-[1.02] tracking-[-0.02em] text-ink">
              {plan.name}
            </h2>
          </div>
          <span className="t-label shrink-0 rounded-full border border-ink/15 px-3 py-1.5 text-ink-2">
            {plan.config}
          </span>
        </div>

        {/* The plan sheet — a document, so it fits whole and never crops. */}
        <figure className="card m-0 grid min-h-[46vh] flex-1 grid-rows-[minmax(0,1fr)] bg-paper-2 p-2.5 md:min-h-0 md:p-4">
          <picture key={plan.key} className="block h-full min-h-0 w-full">
            <source type="image/webp" srcSet={`${plan.base}-1600.webp`} />
            <img
              src={`${plan.base}-1600.jpg`}
              alt={`${plan.name} floor plan`}
              className="h-full w-full object-contain"
              draggable={false}
            />
          </picture>
        </figure>

        {/* Specs + CTA. */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <dl className="grid grid-cols-3 gap-x-5 gap-y-1">
            {SPECS.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="t-label text-ink-3">{k}</dt>
                <dd className="m-0 text-[12px] font-normal text-ink md:text-[13px]">{v}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => onEnquire?.()}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-ink px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-paper transition-colors duration-200 hover:bg-brass-ink md:self-auto md:text-[11px]"
          >
            Enquire about this residence
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-[1.6]">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* Back to the orbit. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Back"
        className={[
          'absolute left-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full',
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
    </div>
  )
}

export default FloorExplorer
