import { useEffect, useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useView } from '../hooks/useView'
import { VIEWS } from '../lib/views'
import { useViewObserver } from '../hooks/useViewObserver'

import MediaLayer from './MediaLayer'
import TransitionBar from './TransitionBar'
import Stamp from './Stamp'

import Views from '../views/Views'
import Amenities from '../views/Amenities'
import Location from '../views/Location'
import Floorplan from '../views/Floorplan'
import Enquire from '../views/Enquire'

const VIEW_COMPONENTS = [Views, Amenities, Location, Floorplan, Enquire]

/**
 * Navigation lives on the menu screen, so panels get the whole plate. The
 * only reserve left is at the top, for the back button and the status chip
 * that float over every view at every size.
 */
const VIEW_PADDING = [
  'px-4 pt-[56px] pb-5',
  'sm:px-5',
  'md:px-8 md:pt-[72px] md:pb-6',
  'lg:px-10 lg:pt-[78px] lg:pb-7',
  'xl:px-12',
  '3xl:px-16 3xl:pt-[96px] 3xl:pb-10',
  '4xl:px-24',
  'short:pt-[52px] short:pb-4',
].join(' ')

const Shell = ({ viewId, onMenu }) => {
  const { activeView, ready, setReady, goToView, jumpToView } = useView()
  const liveRef = useRef(null)
  const panelRefs = useRef([])
  const mountedRef = useRef(false)
  const coverRef = useRef(null)

  useViewObserver()

  // The paper cover carries over from the menu and wipes off here, so the two
  // screens read as one surface instead of a cut. Leaving on the same cover
  // going the other way means nothing of this screen is ever visible under it.
  useGSAP(() => {
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
  }, [])

  const leaveToMenu = () => {
    const cover = coverRef.current
    if (!cover || prefersReducedMotion()) {
      onMenu()
      return
    }
    gsap.set(cover, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1 })
    gsap.to(cover, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.55,
      ease: 'expo.inOut',
      onComplete: onMenu,
    })
  }

  // The route owns which panel is open. On the first commit the panel is
  // snapped into place — arriving from the menu must not replay a transition
  // from whatever happened to be open last time. After that, route changes
  // run the full choreography.
  useEffect(() => {
    const idx = VIEWS.findIndex((v) => v.id === viewId)
    if (idx === -1) return
    if (!mountedRef.current) {
      mountedRef.current = true
      jumpToView(idx)
      setReady(true)
      return
    }
    goToView(idx)
  }, [viewId, goToView, jumpToView, setReady])

  useEffect(() => {
    if (!ready) return
    const v = VIEWS[activeView]
    if (liveRef.current) liveRef.current.textContent = v.label

    const heading = panelRefs.current[activeView]?.querySelector(
      '[data-view-heading]',
    )
    const t = setTimeout(() => heading?.focus({ preventScroll: true }), 700)
    return () => clearTimeout(t)
  }, [activeView, ready])

  return (
    <div className="fixed inset-0 h-dvh w-screen overflow-hidden bg-void p-2 sm:p-2.5 lg:p-3 3xl:p-4">
      {/* The device surface: media clipped into a rounded plate inside the
          frame, so the app reads as a screen rather than a page. */}
      <div className="relative h-full w-full overflow-hidden rounded-plate bg-void">
        <MediaLayer />

        <div
          className="grain pointer-events-none absolute -inset-1/2 z-6 opacity-[0.045] mix-blend-overlay"
          aria-hidden="true"
        />

        <main className="absolute inset-0 z-10">
          {VIEW_COMPONENTS.map((View, i) => {
            const v = VIEWS[i]
            const active = i === activeView
            return (
              <section
                key={v.id}
                id={v.id}
                ref={(el) => (panelRefs.current[i] = el)}
                aria-label={v.label}
                aria-hidden={active ? undefined : 'true'}
                inert={active ? undefined : true}
                className={`absolute inset-0 ${VIEW_PADDING} ${
                  active
                    ? 'visible opacity-100'
                    : 'invisible opacity-0 pointer-events-none'
                }`}
              >
                <View active={active} index={i} />
              </section>
            )
          })}
        </main>

        {/* Back to the menu. The menu is where you came from, so an arrow
            reads more truthfully here than a hamburger. */}
        <button
          type="button"
          onClick={leaveToMenu}
          aria-label="Back to menu"
          className={[
            'absolute left-2 top-2 z-40 grid h-9 w-9 place-items-center rounded-full',
            'glass-surface shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)]',
            'transition-colors duration-200 hover:bg-ink hover:text-paper',
            'touch:h-11 touch:w-11', // ≥44px tap target on touch devices
            'sm:left-2.5 sm:top-2.5 md:left-5 md:top-5 md:h-10 md:w-10',
            'lg:left-3 lg:top-3 3xl:left-4 3xl:top-4 3xl:h-11 3xl:w-11',
          ].join(' ')}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.5]">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </button>

        <Stamp />
        <TransitionBar />

        <div
          ref={coverRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-50 bg-paper"
        />
      </div>

      <p ref={liveRef} className="sr" aria-live="polite" role="status" />
    </div>
  )
}

export default Shell
