import { useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { VIEWS } from '../lib/views'
import { srcSet, fallbackSrc } from '../lib/images'
import Logo from './Logo'

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

const Menu = ({ onPick, onHome }) => {
  const rootRef = useRef(null)
  const coverRef = useRef(null)
  const sheetRef = useRef(null)
  const rowRefs = useRef([])
  const plateRefs = useRef([])
  const [hot, setHot] = useState(0)

  // Entrance. The paper cover is inherited from the landing gate and wiped
  // off here, so the hand-over reads as one continuous surface rather than a
  // cut between two screens.
  useGSAP(
    () => {
      const rows = rowRefs.current.filter(Boolean)
      const cover = coverRef.current

      if (prefersReducedMotion()) {
        gsap.set(cover, { autoAlpha: 0 })
        gsap.set([sheetRef.current, ...rows], { opacity: 1, x: 0, y: 0 })
        return
      }

      gsap.set(cover, { clipPath: 'inset(0% 0% 0% 0%)' })
      gsap.set(sheetRef.current, { opacity: 0, x: -26 })
      gsap.set(rows, { opacity: 0, x: -18 })

      gsap
        .timeline()
        .to(cover, {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: 1,
          ease: 'expo.inOut',
        })
        .to(sheetRef.current, { opacity: 1, x: 0, duration: 0.8, ease: 'zenith' }, '-=0.6')
        .to(
          rows,
          { opacity: 1, x: 0, duration: 0.65, ease: 'zenith', stagger: 0.055 },
          '-=0.5',
        )
    },
    { scope: rootRef },
  )

  // Cross-swap the plate behind the sheet.
  useGSAP(
    () => {
      const plates = plateRefs.current.filter(Boolean)
      const target = plateRefs.current[hot]
      if (!target) return

      if (prefersReducedMotion()) {
        plates.forEach((p) => gsap.set(p, { opacity: p === target ? 1 : 0 }))
        return
      }
      gsap.set(target, { zIndex: 2 })
      plates.forEach((p) => p !== target && gsap.set(p, { zIndex: 1 }))
      gsap.to(target, { opacity: 1, duration: 0.8, ease: 'zenith', overwrite: 'auto' })
      gsap.to(
        plates.filter((p) => p !== target),
        { opacity: 0, duration: 0.8, ease: 'zenith', overwrite: 'auto' },
      )
    },
    { dependencies: [hot], scope: rootRef },
  )

  // Wipe the paper back on, then route. The next screen is painted behind a
  // full cover, so nothing of the outgoing menu is ever visible under it.
  const leave = (done) => {
    if (prefersReducedMotion()) {
      done()
      return
    }
    gsap.set(coverRef.current, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1 })
    gsap.to(coverRef.current, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.62,
      ease: 'expo.inOut',
      onComplete: done,
    })
  }

  const exit = (id) => leave(() => onPick(id))
  const goHome = () => leave(() => onHome?.())

  return (
    <div
      ref={rootRef}
      data-menu
      className="fixed inset-0 z-90 bg-void p-2 sm:p-2.5 lg:p-3 3xl:p-4"
    >
      <div className="relative h-full w-full overflow-hidden rounded-plate bg-void">
        {/* plates */}
        <div className="absolute inset-0" aria-hidden="true">
          {VIEWS.map((v, i) => (
            <figure
              key={v.id}
              ref={(el) => (plateRefs.current[i] = el)}
              className="absolute inset-0 m-0"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <picture className="block h-full w-full">
                <source type="image/avif" srcSet={srcSet(v.img, 'avif')} sizes="100vw" />
                <source type="image/webp" srcSet={srcSet(v.img, 'webp')} sizes="100vw" />
                <img
                  className="h-full w-full object-cover"
                  src={fallbackSrc(v.img)}
                  srcSet={srcSet(v.img, 'jpg')}
                  sizes="100vw"
                  alt=""
                  decoding="async"
                />
              </picture>
            </figure>
          ))}
          <div className="absolute inset-0 z-4 bg-[#33404d] opacity-55 mix-blend-multiply" />
          {/* Weighted left, but only lightly. The sheet over this side is
              translucent, so every point of darkness here comes straight
              through it and drags the small labels down — at 0.72 the type
              measured 4.15:1. The tower still has to read through the middle. */}
          <div className="absolute inset-0 z-5 bg-[linear-gradient(to_right,rgb(11_10_8/0.5)_0%,rgb(11_10_8/0.3)_38%,rgb(11_10_8/0.12)_62%,rgb(11_10_8/0.4)_100%)]" />
        </div>

        <div className="grain pointer-events-none absolute -inset-1/2 z-6 opacity-[0.045] mix-blend-overlay" aria-hidden="true" />

        {/* Sheet — left, never over the tower.
            The alignment lives on an inner min-h-full wrapper rather than on
            the scroll container itself: aligning to end (or centre) directly
            on an overflow container makes the overflowing top unreachable,
            so on a short screen the first rows could not be scrolled to. */}
        <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain">
          <div className="flex min-h-full items-end p-3 sm:p-4 md:p-6 lg:items-center lg:p-8 3xl:p-12">
          {/* Fluid, not stepped. Fixed px widths meant the sheet stayed the
              same absolute size at every breakpoint, so it swallowed a small
              screen and looked lost on a 4K one. From lg up the width and
              every inner measure are vw-based clamps, so the panel occupies
              the same *share* of the frame at 1280 as at 3840. Below lg it
              goes full width, where a proportional panel would be too narrow
              to read. The clamp minimums double as the phone/tablet sizes. */}
          <div
            ref={sheetRef}
            className={[
              'glass w-full text-ink',
              'max-w-[520px] px-5 py-4 sm:px-6 sm:py-5 md:max-w-[560px] md:px-7 md:py-6',
              'lg:w-[clamp(360px,27vw,880px)] lg:max-w-none',
              'lg:px-[clamp(24px,1.7vw,44px)] lg:py-[clamp(18px,1.35vw,36px)]',
              'short:px-4 short:py-2.5',
            ].join(' ')}
          >
            <div className="flex items-end justify-between gap-4 border-b border-ink/14 pb-4 lg:pb-[clamp(14px,1vw,26px)] short:gap-2 short:pb-2">
              <div className="flex items-end gap-3.5">
                <Logo
                  width={140}
                  className="w-15 shrink-0 sm:w-17 md:w-20 lg:w-[clamp(60px,4.4vw,124px)] short:w-11"
                />
                <span className="font-fine text-[26px] leading-none tracking-[-0.01em] text-ink md:text-[30px] lg:text-[clamp(26px,2vw,52px)] short:text-[20px]">
                  Zenith
                </span>
              </div>
              <span className="t-label hidden text-ink-3 sm:block">Select</span>
            </div>

            <ul className="py-1">
              {VIEWS.map((v, i) => {
                const on = hot === i
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      ref={(el) => (rowRefs.current[i] = el)}
                      data-menu-row={v.id}
                      onPointerEnter={() => setHot(i)}
                      onFocus={() => setHot(i)}
                      onClick={() => exit(v.id)}
                      className={[
                        'group relative flex w-full items-center gap-3 overflow-hidden',
                        'border-b border-ink/12 py-3 text-left last:border-b-0 md:gap-4 md:py-3.5',
                        'lg:gap-[clamp(12px,1vw,26px)] lg:py-[clamp(12px,0.95vw,26px)]',
                        'short:py-1.5',
                      ].join(' ')}
                    >
                      {/* Brass wash sweeping in from the left edge. */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 origin-left scale-x-0 bg-ink/8 transition-transform duration-500 ease-zenith group-hover:scale-x-100 group-focus-visible:scale-x-100"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-brass transition-transform duration-500 ease-zenith group-hover:scale-x-100 group-focus-visible:scale-x-100"
                      />

                      <span
                        className={`t-fig relative w-6 shrink-0 text-[10px] transition-colors duration-300 lg:w-[clamp(24px,1.8vw,44px)] lg:text-[clamp(10px,0.62vw,15px)] ${
                          on ? 'text-brass-ink' : 'text-ink-3'
                        }`}
                      >
                        {v.num}
                      </span>

                      <span className="relative min-w-0 flex-1">
                        {/* The label rolls: the resting copy lifts out while a
                            duplicate rises into its place. Two lines of type
                            moving together inside a one-line mask — it reads
                            as a mechanism, not a hover state.
                            The mask carries the font-size so its 1.15em
                            height resolves to exactly one line; the track is
                            two lines tall, so translating it half its height
                            advances by precisely one. */}
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
                )
              })}
            </ul>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink/14 pt-3.5 sm:grid-cols-4 lg:pt-[clamp(14px,1vw,26px)] short:hidden">
              {FACTS.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-ink-3 lg:text-[clamp(9px,0.55vw,13px)]">
                    {k}
                  </span>
                  <span className="t-fig text-[14px] text-ink lg:text-[clamp(14px,0.95vw,22px)]">{v}</span>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* Home — back to the landing gate. Mirrors the shell's back button,
            but on the right so it never collides with the sheet. */}
        <button
          type="button"
          onClick={goHome}
          aria-label="Back to home"
          className={[
            'absolute right-2 top-2 z-40 grid h-9 w-9 place-items-center rounded-full',
            'glass-surface shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)]',
            'transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100',
            'touch:h-11 touch:w-11', // ≥44px tap target on touch devices
            'sm:right-2.5 sm:top-2.5 md:right-5 md:top-5 md:h-10 md:w-10',
            'lg:right-3 lg:top-3 3xl:right-4 3xl:top-4 3xl:h-11 3xl:w-11',
          ].join(' ')}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.5]">
            <path d="M3 10.5 12 4l9 6.5" />
            <path d="M5.5 9.5V20h13V9.5" />
            <path d="M9.75 20v-5.5h4.5V20" />
          </svg>
        </button>

        {/* Paper cover — inherited from the gate on the way in, wiped back on
            the way out. */}
        <div
          ref={coverRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-50 bg-paper"
        />
      </div>
    </div>
  )
}

export default Menu
