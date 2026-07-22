import { useRef } from 'react'
import { gsap, useGSAP, T } from '../Gsapconfig'
import { useView } from '../hooks/useView'
import './TransitionBar.css'

/** The 1px progress line that sells the "application" read. */
const TransitionBar = () => {
  const barRef = useRef(null)
  const { activeView, prevView } = useView()

  useGSAP(
    () => {
      const bar = barRef.current
      if (!bar || prevView === null) return

      gsap.set(bar, { scaleX: 0, opacity: 1 })
      gsap
        .timeline()
        .to(bar, {
          scaleX: 1,
          duration: T.total / 1000,
          ease: 'power2.inOut',
        })
        .to(bar, { opacity: 0, duration: 0.3, ease: 'none' })
    },
    { dependencies: [activeView, prevView] },
  )

  return (
    <div className="tbar" aria-hidden="true">
      <span className="tbar__fill" ref={barRef} />
    </div>
  )
}

export default TransitionBar
