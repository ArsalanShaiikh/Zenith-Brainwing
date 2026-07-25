import { useRef, useState,useEffect } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { VIEWS } from '../lib/views'
import { srcSet, fallbackSrc } from '../lib/images'
import Logo from './Logo'
import { client } from "../sanity/client";
import { urlFor } from "../sanity/image";

const META = {
  views: { blurb: 'Four vantages, ground to crown', stat: '168 m' },
  amenities: { blurb: 'Ten thousand square feet, above the city', stat: '12 spaces' },
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

const Menu = ({ onPick }) => {
  const rootRef = useRef(null)
  const coverRef = useRef(null)
  const sheetRef = useRef(null)
  const railRef = useRef(null)
  const rowRefs = useRef([])
  const plateRefs = useRef([])
  const [hot, setHot] = useState(0)

  const [homepage, setHomepage] = useState(null);

useEffect(() => {
  client
    .fetch(`*[_type=="zenithSite"][0]{homepage}`)
    .then((data) => {
      console.log("DATA:", data);
      console.log("HOMEPAGE:", data.homepage);
      console.log("BACKGROUND:", data.homepage?.backgroundImage);

      setHomepage(data.homepage);
    })
    .catch((err) => console.error(err));
}, []);

  // Entrance. The paper cover is inherited from the landing gate and wiped
  // off here, so the hand-over reads as one continuous surface rather than a
  // cut between two screens.
  useGSAP(
    () => {
      const rows = rowRefs.current.filter(Boolean)
      const cover = coverRef.current

      if (prefersReducedMotion()) {
        gsap.set(cover, { autoAlpha: 0 })
        gsap.set([sheetRef.current, railRef.current, ...rows], { opacity: 1, x: 0, y: 0 })
        return
      }

      gsap.set(cover, { clipPath: 'inset(0% 0% 0% 0%)' })
      gsap.set(sheetRef.current, { opacity: 0, x: -26 })
      gsap.set(railRef.current, { opacity: 0, y: 14 })
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
        .to(railRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'zenith' }, '-=0.4')
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

  const exit = (id) => {
    if (prefersReducedMotion()) {
      onPick(id)
      return
    }
    // Wipe the paper back on, then route. The next screen is painted behind a
    // full cover, so nothing of the outgoing menu is ever visible under it.
    gsap.set(coverRef.current, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1 })
    gsap.to(coverRef.current, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.62,
      ease: 'expo.inOut',
      onComplete: () => onPick(id),
    })
  }

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
             {v.id === "views" && homepage?.backgroundImage ? (
  <img
    className="h-full w-full object-cover"
    src={urlFor(homepage.backgroundImage).url()}
    alt=""
    decoding="async"
  />
) : (
  <picture className="block h-full w-full">
    <source
      type="image/avif"
      srcSet={srcSet(v.img, "avif")}
      sizes="100vw"
    />
    <source
      type="image/webp"
      srcSet={srcSet(v.img, "webp")}
      sizes="100vw"
    />
    <img
      className="h-full w-full object-cover"
      src={fallbackSrc(v.img)}
      alt=""
      decoding="async"
    />
  </picture>
)}
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
          <div
            ref={sheetRef}
            className="glass w-full max-w-110 px-5 py-4 text-ink sm:px-6 sm:py-5 md:max-w-120 md:px-7 md:py-6 3xl:max-w-140 3xl:px-9 3xl:py-8"
          >
            <div className="flex items-end justify-between gap-4 border-b border-ink/14 pb-4">
              <div className="flex items-end gap-3.5">
                <Logo width={104} className="w-15 shrink-0 sm:w-17 md:w-20" />
                <span className="font-fine text-[26px] leading-none tracking-[-0.01em] text-ink md:text-[30px]">
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
                      className="group relative flex w-full items-center gap-3 overflow-hidden border-b border-ink/12 py-3 text-left last:border-b-0 md:gap-4 md:py-3.5"
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
                        className={`t-fig relative w-6 shrink-0 text-[10px] transition-colors duration-300 ${
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
                        <span className="block h-[1.15em] overflow-hidden text-[19px] leading-[1.15] md:text-[22px] 3xl:text-[25px]">
                          <span className="block transition-transform duration-500 ease-zenith group-hover:-translate-y-1/2 group-focus-visible:-translate-y-1/2">
                            <span className="block font-light leading-[1.15] tracking-[-0.015em] text-ink-2">
                              {v.label}
                            </span>
                            <span className="block font-normal leading-[1.15] tracking-[-0.015em] text-ink">
                              {v.label}
                            </span>
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-light text-ink-3 md:text-[12px]">
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
                          className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.4] text-ink-3 transition-[transform,color] duration-400 ease-zenith group-hover:translate-x-1 group-hover:text-brass-ink"
                        >
                          <path d="M4 12h15M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink/14 pt-3.5 sm:grid-cols-4 short:hidden">
              {FACTS.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-ink-3">
                    {k}
                  </span>
                  <span className="t-fig text-[14px] text-ink">{v}</span>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* Right-hand rail: keeps the frame from reading as one lonely card
            without putting anything over the tower. */}
        <div
          ref={railRef}
          className="pointer-events-none absolute bottom-4 right-4 z-10 hidden flex-col items-end gap-2 text-right lg:flex 3xl:bottom-6 3xl:right-6"
        >
          <span className="t-label text-paper/70 [text-shadow:0_1px_10px_rgb(0_0_0/0.8)]">
            Runwal Zenith
          </span>
          <span className="text-[9px] uppercase tracking-[0.16em] text-paper/45 [text-shadow:0_1px_10px_rgb(0_0_0/0.8)]">
            MahaRERA P51700046734
          </span>
          <span className="font-fine text-[12px] italic text-brass-lift [text-shadow:0_1px_10px_rgb(0_0_0/0.8)]">
            With you, always
          </span>
        </div>

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
