import { useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { FEATURE_LABELS, FLOOR_PLANS, sqft } from '../lib/floorplans'
import { VANTAGES } from '../lib/panos'
import { useVisitor } from '../hooks/useVisitor'
import { planRecord } from '../lib/saveables'

const ScaleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.5]">
    <path d="M12 4v16M8 20h8M4 8h16" />
    <path d="M4 8L1.5 13a3 3 0 006 0L4 8Z" />
    <path d="M20 8l-2.5 5a3 3 0 006 0L20 8Z" />
  </svg>
)

const ZoomIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.35-4.35M11 8.5v5M8.5 11h5" />
  </svg>
)

const ConfigIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
)

const BedIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
    <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
    <path d="M3 18v2M21 18v2" />
    <path d="M3 13V7a2 2 0 0 1 2-2h5v5" />
    <path d="M12 10h7a2 2 0 0 1 2 2v1" />
  </svg>
)

const CarpetIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
    <path d="M4 20 20 4M4 20h4M4 20v-4M9 15l2 2M13 11l2 2M17 7l2 2" />
  </svg>
)

const BalconyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
  </svg>
)

const TotalIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
    <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
  </svg>
)

const LivingIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
    <path d="M5 12V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
    <path d="M3 12h18v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Z" />
    <path d="M5 17v2M19 17v2" />
  </svg>
)

const FeaturesIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
    <path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1L6.6 19l1.3-6-4.6-4.1 6.1-.6L12 3Z" />
  </svg>
)

const ViewIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
)

const BackIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-[1.6]">
    <path d="M15 5 8 12l7 7" />
  </svg>
)

/** Residences and jodis only, in the crown-to-base order the sheet list already
 *  carries (see floorplans.js). Zipped against the pano elevations, which read
 *  in the same direction — so each column gets the vantage nearest its own
 *  place in the tower. An approximation, same as the plan's own vantage marks
 *  (see planViews.js): the tower doesn't have unit-specific renders yet. */
const RESIDENCE_ORDER = FLOOR_PLANS.filter((p) => p.type !== 'reference')

/** How close two elevations have to be (in metres) before their panos read
 *  as the same photo to a visitor. Crown/Sky rise/High rise sit only 4–6 m
 *  apart — same photo, different label — while the rest are ~32 m apart and
 *  genuinely distinct. Tune this if new pano heights are added. */
const VANTAGE_DISTINCT_GAP_METRES = 15

/** How many of the lowest elevations stay in the repeat pool regardless of
 *  clustering — the tower's original "most-used" pair. Near-duplicate
 *  vantages freed up by clustering join this pool rather than each getting
 *  their own tiny pool, so repeats still have some variety instead of
 *  alternating between just two photos. */
const FORCED_REPEAT_COUNT = 2

/** Groups VANTAGES (already sorted crown-to-base) into runs where each
 *  consecutive gap is under VANTAGE_DISTINCT_GAP_METRES — i.e. runs that
 *  read as one photo, not several. */
const clusterVantages = (vantages, gapThreshold) => {
  const clusters = []
  vantages.forEach((v, i) => {
    if (i === 0 || vantages[i - 1].metres - v.metres >= gapThreshold) {
      clusters.push([i])
    } else {
      clusters[clusters.length - 1].push(i)
    }
  })
  return clusters
}

/** Splits VANTAGES into a "once" pool (visually distinct, one residence
 *  each) and a "repeat" pool (near-duplicates plus the forced lowest pair)
 *  that the rest of the tower cycles through. */
