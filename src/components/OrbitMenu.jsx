import { useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { VIEWS } from '../lib/views'

/** Per-row copy. Same figures as the old menu page — the sheet no longer swaps
 *  a background plate on hover, so these carry all the flavour now. */
const META = {
  views: { blurb: 'Four vantages, ground to crown', stat: '168 m' },
  amenities: { blurb: 'Ten thousand square feet of amenity', stat: '12 spaces' },
  location: { blurb: 'Balkum, and everything from it', stat: '1.2 km' },
  floorplan: { blurb: 'Nine plates, 3 BHK and Jodi', stat: '9 plates' },
  enquire: { blurb: 'Request the drawing set', stat: 'Direct' },
}

const FACTS = [
  ['Height', '168 m'],
  ['Levels', '52'],
  ['Config', '3 BHK'],
  ['Possession', '2029'],
]

/**
 * The menu, now living *on* the orbit rather than on its own screen. It sits on
 * the left over the landing frame and shows only there. There are no background
 * plates and no image-swap on hover any more — just the row's own roll + brass
 * wash. `show` drives the slide-in / slide-out; `onSelect(id)` hands the choice
 * back to Landing, which decides between an in-orbit mode and a routed page.
 */
const OrbitMenu = ({ show, onSelect }) => {
  const rootRef = useRef(null)
  const sheetRef = useRef(null)
  const rowRefs = useRef([])

  useGSAP(
    () => {
      const root = rootRef.current
      const sheet = sheetRef.current
      const rows = rowRefs.current.filter(Boolean)
      if (!root || !sheet) return

      if (prefersReducedMotion()) {
        gsap.set(root, { autoAlpha: show ? 1 : 0 })
        gsap.set([sheet, ...rows], { opacity: 1, x: 0 })
        return
      }

      if (show) {
        gsap.set(sheet, { autoAlpha: 0, x: -26 })
        gsap.set(rows, { opacity: 0, x: -18 })
        gsap
          .timeline()
          .to(root, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0)
          .to(sheet, { autoAlpha: 1, x: 0, duration: 0.85, ease: 'zenith' }, 0)
          .to(
            rows,
            { opacity: 1, x: 0, duration: 0.6, ease: 'zenith', stagger: 0.05 },
            '-=0.58',
          )
      } else {
        gsap.to(sheet, { autoAlpha: 0, x: -22, duration: 0.4, ease: 'power2.in' })
        gsap.to(root, { autoAlpha: 0, duration: 0.4, ease: 'power2.in' })
      }
    },
    { dependencies: [show], scope: rootRef },
  )

  return (
    <div
      ref={rootRef}
      data-orbit-menu
      className="pointer-events-none absolute inset-0 z-30 flex opacity-0"
    >
      <div className="flex min-h-full w-full items-center p-3 sm:p-4 md:p-6 lg:p-8 3xl:p-12">
        <div
          ref={sheetRef}
          className={[
            'glass pointer-events-auto w-full text-ink',
            'max-w-[520px] px-5 py-4 sm:px-6 sm:py-5 md:max-w-[560px] md:px-7 md:py-6',
            'lg:w-[clamp(360px,27vw,880px)] lg:max-w-none',
            'lg:px-[clamp(24px,1.7vw,44px)] lg:py-[clamp(18px,1.35vw,36px)]',
            'short:px-4 short:py-2.5',
          ].join(' ')}
        >
          <ul className="py-1">
            {VIEWS.map((v, i) => (
              <li key={v.id}>
                <button
                  type="button"
                  ref={(el) => (rowRefs.current[i] = el)}
                  data-menu-row={v.id}
                  onClick={() => onSelect(v.id)}
                  className={[
                    'group relative flex w-full items-center gap-3 overflow-hidden',
                    'border-b border-ink/12 py-3 text-left last:border-b-0 md:gap-4 md:py-3.5',
                    'lg:gap-[clamp(12px,1vw,26px)] lg:py-[clamp(12px,0.95vw,26px)]',
                    'short:py-1.5',
                  ].join(' ')}
                >
                  {/* Ink wash + brass rule sweeping in from the left edge —
                      the whole hover effect now, no plate behind it. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 origin-left scale-x-0 bg-ink/8 transition-transform duration-500 ease-zenith group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-brass transition-transform duration-500 ease-zenith group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  />

                  <span className="t-fig relative w-6 shrink-0 text-[10px] text-ink-3 transition-colors duration-300 group-hover:text-brass-ink lg:w-[clamp(24px,1.8vw,44px)] lg:text-[clamp(10px,0.62vw,15px)]">
                    {v.num}
                  </span>

                  <span className="relative min-w-0 flex-1">
                    {/* Two lines of type rolling inside a one-line mask. */}
                    <span className="block h-[1.15em] overflow-hidden text-[19px] leading-[1.15] md:text-[22px] lg:text-[clamp(19px,1.5vw,42px)]">
                      <span className="block transition-transform duration-500 ease-zenith group-hover:-translate-y-1/2 group-focus-visible:-translate-y-1/2">
                        <span className="block font-light leading-[1.15] tracking-[-0.015em] text-ink-2">
                          {v.label}
                        </span>
                        <span className="block font-normal leading-[1.15] tracking-[-0.015em] text-ink">
                          {v.label}
                        </span>
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-light text-ink-3 md:text-[12px] lg:text-[clamp(11px,0.72vw,17px)] short:hidden">
                      {META[v.id].blurb}
                    </span>
                  </span>

                  <span className="relative flex shrink-0 items-center gap-2.5">
                    <span className="t-label hidden text-ink-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
                      {META[v.id].stat}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.4] text-ink-3 transition-[transform,color] duration-400 ease-zenith group-hover:translate-x-1 group-hover:text-brass-ink lg:h-[clamp(16px,1.1vw,26px)] lg:w-[clamp(16px,1.1vw,26px)]"
                    >
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink/14 pt-3.5 sm:grid-cols-4 lg:pt-[clamp(14px,1vw,26px)] short:hidden">
            {FACTS.map(([k, val]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-[0.14em] text-ink-3 lg:text-[clamp(9px,0.55vw,13px)]">
                  {k}
                </span>
                <span className="t-fig text-[14px] text-ink lg:text-[clamp(14px,0.95vw,22px)]">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrbitMenu
