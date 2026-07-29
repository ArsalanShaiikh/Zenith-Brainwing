import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import {
  FEATURE_LABELS,
  FLOOR_PLANS,
  FLOOR_SIDES,
  floorFromRank,
  planForPlateRank,
  sideIndexForFrame,
  sqft,
} from '../lib/floorplans'
import { useUnitFilters } from '../hooks/useUnitFilters'
import UnitFilter from './UnitFilter'
import floorHighlightSvg from '../assets/floor-highlight.svg?raw'
import floorFrontSvg from '../assets/floor-front.svg?raw'

/** Parse a traced elevation SVG into plain shape data, so the plates render as
 *  real React elements carrying their own mouse handlers — the same pattern as
 *  Rustomjee's FloorComparisonPanel. Injected innerHTML + delegated/native
 *  listeners proved unreliable for hover here. */
const parsePlates = (raw) => {
  const root = new DOMParser().parseFromString(raw, 'image/svg+xml').documentElement
  return {
    viewBox: root.getAttribute('viewBox') ?? '0 0 1920 1080',
    shapes: Array.from(root.querySelectorAll('.cls-1')).map((el) => ({
      tag: el.tagName,
      points: el.getAttribute('points') ?? undefined,
      d: el.getAttribute('d') ?? undefined,
    })),
  }
}

/** The parsed plate set that goes with each side, by key. */
const SIDE_SHAPES = {
  'three-quarter': parsePlates(floorHighlightSvg),
  frontal: parsePlates(floorFrontSvg),
}

/**
 * The tower crop, in source pixels of the 1440×810 orbit frame. The elevation
 * column is a narrow portrait now, so letterboxing the whole render would leave
 * the tower a sliver — we clip to the slice the building actually occupies.
 * These bounds hold for both elevations (the tower sits at x≈620–835 in the
 * three-quarter frame and x≈623–801 in the frontal one, and reaches its lowest
 * base at y≈715), so one crop serves both.
 *
 * Image *and* plate SVG live inside one 16:9 layer within the clip, so they
 * scale as a unit and the traced plates stay pixel-aligned — switching the
 * <img> to object-cover on its own would slide the photo out from under them.
 */
const CROP = { x: 530, y: 30, w: 400, h: 780 }
const FRAME_STYLE = { aspectRatio: `${CROP.w} / ${CROP.h}` }
const LAYER_STYLE = {
  width: `${(1440 / CROP.w) * 100}%`,
  height: `${(810 / CROP.h) * 100}%`,
  left: `${(-CROP.x / CROP.w) * 100}%`,
  top: `${(-CROP.y / CROP.h) * 100}%`,
}

/**
 * The floorplan explorer — a Rustomjee-style split with two ways in:
 *   • Visual selection — the tower elevation sits on the left with its floor
 *     plates painted over it; hover a plate to read its floor, click to select,
 *     and flip elevations with the arrows.
 *   • Search by unit — a faceted, text-only list of residences on the left
 *     (search, configuration, carpet-area range, features, sort); pick one to
 *     open its plan.
 * Either way the chosen plan renders large on the right. Opens docked from the
 * orbit (the building "moves left") and closes back to it.
 */