const groupVantageIndices = () => {
  const n = VANTAGES.length
  if (n === 0) return { onceIndices: [], repeatIndices: [] }
  const clusters = clusterVantages(VANTAGES, VANTAGE_DISTINCT_GAP_METRES)
  const repeatSet = new Set()
  clusters.forEach((cluster) => {
    // Every member past the first (highest) in a close cluster is a
    // near-duplicate of it, so it joins the repeat pool instead of
    // pretending to be its own distinct view.
    cluster.slice(1).forEach((idx) => repeatSet.add(idx))
  })
  for (let idx = n - FORCED_REPEAT_COUNT; idx < n; idx++) repeatSet.add(idx)
  const onceIndices = []
  for (let idx = 0; idx < n; idx++) {
    if (!repeatSet.has(idx)) onceIndices.push(idx)
  }
  return { onceIndices, repeatIndices: [...repeatSet] }
}

const { onceIndices: ONCE_INDICES, repeatIndices: REPEAT_INDICES } = groupVantageIndices()

/** Builds the plan→vantage lookup for the full RESIDENCE_ORDER, once, so a
 *  given plan always resolves to the same vantage everywhere it's shown.
 *  Each once-pool vantage is assigned to exactly one residence, spread
 *  evenly across the order; every other residence cycles through the repeat
 *  pool, so no residence goes without a photo and no two "distinct" slots
 *  quietly show the same image. */
const buildVantageSequence = (count) => {
  if (VANTAGES.length === 0 || count === 0) return []
  const singleCount = Math.min(ONCE_INDICES.length, count)
  const seq = new Array(count).fill(null)
  for (let s = 0; s < singleCount; s++) {
    const pos = Math.round((s * (count - 1)) / Math.max(singleCount - 1, 1))
    seq[pos] = ONCE_INDICES[s]
  }
  const pool = REPEAT_INDICES.length > 0 ? REPEAT_INDICES : ONCE_INDICES
  let cursor = 0
  for (let i = 0; i < count; i++) {
    if (seq[i] === null) {
      seq[i] = pool[cursor % pool.length]
      cursor += 1
    }
  }
  return seq
}

const VANTAGE_SEQUENCE = buildVantageSequence(RESIDENCE_ORDER.length)

/** Resolves each compared plan to its VANTAGE_SEQUENCE vantage. A collision
 *  on a repeat-pool vantage swaps to the next pool member not already
 *  showing in this compare, so two columns only ever share a photo when the
 *  whole pool has been exhausted. Once-pool vantages never collide by
 *  construction. */
const vantagesForCompare = (plans) => {
  if (VANTAGES.length === 0) return plans.map(() => null)
  const used = new Set()
  return plans.map((p) => {
    const i = RESIDENCE_ORDER.findIndex((rp) => rp.key === p.key)
    if (i === -1) return null
    let idx = VANTAGE_SEQUENCE[i]
    if (used.has(idx) && REPEAT_INDICES.includes(idx)) {
      const alt = REPEAT_INDICES.find((r) => !used.has(r))
      if (alt !== undefined) idx = alt
    }
    used.add(idx)
    return VANTAGES[idx]
  })
}

/** A little shorter than the plan preview above it — this is a supporting
 *  glance at the view, not the main thing on the card. `faceUrls` (see
 *  lib/panos.js) is a real single tile, not the tiny cube-map preview strip
 *  Marzipano uses to hold the pano's own screen until real tiles arrive, so
 *  it reads as an ordinary sharp photo rather than a blurry placeholder. */
const VIEW_ASPECT = 4 / 3

/** One row per stated fact, in the order the plan sheets read. Reference
 *  plans carry no carpet/balcony/total, so those cells fall through to '—'. */
const ROWS = [
  { label: 'Configuration', icon: ConfigIcon, get: (p) => p.config },
  { label: 'Bedrooms', icon: BedIcon, get: (p) => p.bedrooms ?? '—' },
  { label: 'RERA carpet', icon: CarpetIcon, get: (p) => (p.carpet ? `${sqft(p.carpet.sqft)} sq.ft` : '—') },
  { label: 'Balcony', icon: BalconyIcon, get: (p) => (p.balcony ? `${sqft(p.balcony.sqft)} sq.ft` : '—') },
  { label: 'Total', icon: TotalIcon, get: (p) => (p.total ? `${sqft(p.total.sqft)} sq.ft` : '—') },
  { label: 'Living room', icon: LivingIcon, get: (p) => p.living ?? '—' },
  {
    label: 'Features',
    icon: FeaturesIcon,
    get: (p) => (p.features?.length ? p.features.map((f) => FEATURE_LABELS[f]).join(', ') : '—'),
  },
]

