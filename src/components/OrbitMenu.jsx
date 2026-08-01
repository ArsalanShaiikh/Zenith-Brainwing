import { useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { MENU_ITEMS } from '../lib/views'
import DownloadSelection from './DownloadSelection'

/** Per-row copy. Same figures as the old menu page — the sheet no longer swaps
 *  a background plate on hover, so these carry all the flavour now. */
const META = {
  views: { blurb: 'Four vantages, ground to crown', stat: '168 m' },
  amenities: { blurb: 'Ten thousand square feet of amenity', stat: '12 spaces' },
  location: { blurb: 'Balkum, and everything from it', stat: '1.2 km' },
  floorplan: { blurb: 'Nine plates, 3 BHK and Jodi', stat: '9 plates' },
  gallery: { blurb: 'The renders, ground to sky', stat: '23 frames' },
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
      <div className="flex min-h-full w-full items-center p-3 sm:p-4 md:p-5 lg:p-6 3xl:p-9">
        {/* Sized to hold six rows, a download action and the figure strip
            without ever needing to scroll — the sixth row (Gallery) is what
            pushed the old measures past the frame on short viewports. Width is
            a vw clamp from lg up so the box keeps the same *share* of the frame
            from 1024 to 3840 rather than a fixed slab. */}
        <div
          ref={sheetRef}
          className={[
            'glass pointer-events-auto w-full text-ink',
            'max-w-[400px] px-3.5 py-3 sm:max-w-[420px] sm:px-4 sm:py-3.5',
            'md:max-w-[440px] md:px-4.5 md:py-4',
            'lg:w-[clamp(320px,21vw,620px)] lg:max-w-none',
            'lg:px-[clamp(16px,1.1vw,30px)] lg:py-[clamp(13px,0.9vw,24px)]',
            'short:px-3 short:py-2',
          ].join(' ')}
        >
          <DownloadSelection />

          <ul className="py-0.5">
            {MENU_ITEMS.map((v, i) => (
              <li key={v.id}>
                <button
                  type="button"
                  ref={(el) => (rowRefs.current[i] = el)}
                  data-menu-row={v.id}
                  onClick={() => onSelect(v.id)}
                  className={[
                    'group relative flex w-full items-center gap-2.5 overflow-hidden',
                    'border-b border-ink/12 py-2 text-left last:border-b-0 md:gap-3 md:py-2.5',
                    'lg:gap-[clamp(8px,0.65vw,17px)] lg:py-[clamp(7px,0.52vw,14px)]',
                    'short:py-1',
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

                  <span className="t-fig relative w-4.5 shrink-0 text-[9px] text-ink-3 transition-colors duration-300 group-hover:text-brass-ink lg:w-[clamp(16px,1.15vw,28px)] lg:text-[clamp(9px,0.45vw,12px)]">
                    {v.num}
                  </span>

                  <span className="relative min-w-0 flex-1">
                    {/* Two lines of type rolling inside a one-line mask. */}
                    <span className="block h-[1.15em] overflow-hidden text-[15px] leading-[1.15] md:text-[16.5px] lg:text-[clamp(15px,1vw,29px)]">
                      <span className="block transition-transform duration-500 ease-zenith group-hover:-translate-y-1/2 group-focus-visible:-translate-y-1/2">
                        <span className="block font-light leading-[1.15] tracking-[-0.015em] text-ink-2">
                          {v.label}
                        </span>
                        <span className="block font-normal leading-[1.15] tracking-[-0.015em] text-ink">
                          {v.label}
                        </span>
                      </span>
                    </span>
                    <span className="mt-px block truncate text-[9.5px] font-light leading-[1.3] text-ink-3 md:text-[10px] lg:text-[clamp(9.5px,0.5vw,14px)] short:hidden">
                      {META[v.id].blurb}
                    </span>
                  </span>

                  <span className="relative flex shrink-0 items-center gap-2">
                    <span className="hidden text-[8.5px] font-normal uppercase leading-none tracking-[0.14em] text-ink-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block lg:text-[clamp(8.5px,0.42vw,11px)]">
                      {META[v.id].stat}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 fill-none stroke-current stroke-[1.4] text-ink-3 transition-[transform,color] duration-400 ease-zenith group-hover:translate-x-1 group-hover:text-brass-ink lg:h-[clamp(13px,0.85vw,19px)] lg:w-[clamp(13px,0.85vw,19px)]"
                    >
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-ink/14 pt-2.5 sm:grid-cols-4 lg:pt-[clamp(9px,0.65vw,17px)] short:hidden">
            {FACTS.map(([k, val]) => (
              <div key={k} className="flex flex-col">
                <span className="text-[8px] uppercase leading-none tracking-[0.14em] text-ink-3 lg:text-[clamp(8px,0.4vw,11px)]">
                  {k}
                </span>
                <span className="t-fig mt-0.5 text-[11.5px] leading-none text-ink lg:text-[clamp(11.5px,0.7vw,17px)]">
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