const FloorExplorer = ({ open, initialFrame, initialRank, onClose, onEnquire }) => {
  const rootRef = useRef(null)
  const buildingRef = useRef(null)
  const buildingBoxRef = useRef(null)
  const rightRef = useRef(null)
  const plateElsRef = useRef([])
  const flipDirRef = useRef(1)
  const userFlipRef = useRef(false)

  const [mode, setMode] = useState('visual') // 'visual' | 'search'
  const [searchKey, setSearchKey] = useState(FLOOR_PLANS[0].key)
  const filters = useUnitFilters()
  // The floor tag: {rank, y} for the plate under the cursor (px from the box
  // top); `out` keeps it mounted while it fades away after the cursor leaves.
  const [hoverInfo, setHoverInfo] = useState(null)

  // Initial elevation + floor come from the orbit hand-off. The explorer is
  // remounted (via a `key` in Landing) on each open, so these initialisers run
  // fresh every time.
  const [sideIdx, setSideIdx] = useState(() => sideIndexForFrame(initialFrame))
  const [selectedRank, setSelectedRank] = useState(() =>
    typeof initialRank === 'number' ? initialRank : 0,
  )
  // shapeIndex → rank (0 = crown), measured from the rendered plates — the
  // traced shapes aren't in top-to-bottom document order.
  const [rankMap, setRankMap] = useState(null)

  const side = FLOOR_SIDES[sideIdx]
  const { viewBox, shapes } = SIDE_SHAPES[side.key]
  const plateCount = shapes.length
  const rank = Math.min(selectedRank, plateCount - 1)
  const activeRank = hoverInfo ? hoverInfo.rank : rank
  // The open residence, derived rather than synced: narrowing the filters past
  // the selection falls through to the first surviving result, and clearing
  // the list entirely leaves the last-picked plan on screen.
  const searchPlan =
    filters.results.find((p) => p.key === searchKey) ??
    filters.results[0] ??
    FLOOR_PLANS.find((p) => p.key === searchKey) ??
    FLOOR_PLANS[0]
  const plan = mode === 'search' ? searchPlan : planForPlateRank(rank, plateCount)
  const floorNumber = floorFromRank(rank, plateCount)
  const readoutFloor = floorFromRank(activeRank, plateCount)
  const tagY = hoverInfo ? hoverInfo.y : 0
  const tagVisible = Boolean(hoverInfo && !hoverInfo.out)

  // The hovered plate's vertical centre, in px from the building box top — so
  // the floor tag can sit right beside that floor.
  const measureY = (plate) => {
    const box = buildingBoxRef.current
    if (!box || !plate) return 0
    const b = box.getBoundingClientRect()
    const r = plate.getBoundingClientRect()
    return r.top + r.height / 2 - b.top
  }

  // Rank the plates of the current side top-to-bottom (rank 0 = crown) by
  // measuring the rendered elements, so each shape index maps to a floor.
  useEffect(() => {
    if (!open || mode !== 'visual') return
    const els = plateElsRef.current.slice(0, shapes.length)
    if (els.length !== shapes.length || els.some((el) => !el)) return
    const order = shapes
      .map((_, i) => i)
      .sort((a, b) => els[a].getBoundingClientRect().top - els[b].getBoundingClientRect().top)
    const map = []
    order.forEach((shapeIdx, r) => {
      map[shapeIdx] = r
    })
    setRankMap(map)
    setHoverInfo(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sideIdx, mode])

  // Reveal / dismiss: the panel slides in from centre to its left dock while
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
        gsap.set([building, right].filter(Boolean), { autoAlpha: 1, x: 0, scale: 1 })
        return
      }
      gsap.set(root, { autoAlpha: 1 })
      if (building) gsap.set(building, { autoAlpha: 0, xPercent: 14, scale: 1.06 })
      gsap.set(right, { autoAlpha: 0, x: 46 })
      gsap
        .timeline()
        .to(building ?? {}, { autoAlpha: 1, xPercent: 0, scale: 1, duration: 0.85, ease: 'zenith' }, 0)
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

  // Per-plate handlers, Rustomjee-style: each rendered shape reports its own
  // enter/leave/click. On leave the tag keeps its last spot and fades out.
  const onPlateEnter = (i) => (e) => {
    if (!rankMap) return
    setHoverInfo({ rank: rankMap[i], y: measureY(e.currentTarget) })
  }
  const onPlateLeave = () => setHoverInfo((h) => (h ? { ...h, out: true } : null))
  const onPlateClick = (i) => () => {
    if (rankMap) setSelectedRank(rankMap[i])
  }

  // In search mode the readout is what the sheet states — carpet, balcony,
  // total. Visual selection keeps the floor it was picked from up front.
  const SPECS =
    mode === 'search'
      ? plan.carpet
        ? [
            ['Configuration', plan.config],
            ['RERA carpet', `${sqft(plan.carpet.sqft)} sq.ft · ${plan.carpet.sqm} sq.m`],
            ['Balcony', `${sqft(plan.balcony.sqft)} sq.ft`],
            ['Total', `${sqft(plan.total.sqft)} sq.ft · ${plan.total.sqm} sq.m`],
          ]
        : [
            ['Configuration', plan.config],
            ['Covers', plan.band],
            ['Elevation', side.label],
          ]
      : [
          ['Floor', `No. ${floorNumber}`],
          ['Configuration', plan.config],
          ['Elevation', side.label],
        ]

  const amenities = mode === 'search' ? plan.features.map((f) => FEATURE_LABELS[f]) : []

  return (
    <div
      ref={rootRef}
      aria-hidden={!open}
      className={[
        // One field, not two: the plan side's paper runs the full width and the
        // elevation column is a slim gutter on it, parted by a hairline.
        'absolute inset-0 z-90 flex flex-col overflow-y-auto bg-paper text-ink opacity-0',
        'md:grid md:grid-cols-[minmax(0,0.38fr)_minmax(0,1fr)] md:overflow-hidden',
        open ? '' : 'pointer-events-none',
      ].join(' ')}
    >
      {/* ---------- Left: mode toggle + (elevation | unit search) ---------- */}
      <section
        className={[
          // flex-none while stacked: the elevation frame is portrait now, so a
          // flex-sized section would clip it and let it spill over the plan
          // below. Auto height + the root's scroll is the honest stack.
          'perspective-[1600px] relative flex min-h-0 flex-none flex-col px-4 pt-14 pb-5',
          'sm:px-6 md:h-full md:border-r md:border-ink/12 md:px-5 md:py-8',
          'lg:px-6 xl:px-8',
          // The elevation floats centred; the filter panel fills the column.
          mode === 'search' ? 'justify-start' : 'justify-center',
        ].join(' ')}
      >
        <div
          className={[
            'mx-auto flex w-full max-w-140 flex-col gap-3 md:max-w-none',
            // flex-1 alone — pairing it with h-full made the panel 100% of the
            // column *plus* the toggle above it, so the results list ran off
            // the bottom edge instead of scrolling inside itself.
            mode === 'search' ? 'min-h-0 flex-1' : '',
          ].join(' ')}
        >
          {/* Two ways in. A segmented control rather than a pill pair — the
              column is too narrow for the labels to sit inline at their old
              size, so the two halves split the width evenly instead. */}
          <div className="grid w-full max-w-72 shrink-0 grid-cols-2 gap-0.5 rounded-full border border-ink/12 bg-ink/4 p-0.5 md:max-w-none">
            {[
              ['visual', 'Visual selection'],
              ['search', 'Search by unit'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                aria-pressed={mode === key}
                className={[
                  'truncate rounded-full px-2 py-1.5 text-center text-[9px] uppercase tracking-[0.12em]',
                  'transition-colors duration-200 lg:text-[10px] lg:tracking-[0.14em]',
                  mode === key ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'visual' ? (
            <>
              <p className="t-label flex items-center gap-2 text-ink-3 before:h-px before:w-3.5 before:bg-brass before:content-['']">
                {side.label}
              </p>

              <div
                ref={buildingRef}
                className="transform-3d relative mx-auto w-full max-w-[min(58vw,38vh)] md:max-w-[min(100%,34vh)]"
              >
                {/* The crop frame. Height is what's actually scarce here, so the
                    frame is capped off the viewport height and the column just
                    centres it. */}
                <div
                  ref={buildingBoxRef}
                  style={FRAME_STYLE}
                  className="relative w-full overflow-hidden rounded-sm bg-paper-2"
                >
                  {/* One 16:9 layer holding both photo and plates, oversized and
                      offset so the tower lands in the frame. */}
                  <div className="absolute" style={LAYER_STYLE}>
                    <img
                      key={side.key}
                      src={side.img}
                      alt={`Runwal Zenith — ${side.label}`}
                      className="absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="floor-overlay floor-explorer absolute inset-0">
                      <svg key={side.key} viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
                        {shapes.map((s, i) => {
                          const shapeProps = {
                            ref: (el) => {
                              plateElsRef.current[i] = el
                            },
                            className: `cls-1${rankMap?.[i] === rank ? ' is-active' : ''}`,
                            onMouseEnter: onPlateEnter(i),
                            onMouseLeave: onPlateLeave,
                            onClick: onPlateClick(i),
                          }
                          return s.tag === 'polygon' ? (
                            <polygon key={i} points={s.points} {...shapeProps} />
                          ) : (
                            <path key={i} d={s.d} {...shapeProps} />
                          )
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Floor tag — glides beside the floor under the cursor and
                      fades away once the cursor leaves the tower. It sits on the
                      crop now rather than in the column margin, so it carries its
                      own dark plate to stay legible over sky or city. */}
                  {hoverInfo && (
                    <div
                      className={[
                        'pointer-events-none absolute right-1 z-10 -translate-y-1/2',
                        'transition-[top,opacity] duration-200 ease-out',
                        tagVisible ? 'opacity-100' : 'opacity-0',
                      ].join(' ')}
                      style={{ top: `${tagY}px` }}
                    >
                      <span className="flex flex-col rounded-sm bg-void/55 px-2 py-1 leading-none text-brass-lift [backdrop-filter:blur(3px)]">
                        <span className="text-[8px] uppercase tracking-[0.24em] md:text-[9px]">
                          Floor
                        </span>
                        <span className="t-fig text-[22px] leading-[0.9] min-[430px]:text-[26px] md:text-[30px] lg:text-[34px]">
                          {readoutFloor}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Elevation controls. The arrows used to flank the render; at this
                  width there's no margin to flank into, so they join the dots in
                  one strip under it. */}
              <div className="flex shrink-0 items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => changeSide(-1)}
                  aria-label="Previous elevation"
                  className="group grid h-9 w-9 place-items-center rounded-full border border-ink/15 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper touch:h-11 touch:w-11"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.5] transition-transform duration-300 ease-zenith group-hover:-translate-x-0.5">
                    <path d="M15 5 8 12l7 7" />
                  </svg>
                </button>
                <span className="flex gap-1.5">
                  {FLOOR_SIDES.map((s, i) => (
                    <span
                      key={s.key}
                      className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${i === sideIdx ? 'bg-brass' : 'bg-ink/20'}`}
                    />
                  ))}
                </span>
                <button
                  type="button"
                  onClick={() => changeSide(1)}
                  aria-label="Next elevation"
                  className="group grid h-9 w-9 place-items-center rounded-full border border-ink/15 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper touch:h-11 touch:w-11"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.5] transition-transform duration-300 ease-zenith group-hover:translate-x-0.5">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <p className="t-label shrink-0 text-center text-ink-3">
                Hover a floor, click to open
              </p>
            </>
          ) : (
            <UnitFilter filters={filters} activeKey={searchPlan.key} onSelect={setSearchKey} />
          )}
        </div>
      </section>

      {/* ---------- Right: the selected plan ---------- */}
      <section
        ref={rightRef}
        className="relative flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6 md:h-full md:gap-4 md:p-8 lg:p-10 3xl:p-14"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="t-label flex items-center gap-2 text-ink-3 before:h-px before:w-3.5 before:bg-brass before:content-['']">
              {mode === 'visual' ? `Floor plan · Level ${floorNumber}` : plan.sheet}
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
          <div className="flex min-w-0 flex-col gap-2">
            <dl
              className={[
                'grid gap-x-5 gap-y-1',
                SPECS.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
              ].join(' ')}
            >
              {SPECS.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <dt className="t-label text-ink-3">{k}</dt>
                  <dd className="m-0 text-[12px] font-normal text-ink md:text-[13px]">{v}</dd>
                </div>
              ))}
            </dl>
            {amenities.length > 0 && (
              <p className="m-0 text-[11px] text-ink-3 md:text-[12px]">{amenities.join(' · ')}</p>
            )}
          </div>
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
          // Flat on the cream field — glass-surface's brightness lift has no
          // dark backdrop left to work against here.
          'border border-ink/15 bg-paper text-ink',
          'transition-colors duration-200 hover:bg-ink hover:text-paper',
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
