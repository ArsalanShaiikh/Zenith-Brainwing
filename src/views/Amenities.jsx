import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { srcSet, fallbackSrc } from '../lib/images'

/** `short` marks the three tiles that survive the short-viewport cut. */
const TILES = [
  { id: 'club', name: 'Club Z', sub: 'Skydeck lounge', level: 'L52', img: 'am-1', short: true,
    area: 'col-start-1 col-end-7 row-start-1 row-end-6 md:col-end-8 md:row-end-4 lg:col-end-7 lg:row-end-6 short:col-end-6 short:row-end-5' },
  { id: 'bar', name: 'Sunset Bar', sub: 'Open deck', level: 'L52', img: 'am-2', short: true,
    area: 'col-start-7 col-end-13 row-start-1 row-end-4 md:col-start-8 md:row-end-3 lg:col-start-7 lg:row-end-4 short:col-start-6 short:row-end-3' },
  { id: 'lawn', name: 'The Lawn', sub: 'Podium garden', level: 'L05', img: 'am-3', short: false,
    area: 'col-start-7 col-end-10 row-start-4 row-end-7 md:col-start-8 md:col-end-13 md:row-start-3 md:row-end-5 lg:col-start-7 lg:col-end-10 lg:row-start-4 lg:row-end-7' },
  { id: 'pool', name: 'Infinity Pool', sub: 'Podium edge', level: 'L05', img: 'am-4', short: true,
    area: 'col-start-10 col-end-13 row-start-4 row-end-9 md:col-start-1 md:col-end-6 md:row-start-4 md:row-end-7 lg:col-start-10 lg:col-end-13 lg:row-start-4 lg:row-end-9 short:col-start-6 short:col-end-13 short:row-start-3 short:row-end-5' },
  { id: 'yoga', name: 'Nirvana', sub: 'Yoga deck', level: 'L51', img: 'am-5', short: false,
    area: 'col-start-1 col-end-7 row-start-6 row-end-9 md:col-start-6 md:col-end-13 md:row-start-5 md:row-end-7 lg:col-start-1 lg:col-end-7 lg:row-start-6 lg:row-end-9' },
]

