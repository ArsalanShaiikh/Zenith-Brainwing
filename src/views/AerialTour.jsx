import { useRef } from 'react'
import { useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { magnetic } from '../animations/magnetic'
import './AerialTour.css'

const TOUR_URL = 'https://runwal-zenith.vercel.app/'

const AerialTour = ({ active }) => {
  const rootRef = useRef(null)
  const btnRef = useRef(null)

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const onPointerMove = contextSafe((e) => {
    magnetic(btnRef.current, 0.25).onPointerMove?.(e)
  })
  // eslint-disable-next-line react-hooks/refs
  const onPointerLeave = contextSafe(() => {
    magnetic(btnRef.current, 0.25).onPointerLeave?.()
  })

  return (
    <div className="vw aer" ref={rootRef}>
      <div className="vw__col aer__intro">
        <p className="vw__eyebrow u-label" data-reveal>
          05 &middot; Aerial Tour
        </p>
        <h2
          className="vw__heading u-h2 aer__title"
          data-reveal
          data-view-heading
          tabIndex={-1}
        >
          See it from the crown
        </h2>
      </div>

      <div
        className="aer__stage"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <a
          className="aer__btn"
          ref={btnRef}
          href={TOUR_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor-hot
        >
          <span className="u-sr">
            View the aerial tour (opens in a new tab)
          </span>
          <svg
            className={`aer__ring${prefersReducedMotion() ? ' is-still' : ''}`}
            viewBox="0 0 200 200"
            aria-hidden="true"
          >
            <defs>
              <path
                id="aer-circle"
                d="M 100,100 m -74,0 a 74,74 0 1,1 148,0 a 74,74 0 1,1 -148,0"
              />
            </defs>
            <text className="aer__ring-text">
              <textPath href="#aer-circle" startOffset="0">
                VIEW · THE · AERIAL · TOUR ·&nbsp;VIEW · THE · AERIAL · TOUR ·
              </textPath>
            </text>
          </svg>
          <span className="aer__arrow" aria-hidden="true">
            &#8599;
          </span>
        </a>
      </div>
    </div>
  )
}

export default AerialTour
