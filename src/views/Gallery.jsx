import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { GALLERY } from '../lib/gallery'
import { galleryRecord } from '../lib/saveables'
import { useVisitor } from '../hooks/useVisitor'
import LikeButton from '../components/LikeButton'

const N = GALLERY.length

/** Circular distance between two indices on the ring of N. */
const ringDist = (a, b) => Math.min((a - b + N) % N, (b - a + N) % N)

/**
 * The render gallery — full-screen stills, navigated like the amenity showcases
 * (arrows / keys / a thumbnail rail) but with a richer hand-off: the incoming
 * render wipes in from the travel direction with a parallax zoom while the
 * outgoing one drifts and settles behind it. Mixed orientations are handled by a
 * blurred fill of the same frame behind the sharp, uncropped image.
 */
const Gallery = ({ onBack }) => {
  const { gateOpen } = useVisitor()
  const rootRef = useRef(null)
  const coverRef = useRef(null)
  const slideRefs = useRef([])
  const railRef = useRef(null)
  const thumbRefs = useRef([])
  const dirRef = useRef(1)
  const prevIdxRef = useRef(0)
  const firstRef = useRef(true)

  const [idx, setIdx] = useState(0)
  const cur = GALLERY[idx]

  const go = (dir) => {
    dirRef.current = dir
    setIdx((i) => (i + dir + N) % N)
  }
  const jump = (i) => {
    if (i === idx) return
    dirRef.current = i > idx ? 1 : -1
    setIdx(i)
  }

  const back = () => {
    const cover = coverRef.current
    if (!cover || prefersReducedMotion()) {
      onBack?.()
      return
    }
    gsap.set(cover, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1 })
    gsap.to(cover, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.55,
      ease: 'expo.inOut',
      onComplete: () => onBack?.(),
    })
  }

  // Keyboard. A reload can land straight here with the entry gate still up —
  // the keys belong to whatever is on top, so they don't bind until it lifts.
  useEffect(() => {
    if (gateOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateOpen])

  // Mount: wipe the inherited paper cover off (hand-over from the menu).
  useGSAP(
    () => {
      const first = slideRefs.current[0]
      if (first) gsap.set(first, { autoAlpha: 1 })
      const cover = coverRef.current
      if (!cover) return
      if (prefersReducedMotion()) {
        gsap.set(cover, { autoAlpha: 0 })
        return
      }
      gsap.set(cover, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1 })
      gsap.to(cover, {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 0.9,
        ease: 'expo.inOut',
        onComplete: () => gsap.set(cover, { autoAlpha: 0 }),
      })
    },
    { dependencies: [], scope: rootRef },
  )

  // The transition: clip-wipe + parallax zoom from the travel direction.
  useGSAP(
    () => {
      const el = slideRefs.current[idx]
      if (!el) return
      if (firstRef.current) {
        firstRef.current = false
        prevIdxRef.current = idx
        return
      }
      const prev = slideRefs.current[prevIdxRef.current]
      const dir = dirRef.current

      if (prefersReducedMotion()) {
        gsap.set(el, { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1, xPercent: 0, zIndex: 2 })
        if (prev && prev !== el) gsap.set(prev, { autoAlpha: 0, zIndex: 1 })
        prevIdxRef.current = idx
        return
      }

      gsap.set(el, {
        zIndex: 2,
        autoAlpha: 1,
        scale: 1.12,
        clipPath: dir >= 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)',
      })
      gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.95, ease: 'zenith' })

      if (prev && prev !== el) {
        gsap.set(prev, { zIndex: 1 })
        gsap.to(prev, {
          scale: 1.08,
          xPercent: dir >= 0 ? -6 : 6,
          duration: 0.95,
          ease: 'zenith',
          onComplete: () =>
            gsap.set(prev, { autoAlpha: 0, xPercent: 0, scale: 1, clipPath: 'inset(0% 0% 0% 0%)' }),
        })
      }
      prevIdxRef.current = idx
    },
    { dependencies: [idx], scope: rootRef },
  )

  // Keep the active thumbnail in view on the rail.
  useEffect(() => {
    thumbRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [idx])

  return (
    <div ref={rootRef} className="fixed inset-0 z-100 select-none overflow-hidden bg-void">
      {/* Slides. Only those within a small window of the current index carry a
          src, so entering the gallery doesn't pull all 23 full renders. */}
      {GALLERY.map((g, i) => {
        const warm = ringDist(i, idx) <= 2
        return (
          <div
            key={g.base}
            ref={(el) => (slideRefs.current[i] = el)}
            className="absolute inset-0 h-full w-full will-change-transform"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            {warm && (
              <>
                {/* Blurred fill so portrait/landscape frames never crop. */}
                <img
                  src={`${g.base}-t.webp`}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-void/45" />
                {/* Sharp, uncropped render with a slow Ken Burns drift. */}
                <picture className="absolute inset-0 block h-full w-full">
                  <source type="image/webp" srcSet={`${g.base}.webp`} />
                  <img
                    src={`${g.base}.jpg`}
                    alt={g.title}
                    draggable={false}
                    className="gallery-kb h-full w-full object-contain"
                  />
                </picture>
              </>
            )}
          </div>
        )
      })}

      {/* Legibility wash for chrome. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,rgb(11_10_8/0.5)_0%,transparent_18%,transparent_52%,rgb(11_10_8/0.82)_100%)]"
      />

      {/* Back. */}
      <button
        type="button"
        onClick={back}
        aria-label="Back to menu"
        className={[
          'absolute left-2 top-2 z-30 grid h-9 w-9 place-items-center rounded-full',
          'glass-surface shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)]',
          'transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100',
          'touch:h-11 touch:w-11',
          'sm:left-2.5 sm:top-2.5 md:left-5 md:top-5 md:h-10 md:w-10',
          'lg:left-3 lg:top-3 3xl:left-4 3xl:top-4 3xl:h-11 3xl:w-11',
        ].join(' ')}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.5]">
          <path d="M15 5 8 12l7 7" />
        </svg>
      </button>

      {/* Eyebrow + mark — top-right. The eyebrow stays click-through; only the
          heart in the row is a target. */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2.5 md:right-8 md:top-8 md:gap-3">
        <span className="t-label pointer-events-none rounded-full bg-void/30 px-3 py-1.5 text-paper/85 [backdrop-filter:blur(6px)]">
          Gallery &middot; {cur.group}
        </span>
        <LikeButton record={galleryRecord(cur)} label={cur.title} />
      </div>

      {/* Prev / next. */}
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous"
        className="group absolute left-2 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full glass-surface shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)] transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100 sm:left-3 md:left-6 md:h-13 md:w-13 lg:left-8 3xl:h-16 3xl:w-16"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.5] transition-transform duration-300 ease-zenith group-hover:-translate-x-0.5 md:h-6 md:w-6">
          <path d="M15 5 8 12l7 7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next"
        className="group absolute right-2 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full glass-surface shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)] transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100 sm:right-3 md:right-6 md:h-13 md:w-13 lg:right-8 3xl:h-16 3xl:w-16"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.5] transition-transform duration-300 ease-zenith group-hover:translate-x-0.5 md:h-6 md:w-6">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Title + counter. */}
      <div className="pointer-events-none absolute bottom-[92px] left-0 z-30 p-4 [text-shadow:0_2px_22px_rgb(0_0_0/0.6)] sm:p-5 md:bottom-[104px] md:p-8 lg:p-10 3xl:bottom-[128px] 3xl:p-14">
        <p className="t-fig text-[11px] tracking-[0.14em] text-paper/70 md:text-[12px]">
          {String(idx + 1).padStart(2, '0')}
          <span className="mx-1.5 text-paper/40">/</span>
          {String(N).padStart(2, '0')}
        </p>
        <h1 className="mt-1 font-fine text-[clamp(26px,5vw,54px)] leading-[1.0] tracking-[-0.02em] text-paper">
          {cur.title}
        </h1>
      </div>

      {/* Thumbnail rail. */}
      <div
        ref={railRef}
        className="no-scrollbar absolute inset-x-0 bottom-0 z-30 flex items-center gap-2 overflow-x-auto px-3 py-3 md:gap-2.5 md:px-6 md:py-4"
      >
        {GALLERY.map((g, i) => {
          const on = i === idx
          return (
            <button
              key={g.base}
              type="button"
              ref={(el) => (thumbRefs.current[i] = el)}
              onClick={() => jump(i)}
              aria-label={g.title}
              aria-current={on ? 'true' : undefined}
              className={[
                'relative h-11 w-16 shrink-0 overflow-hidden rounded-[4px] transition-all duration-300 ease-zenith md:h-13 md:w-20',
                on
                  ? 'opacity-100 ring-2 ring-brass ring-offset-2 ring-offset-void'
                  : 'opacity-45 hover:opacity-80',
              ].join(' ')}
            >
              <img src={`${g.base}-t.webp`} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          )
        })}
      </div>

      {/* Paper cover — inherited from the menu on the way in, wiped back on exit. */}
      <div
        ref={coverRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-50 bg-paper"
      />
    </div>
  )
}

export default Gallery
