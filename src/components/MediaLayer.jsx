import { useRef } from 'react'
import { useGSAP, gsap, prefersReducedMotion, T } from '../Gsapconfig'
import { useView } from '../hooks/useView'
import { VIEWS } from '../lib/views'
import { srcSet, fallbackSrc } from '../lib/images'
import {
  wipeMedia,
  driftMedia,
  CLIP_OPEN,
  clipTo,
} from '../animations/wipeMedia'
import './MediaLayer.css'

/**
 * The one persistent media stack. Never re-created per view — each view owns a
 * fixed <figure> in the stack and only clip-path / scale are ever animated.
 * The Location view borrows this layer for its destination cross-swap.
 */
const MediaLayer = () => {
  const rootRef = useRef(null)
  const figureRefs = useRef([])
  const { activeView, prevView, direction, ready } = useView()

  useGSAP(
    () => {
      const figures = figureRefs.current
      if (!figures.length) return

      // First paint / preloader handover: show the active plate, hide the rest.
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

      // Incoming sits above the outgoing and wipes over it.
      gsap.set(outgoing, { zIndex: 1 })
      gsap.set(incoming, { zIndex: 2, opacity: 1 })
      figures.forEach((f, i) => {
        if (f && i !== activeView && i !== prevView) gsap.set(f, { zIndex: 0 })
      })

      gsap.set(rootRef.current, { willChange: 'transform' })

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(rootRef.current, { willChange: 'auto' })
          // Park everything that is not active so the next wipe starts clean.
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
    <div className="media" ref={rootRef} aria-hidden="true">
      {VIEWS.map((v, i) => (
        <figure
          className="media__plate"
          key={v.id}
          ref={(el) => (figureRefs.current[i] = el)}
          data-media-plate={v.id}
        >
          <picture>
            <source type="image/avif" srcSet={srcSet(v.img, 'avif')} sizes="100vw" />
            <source type="image/webp" srcSet={srcSet(v.img, 'webp')} sizes="100vw" />
            <img
              className="media__img"
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
      <div className="media__scrim" />
    </div>
  )
}

export default MediaLayer
