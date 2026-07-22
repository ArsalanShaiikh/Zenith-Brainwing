import { useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { srcSet, fallbackSrc } from '../lib/images'
import './Location.css'

const DESTINATIONS = [
  { id: 'ghodbunder', name: 'Ghodbunder Road', dist: '1.2 km', img: 'loc-1' },
  { id: 'viviana', name: 'Viviana Mall', dist: '3.4 km', img: 'loc-2' },
  { id: 'station', name: 'Thane Station', dist: '4.1 km', img: 'loc-3' },
  { id: 'jupiter', name: 'Jupiter Hospital', dist: '5.0 km', img: 'loc-4' },
  { id: 'airoli', name: 'Airoli Bridge', dist: '9.6 km', img: 'loc-5' },
  { id: 'bkc', name: 'BKC', dist: '24 km', img: 'loc-6' },
]

const Location = ({ active }) => {
  const rootRef = useRef(null)
  const plateRefs = useRef([])
  const [current, setCurrent] = useState(null)

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const onEnter = contextSafe((i) => {
    setCurrent(i)
    const plates = plateRefs.current.filter(Boolean)
    const target = plateRefs.current[i]
    if (!target) return

    if (prefersReducedMotion()) {
      gsap.set(plates, { opacity: 0 })
      gsap.to(target, { opacity: 1, duration: 0.25, ease: 'none' })
      return
    }

    gsap.set(target, { zIndex: 2, opacity: 1, clipPath: 'inset(0% 0% 100% 0%)' })
    plates.forEach((p) => {
      if (p !== target) gsap.set(p, { zIndex: 1 })
    })
    gsap.to(target, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.6,
      ease: 'expo.out',
      overwrite: 'auto',
    })
  })

  // eslint-disable-next-line react-hooks/refs
  const onLeaveList = contextSafe(() => {
    setCurrent(null)
    const plates = plateRefs.current.filter(Boolean)
    if (!plates.length) return
    gsap.to(plates, {
      opacity: 0,
      duration: prefersReducedMotion() ? 0.2 : 0.5,
      ease: 'zenith',
      overwrite: 'auto',
    })
  })

  return (
    <div className="vw loc" ref={rootRef}>
      {/* Destination plates ride above the shared media layer and below the
          view's own type, so the swap reads as the background changing. */}
      <div className="loc__plates" aria-hidden="true">
        {DESTINATIONS.map((d, i) => (
          <figure
            className="loc__plate"
            key={d.id}
            ref={(el) => (plateRefs.current[i] = el)}
          >
            <picture>
              <source type="image/avif" srcSet={srcSet(d.img, 'avif')} sizes="100vw" />
              <source type="image/webp" srcSet={srcSet(d.img, 'webp')} sizes="100vw" />
              <img
                className="loc__plate-img"
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
        <div className="loc__plate-scrim" />
      </div>

      <div className="vw__col loc__intro">
        <p className="vw__eyebrow u-label" data-reveal>
          04 &middot; Location
        </p>
        <h2
          className="vw__heading u-h2"
          data-reveal
          data-view-heading
          tabIndex={-1}
        >
          Balkum, and everything from it
        </h2>
      </div>

      <ul className="loc__list" onPointerLeave={onLeaveList}>
        {DESTINATIONS.map((d, i) => (
          <li key={d.id}>
            <button
              className={`loc__row${current === i ? ' is-current' : ''}`}
              type="button"
              onPointerEnter={() => onEnter(i)}
              onFocus={() => onEnter(i)}
              onBlur={onLeaveList}
            >
              <span className="loc__fill" aria-hidden="true" />
              <span className="loc__name u-label">{d.name}</span>
              <span className="loc__dist u-label">{d.dist}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Location
