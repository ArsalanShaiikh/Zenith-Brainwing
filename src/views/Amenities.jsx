import { useRef } from 'react'
import { useGSAP } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { dimSiblings } from '../animations/dimSiblings'
import { srcSet, fallbackSrc } from '../lib/images'
import './Amenities.css'

/** `short` marks the three tiles that survive the max-height: 620px cut. */
const TILES = [
  { id: 'club', label: 'Club Z — Skydeck Lounge', img: 'am-1', cls: 'a1', short: true },
  { id: 'bar', label: 'Sunset Bar — Level 52', img: 'am-2', cls: 'a2', short: true },
  { id: 'lawn', label: 'The Lawn — Podium', img: 'am-3', cls: 'a3', short: false },
  { id: 'pool', label: 'Infinity Pool', img: 'am-4', cls: 'a4', short: true },
  { id: 'deck', label: 'Nirvana — Yoga Deck', img: 'am-5', cls: 'a5', short: false },
]

const Amenities = ({ active }) => {
  const rootRef = useRef(null)
  const tileRefs = useRef([])

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const onEnter = contextSafe((e) => {
    dimSiblings(e.currentTarget, tileRefs.current.filter(Boolean))
  })
  // eslint-disable-next-line react-hooks/refs
  const onLeave = contextSafe(() => {
    dimSiblings(null, tileRefs.current.filter(Boolean))
  })

  return (
    <div className="vw amen" ref={rootRef}>
      <div className="vw__col amen__intro">
        <p className="vw__eyebrow u-label" data-reveal>
          03 &middot; Amenities
        </p>
        <h2
          className="vw__heading u-h2"
          data-reveal
          data-view-heading
          tabIndex={-1}
        >
          Ten thousand square feet, held above the city
        </h2>
      </div>

      <div
        className="amen__grid"
        onPointerLeave={onLeave}
      >
        {TILES.map((t, i) => (
          <figure
            className={`amen__tile amen__tile--${t.cls}${t.short ? '' : ' is-optional'}`}
            key={t.id}
            ref={(el) => (tileRefs.current[i] = el)}
            onPointerEnter={onEnter}
            data-reveal-figure
            data-cursor-hot
          >
            <picture>
              <source type="image/avif" srcSet={srcSet(t.img, 'avif')} sizes="30vw" />
              <source type="image/webp" srcSet={srcSet(t.img, 'webp')} sizes="30vw" />
              <img
                className="amen__img"
                src={fallbackSrc(t.img)}
                srcSet={srcSet(t.img, 'jpg')}
                sizes="30vw"
                alt={t.label}
                loading="lazy"
                decoding="async"
              />
            </picture>
            <figcaption className="amen__label u-label" data-tile-label>
              {t.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

export default Amenities
