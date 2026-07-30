import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { showcaseFor } from '../lib/showcase'

/**
 * A point's media, shown full-screen. There's no auto-pan any more: multi-media
 * points get a left/right arrow that switches the item on show, looping through
 * them with a cool cross-dissolve. A single image/video just sits there, revealed
 * with the same entrance. Back returns to the orbit on this point's frame.
 */
const Showcase = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = showcaseFor(id)

  const rootRef = useRef(null)
  const slideRefs = useRef([])
  const videoRefs = useRef([])
  const [idx, setIdx] = useState(0)
  // Direction of the last move (+1 next / −1 prev) so the dissolve drifts the
  // right way. Held in a ref so changing it never re-runs the transition effect.
  const dirRef = useRef(1)

  const n = data ? data.media.length : 0
  const animated = n > 1 // only multi-media points get arrows + transitions

  useEffect(() => {
    if (!data) navigate('/', { replace: true })
  }, [data, navigate])

  // Keep only the visible video playing.
  const syncVideos = useCallback((active) => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === active) {
        const p = v.play()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      } else {
        v.pause()
      }
    })
  }, [])

  // Entrance: the first slide rises up out of the same black the orbit faded to.
  useGSAP(
    () => {
      const first = slideRefs.current[0]
      if (!first) return
      syncVideos(0)
      if (prefersReducedMotion()) {
        slideRefs.current.forEach((el, i) => el && gsap.set(el, { autoAlpha: i === 0 ? 1 : 0 }))
        return
      }
      gsap.set(slideRefs.current.filter(Boolean), { autoAlpha: 0 })
      gsap.set(first, { scale: 1.08 })
      gsap
        .timeline()
        .to(first, { autoAlpha: 1, duration: 0.9, ease: 'power2.out' }, 0)
        .to(first, { scale: 1, duration: 1.6, ease: 'zenith' }, 0)
    },
    { dependencies: [], scope: rootRef },
  )

  // Cross-dissolve between slides when the index changes (multi-media only).
  const firstRun = useRef(true)
  useGSAP(
    () => {
      if (firstRun.current) {
        firstRun.current = false
        return
      }
      const el = slideRefs.current[idx]
      if (!el) return
      syncVideos(idx)
      const others = slideRefs.current.filter((s, i) => s && i !== idx)
      const dir = dirRef.current

      if (prefersReducedMotion()) {
        gsap.set(el, { autoAlpha: 1, x: 0, scale: 1 })
        gsap.set(others, { autoAlpha: 0 })
        return
      }

      gsap.set(el, { zIndex: 2, autoAlpha: 0, x: dir * 60, scale: 1.06 })
      gsap.set(others, { zIndex: 1 })
      gsap
        .timeline()
        .to(el, { autoAlpha: 1, x: 0, scale: 1, duration: 1, ease: 'zenith' }, 0)
        .to(others, { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut' }, 0)
    },
    { dependencies: [idx], scope: rootRef },
  )

  const go = (dir) => {
    if (!animated) return
    dirRef.current = dir
    setIdx((i) => (i + dir + n) % n)
  }

  // Arrow keys drive the slides too.
  useEffect(() => {
    if (!animated) return undefined
    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        dirRef.current = 1
        setIdx((i) => (i + 1) % n)
      } else if (e.key === 'ArrowLeft') {
        dirRef.current = -1
        setIdx((i) => (i - 1 + n) % n)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [animated, n])

  if (!data) return null

  // Return to the orbit on the same frame this point lives on — the landing
  // reads `returnPoint` and reopens there (in Amenities mode).
  const goBack = () => navigate('/', { state: { returnPoint: id } })

  return (
    <div ref={rootRef} className="fixed inset-0 z-100 select-none overflow-hidden bg-void">
      {/* The media stack — one slide shown at a time. */}
      {data.media.map((m, i) => (
        <div
          key={i}
          ref={(el) => (slideRefs.current[i] = el)}
          className="absolute inset-0 h-full w-full will-change-transform"
          style={{ opacity: 0 }}
        >
          {m.type === 'video' ? (
            <video
              ref={(el) => (videoRefs.current[i] = el)}
              className="h-full w-full object-cover"
              src={m.src}
              poster={m.poster}
              muted
              loop
              playsInline
              preload="auto"
              draggable={false}
            />
          ) : (
            <picture className="block h-full w-full">
              <source type="image/webp" srcSet={m.webp} />
              <img
                className="h-full w-full object-cover"
                src={m.jpg}
                alt={data.title}
                draggable={false}
              />
            </picture>
          )}
        </div>
      ))}

      {/* Legibility wash for the chrome, top and bottom. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,rgb(11_10_8/0.5)_0%,transparent_20%,transparent_58%,rgb(11_10_8/0.78)_100%)]"
      />

      {/* Back to the orbit. */}
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        className={[
          'absolute left-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full',
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

      {/* Prev / next — only for multi-media points; they loop. */}
      {animated && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className={[
              'group absolute left-2 top-1/2 z-20 grid -translate-y-1/2 place-items-center rounded-full',
              'h-11 w-11 glass-surface shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)]',
              'transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100',
              'sm:left-3 md:left-6 md:h-13 md:w-13 lg:left-8 3xl:h-16 3xl:w-16',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.5] transition-transform duration-300 ease-zenith group-hover:-translate-x-0.5 md:h-6 md:w-6">
              <path d="M15 5 8 12l7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className={[
              'group absolute right-2 top-1/2 z-20 grid -translate-y-1/2 place-items-center rounded-full',
              'h-11 w-11 glass-surface shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)]',
              'transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100',
              'sm:right-3 md:right-6 md:h-13 md:w-13 lg:right-8 3xl:h-16 3xl:w-16',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.5] transition-transform duration-300 ease-zenith group-hover:translate-x-0.5 md:h-6 md:w-6">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Title + slide index. */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-20 p-4 [text-shadow:0_2px_22px_rgb(0_0_0/0.6)] sm:p-5 md:p-8 lg:p-10 3xl:p-14">
        <h1 className="font-fine text-[clamp(30px,6vw,64px)] leading-[0.98] tracking-[-0.02em] text-paper">
          {data.title}
        </h1>
        {animated && (
          <p className="t-fig mt-2 text-[11px] tracking-[0.14em] text-paper/70 md:text-[12px]">
            {String(idx + 1).padStart(2, '0')}
            <span className="mx-1.5 text-paper/40">/</span>
            {String(n).padStart(2, '0')}
          </p>
        )}
      </div>
    </div>
  )
}

export default Showcase;