/** Short badge for the card strip — bedroom count where the sheet states one,
 *  the plan's own config label otherwise (reference plans, which carry no
 *  bedroom count of their own). */
const badgeFor = (p) => (p.bedrooms ? `${p.bedrooms} BHK` : p.config)

/** Matches the 960×679 sheet's own aspect ratio, so the plan renders at full height uncropped. */
const PLAN_PREVIEW_ASPECT = '960 / 680'

/**
 * Side-by-side compare — the 2–3 residences picked from the unit list, read
 * off the same facts the search results and the plan readout already show.
 * A modal rather than a route: comparing is a quick side-trip off the search,
 * not a destination of its own. Each plan's sheet is the real MahaRERA
 * artwork (own letterhead, compass, QR already printed on it), so the card
 * chrome here stays to what the sheet doesn't already say: type, name and
 * the zoom affordance into the full viewer.
 */
const UnitCompare = ({ open, plans, onClose, onRemove, onZoom }) => {
  const { isSaved, toggleSave } = useVisitor()

  // Whether the comparison has been saved this time round — resets the
  // moment the modal reopens, same as IsoWalkthroughModal resets its picker,
  // so a visitor never finds an old compare left mid-reveal.
  const [revealed, setRevealed] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setRevealed(false)
  }

  const rootRef = useRef(null)
  const blackoutRef = useRef(null)
  const compareVantages = vantagesForCompare(plans)

  // The floorplan table and the view grid are different DOM shapes, not a
  // height/width the same box could tween between — so the swap between them
  // cuts through black rather than crossfading. A quick fade to full black,
  // the content swaps underneath while nothing is visible, then black lifts
  // off the result.
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const goTo = contextSafe((show) => {
    const el = blackoutRef.current
    if (!el || prefersReducedMotion()) {
      setRevealed(show)
      return
    }
    gsap
      .timeline()
      .set(el, { pointerEvents: 'auto' })
      .to(el, { opacity: 1, duration: 0.22, ease: 'power2.in' })
      .call(() => setRevealed(show))
      .to(el, { opacity: 0, duration: 0.4, ease: 'power2.out' }, '+=0.1')
      .set(el, { pointerEvents: 'none' })
  })

  if (!open) return null

  const onCompareView = () => {
    plans.forEach((p) => {
      const record = planRecord(p)
      if (!isSaved(record.id)) toggleSave(record)
    })
    goTo(true)
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-void/55 p-4 [backdrop-filter:blur(4px)]"
      onClick={onClose}
    >
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Compare residences"
        onClick={(e) => e.stopPropagation()}
        className="card relative m-0 max-h-[85vh] w-full max-w-7xl overflow-y-auto p-4 sm:p-6"
      >
        {/* The blackout. Above everything in this dialog, opaque only for the
            moment the content underneath is swapped. */}
        <div
          ref={blackoutRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-50 bg-void opacity-0"
        />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brass/15 text-brass-ink"
            >
              <ScaleIcon />
            </span>
            <div>
              <h3 className="font-fine text-[20px] leading-tight text-ink sm:text-[24px]">
                Compare residences
              </h3>
              <p className="mt-0.5 text-[11px] text-ink-3 sm:text-[12px]">
                Compare floorplans and specifications side by side
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {plans.length > 0 && !revealed && (
              <button
                type="button"
                onClick={onCompareView}
                aria-label="Compare the view from each residence"
                title="Compare view"
                className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-ink-2 transition-colors duration-200 hover:border-brass/50 hover:text-brass-ink"
              >
                <ViewIcon />
                Compare view
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close compare"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/15 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        {plans.length === 0 ? (
          <p className="mt-4 text-[12px] text-ink-3">No residences selected.</p>
        ) : (
          <div>
            {revealed ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="t-label text-ink-3">The view from each residence</p>
                  <button
                    type="button"
                    onClick={() => goTo(false)}
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-ink-2 transition-colors duration-200 hover:text-ink"
                  >
                    <BackIcon />
                    Back to floorplans
                  </button>
                </div>
                <div
                  className="mt-4 grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))` }}
                >
                  {plans.map((p, i) => {
                    const vantage = compareVantages[i]
                    return (
                      <div key={p.key}>
                        <div
                          className="pointer-events-none select-none overflow-hidden rounded-md bg-paper-2"
                          style={{ aspectRatio: VIEW_ASPECT }}
                        >
                          {vantage && (
                            <img
                              src={vantage.scenes.day.faceUrls[i % vantage.scenes.day.faceUrls.length]}
                              alt={`The view from around ${vantage.metres} m, near ${p.name}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              draggable={false}
                            />
                          )}
                        </div>
                        <p className="mt-2 truncate text-[13px] font-normal text-ink">{p.name}</p>
                        {vantage && (
                          <p className="t-label text-ink-3">
                            {vantage.metres} m · {vantage.label}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] table-fixed border-collapse text-left">
                  <colgroup>
                    <col className="w-32" />
                    {plans.map((p) => (
                      <col key={p.key} style={{ width: `${100 / plans.length}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="w-32 border-b border-hair pb-2 pr-2" />
                      {plans.map((p) => (
                        <th key={p.key} className="border-b border-hair px-2 pb-2 align-bottom">
                          <button
                            type="button"
                            onClick={() => onZoom?.(p)}
                            aria-label={`Zoom into ${p.name}`}
                            className="group relative mb-2 block w-full overflow-hidden rounded-md bg-paper-2"
                            style={{ aspectRatio: PLAN_PREVIEW_ASPECT }}
                          >
                            <picture>
                              <source type="image/webp" srcSet={`${p.base}-960.webp`} />
                              <img
                                src={`${p.base}-960.jpg`}
                                alt={`${p.name} floor plan`}
                                className="h-full w-full object-contain p-1"
                                loading="lazy"
                                draggable={false}
                              />
                            </picture>
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-void/0 opacity-0 transition-all duration-200 group-hover:bg-void/25 group-hover:opacity-100">
                              <span className="grid h-8 w-8 place-items-center rounded-full bg-paper/95 text-ink shadow-[0_8px_20px_-8px_rgb(0_0_0/0.5)]">
                                <ZoomIcon />
                              </span>
                            </span>
                          </button>
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-normal text-ink">{p.name}</span>
                              <span className="t-label mt-0.5 inline-block rounded-full bg-brass/12 px-2 py-0.5 text-[9px] text-brass-ink">
                                {badgeFor(p)}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemove(p.key)}
                              aria-label={`Remove ${p.name} from compare`}
                              className="shrink-0 text-[11px] text-ink-3 hover:text-ink"
                            >
                              ×
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row, i) => (
                      <tr key={row.label} className={i % 2 === 1 ? 'bg-ink/3' : undefined}>
                        <th
                          scope="row"
                          className="t-label border-b border-hair py-2 pr-2 text-ink-3 font-normal"
                        >
                          <span className="flex items-center gap-1.5">
                            <row.icon />
                            {row.label}
                          </span>
                        </th>
                        {plans.map((p) => (
                          <td
                            key={p.key}
                            className={`border-b border-hair px-2 py-2 text-[12.5px] ${
                              row.label === 'Total' ? 'text-brass-ink' : 'text-ink'
                            }`}
                          >
                            {row.get(p)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default UnitCompare
