import { useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'

/** Areas transcribed from the MahaRERA-stamped sheets. */
const PLANS = [
  { id: 'unit-1', name: 'Unit 1', type: '3 BHK', carpet: '1097', balcony: '81', total: '1178' },
  { id: 'unit-2', name: 'Unit 2', type: '3 BHK', carpet: '1068', balcony: '110', total: '1178' },
  { id: 'unit-3', name: 'Unit 3', type: '3 BHK', carpet: '1017', balcony: '96', total: '1113' },
  { id: 'unit-4', name: 'Unit 4', type: '3 BHK', carpet: '1071', balcony: '107', total: '1178' },
  { id: 'unit-5', name: 'Unit 5', type: '3 BHK', carpet: '1030', balcony: '83', total: '1113' },
  { id: 'unit-6', name: 'Unit 6', type: '3 BHK', carpet: '1080', balcony: '98', total: '1178' },
  { id: 'jodi-1', name: 'Jodi 01–02', type: 'Combined', carpet: '2178', balcony: '191', total: '2369' },
  { id: 'jodi-2', name: 'Jodi 04–05', type: 'Combined', carpet: '2101', balcony: '190', total: '2291' },
  { id: 'typical', name: 'Typical plate', type: 'Full floor', carpet: '—', balcony: '—', total: '—' },
]

const src = (id, ext, w) => `/img/plans/${id}-${w}.${ext}`

const Floorplan = ({ active }) => {
  const rootRef = useRef(null)
  const sheetRef = useRef(null)
  const [i, setI] = useState(0)

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const pick = contextSafe((n) => {
    setI(n)
    const el = sheetRef.current
    if (!el || prefersReducedMotion()) return
    gsap.set(el, { opacity: 0, y: 10 })
    gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'zenith' })
  })

  const cur = PLANS[i]

  const SPECS = [
    ['RERA carpet', cur.carpet],
    ['Balcony', cur.balcony],
    ['Total', cur.total],
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
            04 &middot; Floorplan
          </p>
          <h2
            data-view-heading
            tabIndex={-1}
            className="t-h2 hidden outline-none lg:block short:lg:hidden"
          >
            Nine plates
          </h2>
        </div>

        <ul className="flex shrink-0 gap-1.5 overflow-x-auto overscroll-contain p-2 lg:min-h-0 lg:flex-col lg:gap-0 lg:overflow-y-auto lg:p-0 lg:py-1.5">
          {PLANS.map((p, n) => {
            const on = n === i
            return (
              <li key={p.id} className="shrink-0 lg:shrink lg:w-full">
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
                  <span className="t-label text-[9px] text-ink-3">{p.type}</span>
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
          <source
            type="image/webp"
            srcSet={`${src(cur.id, 'webp', 960)} 960w, ${src(cur.id, 'webp', 1600)} 1600w`}
            sizes="(max-width:1024px) 92vw, 62vw"
          />
          <img
            data-plan-img
            className="h-full w-full object-contain"
            src={src(cur.id, 'jpg', 1600)}
            srcSet={`${src(cur.id, 'jpg', 960)} 960w, ${src(cur.id, 'jpg', 1600)} 1600w`}
            sizes="(max-width:1024px) 92vw, 62vw"
            alt={`${cur.name} floor plan, ${cur.type}`}
            decoding="async"
            loading="lazy"
          />
        </picture>
      </figure>
    </div>
  )
}

export default Floorplan
