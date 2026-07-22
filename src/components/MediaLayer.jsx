import { useRef } from 'react'
import { useGSAP, gsap, prefersReducedMotion, T } from '../Gsapconfig'
import { useView } from '../hooks/useView'
import { VIEWS } from '../lib/views'
import { srcSet, fallbackSrc } from '../lib/images'
import { wipeMedia, driftMedia, CLIP_OPEN, clipTo } from '../animations/wipeMedia'

/**
 * The one persistent media stack. Never re-created per view — each view owns a
 * fixed plate and only clip-path and scale are ever animated.
 */
const MediaLayer = () => {
  const rootRef = useRef(null)
  const figureRefs = useRef([])
  const { activeView, prevView, direction, ready } = useView()

  useGSAP(
    () => {
      const figures = figureRefs.current
      if (!figures.length) return

      // First paint: show the active plate, park the rest.
      if (prevView === null) {
        figures.forEach((f, i) => {
          if (!f) return
          gsap.set(f, {
            clipPath: i === activeView ? CLIP_OPEN : clipTo(1),
            opacity: 1,
            zIndex: i === activeView ? 2 : 1,
          })
          const img = f.querySelector('img')
          if (img) gsap.set(img, { scale: i === activeView ? 1 : 1.14 })
        })
        return
      }

      const incoming = figures[activeView]
      const outgoing = figures[prevView]
      if (!incoming) return

      gsap.set(outgoing, { zIndex: 1 })
      gsap.set(incoming, { zIndex: 2, opacity: 1 })
      figures.forEach((f, i) => {
        if (f && i !== activeView && i !== prevView) gsap.set(f, { zIndex: 0 })
      })

      gsap.set(rootRef.current, { willChange: 'transform' })

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(rootRef.current, { willChange: 'auto' })
          figures.forEach((f, i) => {
            if (f && i !== activeView) gsap.set(f, { clipPath: clipTo(1) })
          })
        },
      })

      if (prefersReducedMotion()) {
        gsap.set(incoming, { clipPath: CLIP_OPEN, opacity: 0 })
        tl.to(incoming, { opacity: 1, duration: 0.25, ease: 'none' })
        return
      }

      tl.add(() => {
        wipeMedia(incoming, direction)
        driftMedia(outgoing)
      }, T.media / 1000)
    },
    { dependencies: [activeView, prevView, direction, ready], scope: rootRef },
  )

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-void"
    >
      {VIEWS.map((v, i) => (
        <figure
          key={v.id}
          ref={(el) => (figureRefs.current[i] = el)}
          data-media-plate={v.id}
          className="absolute inset-0 m-0 overflow-hidden"
        >
          <picture className="block h-full w-full">
            <source type="image/avif" srcSet={srcSet(v.img, 'avif')} sizes="100vw" />
            <source type="image/webp" srcSet={srcSet(v.img, 'webp')} sizes="100vw" />
            <img
              className="h-full w-full origin-center object-cover"
              src={fallbackSrc(v.img)}
              srcSet={srcSet(v.img, 'jpg')}
              sizes="100vw"
              alt=""
              decoding="async"
              fetchPriority={i === 0 ? 'high' : 'low'}
            />
          </picture>
        </figure>
      ))}

      {/* Grade, not just a scrim. The source renders are bright marketing dusk
          shots; raw, they read as a website hero and the paper chrome floats
          on nothing. Multiply pulls the value down without a filter, so this
          stays composite-only. */}
      <div className="absolute inset-0 z-4 bg-[#33404d] opacity-50 mix-blend-multiply" />

      {/* Must out-rank the plates: the transition sets inline z-index 1/2. */}
      <div
        className={[
          'absolute inset-0 z-5',
          'bg-[linear-gradient(to_top,rgb(11_10_8/0.72)_0%,rgb(11_10_8/0.22)_30%,rgb(11_10_8/0.06)_58%),radial-gradient(118%_96%_at_50%_42%,rgb(11_10_8/0)_34%,rgb(11_10_8/0.5)_100%)]',
        ].join(' ')}
      />
    </div>
  )
}

export default MediaLayer
