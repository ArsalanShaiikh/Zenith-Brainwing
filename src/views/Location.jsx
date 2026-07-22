import { useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { srcSet, fallbackSrc } from '../lib/images'

const GROUPS = [
  {
    id: 'connect',
    label: 'Connectivity',
    items: [
      { id: 'ghodbunder', name: 'Ghodbunder Road', dist: '1.2', img: 'loc-1' },
      { id: 'station', name: 'Thane Station', dist: '4.1', img: 'loc-3' },
      { id: 'airoli', name: 'Airoli Bridge', dist: '9.6', img: 'loc-5' },
    ],
  },
  {
    id: 'everyday',
    label: 'Everyday',
    items: [
      { id: 'viviana', name: 'Viviana Mall', dist: '3.4', img: 'loc-2' },
      { id: 'jupiter', name: 'Jupiter Hospital', dist: '5.0', img: 'loc-4' },
      { id: 'bkc', name: 'BKC', dist: '24', img: 'loc-6' },
    ],
  },
]

const ALL = GROUPS.flatMap((g) => g.items)

const Location = ({ active }) => {
  const rootRef = useRef(null)
  const plateRefs = useRef([])
  const [cur, setCur] = useState(null)

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const show = contextSafe((idx) => {
    setCur(idx)
    const plates = plateRefs.current.filter(Boolean)
    const target = plateRefs.current[idx]
    if (!target) return

    if (prefersReducedMotion()) {
      gsap.set(plates, { opacity: 0 })
      gsap.to(target, { opacity: 1, duration: 0.2, ease: 'none' })
      return
    }
    gsap.set(target, { zIndex: 2, opacity: 1, clipPath: 'inset(0% 0% 100% 0%)' })
    plates.forEach((p) => p !== target && gsap.set(p, { zIndex: 1 }))
    gsap.to(target, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.6,
      ease: 'expo.out',
      overwrite: 'auto',
    })
  })

  // eslint-disable-next-line react-hooks/refs
  const clear = contextSafe(() => {
    setCur(null)
    const plates = plateRefs.current.filter(Boolean)
    if (!plates.length) return
    gsap.to(plates, { opacity: 0, duration: 0.45, ease: 'zenith', overwrite: 'auto' })
  })

  return (
    <div
      ref={rootRef}
      className="grid h-full w-full min-h-0 grid-rows-[auto_minmax(0,1fr)] items-start gap-3 lg:grid-cols-[minmax(0,1fr)_clamp(240px,24vw,320px)] lg:grid-rows-1 lg:items-center lg:gap-10"
    >
      {/* Destination plates ride above the shared media layer, below the chrome. */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {ALL.map((d, i) => (
          <figure
            key={d.id}
            ref={(el) => (plateRefs.current[i] = el)}
            className="absolute inset-0 m-0 overflow-hidden opacity-0"
          >
            <picture className="block h-full w-full">
              <source type="image/avif" srcSet={srcSet(d.img, 'avif')} sizes="100vw" />
              <source type="image/webp" srcSet={srcSet(d.img, 'webp')} sizes="100vw" />
              <img
                className="h-full w-full object-cover"
                src={fallbackSrc(d.img)}
                srcSet={srcSet(d.img, 'jpg')}
                sizes="100vw"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </picture>
          </figure>
        ))}
      </div>

      <div className="relative z-1 flex max-w-[30ch] flex-col gap-1.5 text-paper [text-shadow:0_2px_22px_rgb(0_0_0/0.6)] lg:self-end lg:pb-5">
        <p data-reveal className="t-label flex items-center gap-2 text-paper/70 before:h-px before:w-3.5 before:bg-brass before:content-['']">
          03 &middot; Location
        </p>
        <h2 data-reveal data-view-heading tabIndex={-1} className="t-h2 outline-none short:hidden">
          Balkum, and everything from it
        </h2>
      </div>

      <div
        data-reveal-figure
        onPointerLeave={clear}
        className="card relative z-1 min-h-0 w-full self-stretch overflow-y-auto py-1.5 overscroll-contain lg:justify-self-end lg:self-auto lg:overflow-visible"
      >
        {GROUPS.map((g, gi) => (
          <section key={g.id} className={gi > 0 ? 'mt-1 border-t border-hair pt-1' : ''}>
            <h3 className="t-label px-4 pb-1 pt-2 text-ink-3">{g.label}</h3>
            <ul>
              {g.items.map((d) => {
                const idx = ALL.findIndex((x) => x.id === d.id)
                const on = cur === idx
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onPointerEnter={() => show(idx)}
                      onFocus={() => show(idx)}
                      onBlur={clear}
                      className={[
                        'flex w-full items-baseline justify-between gap-3.5 border-l-2 px-4 py-2 text-left',
                        'transition-colors duration-200 short:py-1',
                        on
                          ? 'border-brass bg-paper-2 text-ink'
                          : 'border-transparent text-ink-2 hover:border-brass hover:bg-paper-2 hover:text-ink',
                      ].join(' ')}
                    >
                      <span className="text-[13px] font-light">{d.name}</span>
                      <span className="flex items-baseline gap-1 whitespace-nowrap">
                        <span className="t-fig text-[15px] text-ink">{d.dist}</span>
                        <span className="t-label text-[9px] text-ink-3">km</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export default Location
