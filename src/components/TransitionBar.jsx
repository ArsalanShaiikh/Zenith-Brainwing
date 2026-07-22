import { useRef } from 'react'
import { gsap, useGSAP, T } from '../Gsapconfig'
import { useView } from '../hooks/useView'

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
        .to(bar, { scaleX: 1, duration: T.total / 1000, ease: 'power2.inOut' })
        .to(bar, { opacity: 0, duration: 0.3, ease: 'none' })
    },
    { dependencies: [activeView, prevView] },
  )

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-60 h-px" aria-hidden="true">
      <span
        ref={barRef}
        className="block h-full w-full origin-left scale-x-0 bg-brass opacity-0"
      />
    </div>
  )
}

export default TransitionBar
