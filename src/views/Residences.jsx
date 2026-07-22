import { useRef, useState } from 'react'
import { gsap, useGSAP, Draggable, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { srcSet, fallbackSrc } from '../lib/images'
import './Residences.css'

const PANELS = [
  { id: 'classic', name: '3 BHK Classic', floors: 'L12 — L28', area: '1,480 sq ft', img: 'res-1' },
  { id: 'grand', name: '3 BHK Grand', floors: 'L29 — L40', area: '1,720 sq ft', img: 'res-2' },
  { id: 'sky', name: 'Sky Residence', floors: 'L41 — L48', area: '2,050 sq ft', img: 'res-3' },
  { id: 'penthouse', name: 'Penthouse', floors: 'L49 — L52', area: '3,240 sq ft', img: 'res-4' },
]

const Residences = ({ active }) => {
  const rootRef = useRef(null)
  const trackRef = useRef(null)
  const draggableRef = useRef(null)
  const [index, setIndex] = useState(0)

  useViewReveal(active, rootRef)

  useGSAP(
    () => {
      const track = trackRef.current
      if (!track || !active) return

      const panels = gsap.utils.toArray('.res__panel', track)
      if (!panels.length) return

      const step = panels[0].offsetWidth + parseFloat(getComputedStyle(track).gap || 0)
      const maxScroll = Math.max(0, track.scrollWidth - track.parentElement.offsetWidth)

      gsap.set(track, { x: 0 })

      draggableRef.current?.[0]?.kill()

      const [instance] = Draggable.create(track, {
        type: 'x',
        // Panels are deliberately cropped at both edges, so the bounds run
        // from 0 to -maxScroll rather than snapping flush to the container.
        bounds: { minX: -maxScroll, maxX: 0 },
        inertia: !prefersReducedMotion(),
        edgeResistance: 0.9,
        dragResistance: 0.06,
        snap: {
          x: (value) => {
            const snapped = Math.round(value / step) * step
            return gsap.utils.clamp(-maxScroll, 0, snapped)
          },
        },
        onDrag: function () {
          setIndex(gsap.utils.clamp(0, PANELS.length - 1, Math.round(-this.x / step)))
        },
        onThrowUpdate: function () {
          setIndex(gsap.utils.clamp(0, PANELS.length - 1, Math.round(-this.x / step)))
        },
      })

      draggableRef.current = [instance]
      return () => instance.kill()
    },
    { dependencies: [active], scope: rootRef },
  )

  const current = PANELS[index]

  return (
    <div className="vw res" ref={rootRef}>
      <div className="vw__col res__intro">
        <p className="vw__eyebrow u-label" data-reveal>
          02 &middot; Residences
        </p>
        <h2
          className="vw__heading u-h2"
          data-reveal
          data-view-heading
          tabIndex={-1}
        >
          Four ways to live above Thane
        </h2>

        <dl className="res__spec" aria-live="polite">
          <div className="res__spec-row">
            <dt className="u-label">Floors</dt>
            <dd className="u-label">{current.floors}</dd>
          </div>
          <div className="res__spec-row">
            <dt className="u-label">Carpet</dt>
            <dd className="u-label">{current.area}</dd>
          </div>
        </dl>
      </div>

      {/* data-observer-ignore stops a horizontal panel drag from also
          firing the vertical view-change Observer. */}
      <div className="res__stage" data-observer-ignore>
        <div className="res__track" ref={trackRef} data-cursor-hot>
          {PANELS.map((p, i) => (
            <figure
              className={`res__panel${i === index ? ' is-active' : ''}`}
              key={p.id}
              data-reveal-figure
            >
              <picture>
                <source type="image/avif" srcSet={srcSet(p.img, 'avif')} sizes="34vw" />
                <source type="image/webp" srcSet={srcSet(p.img, 'webp')} sizes="34vw" />
                <img
                  className="res__img"
                  src={fallbackSrc(p.img)}
                  srcSet={srcSet(p.img, 'jpg')}
                  sizes="34vw"
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                />
              </picture>
              <figcaption className="res__cap">
                <span className="u-label">{String(i + 1).padStart(2, '0')}</span>
                <span className="res__cap-name u-label">{p.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="res__hint u-label" aria-hidden="true">
          Drag &rarr;
        </p>
      </div>
    </div>
  )
}

export default Residences
