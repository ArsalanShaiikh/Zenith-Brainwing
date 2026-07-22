import { useRef } from 'react'
import { gsap, useGSAP } from '../Gsapconfig'
import { useView } from '../hooks/useView'
import { VIEWS } from '../lib/views'
import { useViewReveal } from '../hooks/useViewReveal'
import './Home.css'

const Home = ({ active }) => {
  const rootRef = useRef(null)
  const { goToView } = useView()
  useViewReveal(active, rootRef)

  const { contextSafe } = useGSAP({ scope: rootRef })

  const onEnter = contextSafe((e) => {
    const rule = e.currentTarget.querySelector('.u-link__rule')
    gsap.to(rule, { scaleX: 1, duration: 0.5, ease: 'zenith' })
  })
  const onLeave = contextSafe((e) => {
    const rule = e.currentTarget.querySelector('.u-link__rule')
    gsap.to(rule, { scaleX: 0, duration: 0.5, ease: 'zenith' })
  })

  const linkProps = {
    onPointerEnter: onEnter,
    onPointerLeave: onLeave,
    onFocus: onEnter,
    onBlur: onLeave,
  }

  const jump = (id) => () =>
    goToView(VIEWS.findIndex((v) => v.id === id))

  return (
    <div className="vw home" ref={rootRef}>
      <div className="vw__col home__col">
        <p className="vw__eyebrow u-label" data-reveal>
          Balkum &middot; Thane (W)
        </p>

        <h1
          className="vw__heading u-display home__title"
          data-reveal
          data-view-heading
          tabIndex={-1}
        >
          Elevation beyond imagination
        </h1>

        <div className="vw__links" data-reveal>
          <button
            className="u-link"
            type="button"
            onClick={jump('residences')}
            {...linkProps}
          >
            Explore residences
            <span className="u-link__rule" />
          </button>
          <button
            className="u-link u-link--dim"
            type="button"
            onClick={jump('aerial')}
            {...linkProps}
          >
            Aerial tour
            <span className="u-link__rule" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home
