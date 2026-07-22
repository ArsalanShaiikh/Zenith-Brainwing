import { useEffect, useRef } from 'react'
import { useView } from '../hooks/useView'
import { VIEWS } from '../lib/views'
import { useViewObserver } from '../hooks/useViewObserver'
import { useHashSync } from '../hooks/useHashSync'
import { useIdleChrome } from '../hooks/useIdleChrome'
import { prefersReducedMotion } from '../Gsapconfig'

import Nav from './Nav'
import ViewIndex from './ViewIndex'
import MetaRail from './MetaRail'
import MediaLayer from './MediaLayer'
import TransitionBar from './TransitionBar'
import Cursor from './Cursor'

import Home from '../views/Home'
import Residences from '../views/Residences'
import Amenities from '../views/Amenities'
import Location from '../views/Location'
import AerialTour from '../views/AerialTour'
import Enquire from '../views/Enquire'

import './Shell.css'

const VIEW_COMPONENTS = [Home, Residences, Amenities, Location, AerialTour, Enquire]

const Shell = () => {
  const { activeView, ready } = useView()
  const idle = useIdleChrome()
  const liveRef = useRef(null)
  const panelRefs = useRef([])

  useViewObserver()
  useHashSync()

  // Hide the native cursor only when we're actually drawing one.
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (!coarse && !prefersReducedMotion()) {
      document.documentElement.classList.add('has-cursor')
    }
    return () => document.documentElement.classList.remove('has-cursor')
  }, [])

  // Announce the view, then move focus to its heading so keyboard and screen
  // reader users land inside the content that just arrived.
  useEffect(() => {
    if (!ready) return
    const v = VIEWS[activeView]
    if (liveRef.current) liveRef.current.textContent = `${v.num} ${v.label}`

    const panel = panelRefs.current[activeView]
    const heading = panel?.querySelector('[data-view-heading]')
    // Wait out the incoming-line reveal so focus doesn't fight the animation.
    const t = setTimeout(() => heading?.focus({ preventScroll: true }), 700)
    return () => clearTimeout(t)
  }, [activeView, ready])

  return (
    <div className={`shell${idle ? ' is-idle' : ''}`}>
      <MediaLayer />

      <div className="shell__grain" aria-hidden="true" />
      <div className="shell__vignette" aria-hidden="true" />

      <main className="shell__views">
        {VIEW_COMPONENTS.map((View, i) => {
          const v = VIEWS[i]
          const active = i === activeView
          return (
            <section
              key={v.id}
              id={v.id}
              className={`view${active ? ' is-active' : ''}`}
              ref={(el) => (panelRefs.current[i] = el)}
              aria-label={v.label}
              aria-hidden={active ? undefined : 'true'}
              // `inert` keeps hidden views out of the tab order entirely.
              inert={active ? undefined : true}
            >
              <View active={active} index={i} />
            </section>
          )
        })}
      </main>

      <div className="shell__chrome">
        <Nav />
        <ViewIndex />
        <MetaRail />
      </div>

      <TransitionBar />
      <Cursor />

      <p ref={liveRef} className="u-sr" aria-live="polite" role="status" />
    </div>
  )
}

export default Shell