const Amenities = ({ active }) => {
  const rootRef = useRef(null)
  const boxRef = useRef(null)
  const boxImgRef = useRef(null)
  const [open, setOpen] = useState(null)

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  const step = useCallback(
    (dir) => setOpen((n) => (n === null ? n : (n + dir + TILES.length) % TILES.length)),
    [setOpen],
  )

  // eslint-disable-next-line react-hooks/refs
  const animateSwap = contextSafe(() => {
    const img = boxImgRef.current
    if (!img || prefersReducedMotion()) return
    gsap.set(img, { opacity: 0, scale: 1.04 })
    gsap.to(img, { opacity: 1, scale: 1, duration: 0.7, ease: 'zenith' })
  })

  // Capture phase, so the view Observer never sees these while open.
  useEffect(() => {
    if (open === null) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, step])

  useGSAP(
    () => {
      const box = boxRef.current
      if (!box) return
      if (open === null) {
        gsap.set(box, { autoAlpha: 0 })
        return
      }
      if (prefersReducedMotion()) {
        gsap.set(box, { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)' })
        return
      }
      gsap.set(box, { autoAlpha: 1, clipPath: 'inset(0% 0% 100% 0%)' })
      gsap.to(box, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.out' })
      animateSwap()
    },
    { dependencies: [open], scope: rootRef },
  )

  useGSAP(() => animateSwap(), { dependencies: [open], scope: rootRef })

  const cur = open === null ? null : TILES[open]

  const iconBtn = [
    'glass-surface grid place-items-center rounded-full',
    'shadow-[0_14px_34px_-16px_rgb(0_0_0/0.6)]',
    'transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100',
  ].join(' ')

  return (
    <div ref={rootRef} className="grid h-full w-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 md:gap-4">
      <div
        className="flex max-w-[30ch] flex-col gap-1.5 text-paper [text-shadow:0_2px_22px_rgb(0_0_0/0.55)]"
      >
        <p data-reveal className="t-label flex items-center gap-2 text-paper/70 before:h-px before:w-3.5 before:bg-brass before:content-['']">
          02 &middot; Amenities
        </p>
        <h2
          data-reveal
          data-view-heading
          tabIndex={-1}
          className="t-h2 outline-none short:hidden"
        >
          Ten thousand square feet,
          <br className="hidden sm:inline" /> above the city
        </h2>
      </div>

      <div className="grid min-h-0 grid-cols-12 grid-rows-8 gap-1.5 md:grid-rows-6 md:gap-2 lg:grid-rows-8 lg:gap-2.5 short:grid-rows-4">
        {TILES.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOpen(i)}
            data-amen-tile={t.id}
            data-reveal-figure
            className={[
              'group relative min-h-0 overflow-hidden rounded-tile bg-void',
              t.area,
              t.short ? '' : 'short:hidden',
            ].join(' ')}
          >
            <picture className="block h-full w-full">
              <source type="image/avif" srcSet={srcSet(t.img, 'avif')} sizes="(max-width:768px) 60vw, 34vw" />
              <source type="image/webp" srcSet={srcSet(t.img, 'webp')} sizes="(max-width:768px) 60vw, 34vw" />
              <img
                className="h-full w-full object-cover transition-transform duration-900 ease-zenith group-hover:scale-[1.045]"
                src={fallbackSrc(t.img)}
                srcSet={srcSet(t.img, 'jpg')}
                sizes="(max-width:768px) 60vw, 34vw"
                alt={`${t.name} — ${t.sub}`}
                loading="lazy"
                decoding="async"
              />
            </picture>

            {/* Solid paper caption. Touch has no hover, so it sits open there. */}
            <span
              className={[
                'glass-surface absolute bottom-0 left-0 flex flex-col gap-px rounded-tr-tile px-2.5 py-1.5 text-left',
                'md:px-3 md:py-2',
                'translate-y-full transition-transform duration-500 ease-zenith',
                'group-hover:translate-y-0 group-focus-visible:translate-y-0',
                // Open by default on anything small or hover-less: on a phone
                // there is no hover to reveal them, and a narrow desktop
                // window has no room to guess from the image alone.
                'max-md:translate-y-0 touch:translate-y-0',
              ].join(' ')}
            >
              <span className="text-[11px] font-normal leading-tight md:text-[13px]">
                {t.name}
              </span>
              <span className="t-label hidden text-ink-3 md:block">{t.sub}</span>
            </span>

            <span className="chip absolute right-2 top-2 hidden h-[22px] px-2 text-[9px] text-ink-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
              {t.level}
            </span>
          </button>
        ))}
      </div>

      {/* Portalled to the body: the dock and status chip sit in higher stacking
          contexts than the view layer, so a viewer rendered in place would be
          painted underneath them however high its z-index. */}
      {createPortal(
        <div
          ref={boxRef}
          role="dialog"
          aria-modal="true"
          aria-label={cur ? `${cur.name}, ${cur.sub}` : 'Image viewer'}
          hidden={open === null}
          className="fixed inset-2 z-100 overflow-hidden rounded-plate bg-void sm:inset-2.5 lg:inset-3 3xl:inset-4"
        >
          {cur && (
            <>
              <picture className="block h-full w-full">
                <source type="image/avif" srcSet={srcSet(cur.img, 'avif')} sizes="100vw" />
                <source type="image/webp" srcSet={srcSet(cur.img, 'webp')} sizes="100vw" />
                <img
                  ref={boxImgRef}
                  className="h-full w-full object-cover"
                  src={fallbackSrc(cur.img)}
                  srcSet={srcSet(cur.img, 'jpg')}
                  sizes="100vw"
                  alt={`${cur.name} — ${cur.sub}`}
                  decoding="async"
                />
              </picture>

              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous image"
                className={`${iconBtn} absolute left-3 top-1/2 z-2 h-11 w-11 -translate-y-1/2 md:left-6 md:h-12 md:w-12`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.4]">
                  <path d="M15 4 7 12l8 8" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next image"
                className={`${iconBtn} absolute right-3 top-1/2 z-2 h-11 w-11 -translate-y-1/2 md:right-6 md:h-12 md:w-12`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.4]">
                  <path d="M9 4l8 8-8 8" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close viewer"
                className={`${iconBtn} absolute right-3 top-3 z-2 h-10 w-10 md:right-6 md:top-6 md:h-11 md:w-11`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>

              <div className="glass-surface absolute bottom-3 left-3 z-2 flex flex-col gap-0.5 rounded-plate px-3.5 py-2.5 md:bottom-6 md:left-6 md:px-4 md:py-3">
                <span className="text-[15px] font-normal leading-tight md:text-[17px]">
                  {cur.name}
                </span>
                <span className="t-label text-ink-3">
                  {cur.sub} &middot; {cur.level}
                </span>
                <span className="t-fig mt-1 text-[10px] tracking-widest text-brass">
                  {String(open + 1).padStart(2, '0')} / {String(TILES.length).padStart(2, '0')}
                </span>
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

export default Amenities
