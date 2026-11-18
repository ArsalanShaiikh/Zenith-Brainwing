import { useRef, useState, useEffect } from 'react'
import { client } from '../sanity/client'
import { urlFor } from '../sanity/image'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { trackFloorPlanView, trackFloorPlanSelect } from '../lib/analytics'
import { FLOOR_PLANS, sqft } from '../lib/floorplans'

/**
 * What the view shows when the CMS can't answer — Sanity unconfigured in this
 * build, offline, or an empty document. Same shape as the Sanity query below,
 * built from the MahaRERA areas and sheets the site already ships in
 * lib/floorplans.js and public/img/plans, so the view is never blank.
 */
const BUNDLED = {
  heading: 'Floor plans',
  title: 'Residences at Zenith',
  plans: FLOOR_PLANS.map((p) => ({
    _key: p.key,
    name: p.name,
    subtitle: p.config || p.band || '',
    reraCarpet: p.carpet ? sqft(p.carpet.sqft) : '—',
    balcony: p.balcony ? sqft(p.balcony.sqft) : '—',
    totalArea: p.total ? sqft(p.total.sqft) : '—',
    imageUrl: `${p.base}-1600.webp`,
  })),
}

const Floorplan = ({ active }) => {
  const rootRef = useRef(null)
  const sheetRef = useRef(null)
  const [i, setI] = useState(0)
  const [plans, setPlans] = useState([])
const [heading, setHeading] = useState("")
const [title, setTitle] = useState("")

useEffect(() => {
  let live = true
  const applyBundled = () => {
    if (!live) return
    setHeading(BUNDLED.heading)
    setTitle(BUNDLED.title)
    setPlans(BUNDLED.plans)
  }
  client
    .fetch(`
      *[_type=="zenithSite"][0]{
        floorplan{
          heading,
          description,
          plans[]{
            _key,
            name,
            subtitle,
            reraCarpet,
            balcony,
            totalArea,
            image{
              asset->
            }
          }
        }
      }
    `)
    .then((data) => {
      const fp = data?.floorplan
      if (!fp?.plans?.length) return applyBundled()
      if (!live) return
      setHeading(fp.heading || BUNDLED.heading)
      setTitle(fp.description || BUNDLED.title)
      setPlans(fp.plans)
    })
    .catch((err) => {
      console.warn('[floorplan] CMS unavailable, using bundled plans:', err?.message || err)
      applyBundled()
    })
  return () => {
    live = false
  }
}, [])


  useViewReveal(active, rootRef)

  useEffect(() => {
    if (active) trackFloorPlanView()
  }, [active])
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const pick = contextSafe((n) => {
    if (n !== i) trackFloorPlanSelect(plans[n]?.name)
    setI(n)
    const el = sheetRef.current
    if (!el || prefersReducedMotion()) return
    gsap.set(el, { opacity: 0, y: 10 })
    gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'zenith' })
  })

  const cur = plans[i]
  if (!cur) return null;

const SPECS = [
  ['RERA Carpet', cur.reraCarpet],
  ['Balcony', cur.balcony],
  ['Total', cur.totalArea],
]


  return (
    <div
      ref={rootRef}
      className="grid h-full w-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 lg:grid-cols-[clamp(196px,17vw,240px)_minmax(0,1fr)] lg:grid-rows-1 lg:gap-4"
    >
      {/* Selector. A horizontal chip rail below lg, a vertical list above. */}
      <aside
        data-reveal-figure
        className="card flex min-h-0 flex-col overflow-hidden lg:max-h-full lg:self-start"
      >
        <div className="flex flex-col gap-1.5 border-b border-hair px-4 py-2.5 lg:px-4 lg:py-3.5">
          <p className="t-label flex items-center gap-2 text-ink-3 before:h-px before:w-3.5 before:bg-brass before:content-['']">
           {heading}
          </p>
          <h2
            data-view-heading
            tabIndex={-1}
            className="t-h2 hidden outline-none lg:block short:lg:hidden"
          >
            {title}
          </h2>
        </div>

        <ul className="flex shrink-0 gap-1.5 overflow-x-auto overscroll-contain p-2 lg:min-h-0 lg:flex-col lg:gap-0 lg:overflow-y-auto lg:p-0 lg:py-1.5">
          {plans.map((p, n) => {
            const on = n === i
            return (
              <li key={p._key} className="shrink-0 lg:shrink lg:w-full">
                <button
                  type="button"
                  onClick={() => pick(n)}
                  aria-current={on ? 'true' : undefined}
                  className={[
                    'flex w-full flex-col gap-px whitespace-nowrap rounded-tile px-3 py-1.5 text-left transition-colors duration-200',
                    'lg:rounded-none lg:border-l-2 lg:px-4 lg:py-1.5 3xl:py-2',
                    on
                      ? 'bg-ink/8 text-ink lg:border-brass'
                      : 'text-ink-2 hover:bg-ink/6 lg:border-transparent',
                  ].join(' ')}
                >
                  <span className={`text-[12px] lg:text-[13px] ${on ? 'font-normal' : 'font-light'}`}>
                    {p.name}
                  </span>
                  <span className="t-label text-[9px] text-ink-3">{p.subtitle}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <dl
          aria-live="polite"
          className="flex shrink-0 gap-4 border-t border-hair px-4 py-2 short:hidden lg:flex-col lg:gap-0 lg:px-4 lg:pb-3 lg:pt-1"
        >
          {SPECS.map(([k, v], n) => (
            <div
              key={k}
              className={[
                'flex flex-col items-start gap-px py-0.5',
                'lg:flex-row lg:items-baseline lg:justify-between lg:gap-2.5 lg:py-1.5',
                n > 0 ? 'lg:border-t lg:border-hair' : '',
              ].join(' ')}
            >
              <dt className="t-label text-ink-3">{k}</dt>
              <dd className={`t-fig m-0 text-[15px] ${k === 'Total' ? 'text-brass-ink' : 'text-ink'}`}>
                {v}
                <span className="ml-0.5 font-ui text-[9px] uppercase tracking-widest text-ink-3">
                  sq ft
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* The sheets are documents: they must fit whole, never crop. Stretching
          the picture (rather than centring it) gives height:100% something
          definite to resolve against, so the plan cannot overflow its card. */}
      <figure
        ref={sheetRef}
        data-reveal-figure
        data-plan-sheet
        className="card m-0 grid min-h-0 grid-rows-[minmax(0,1fr)] p-2.5 md:p-4 lg:p-4 3xl:p-6"
      >
        <picture className="block h-full min-h-0 w-full min-w-0">
      <div className="relative w-full h-full overflow-hidden rounded-lg bg-white">
  <img
    src={cur.imageUrl || urlFor(cur.image).width(1600).url()}
    alt={cur.name}
    className="w-full h-full object-contain"
  />
</div>


        </picture>
      </figure>
    </div>
  )
}

export default Floorplan
