import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import './Cursor.css'

const isCoarse = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches

const Cursor = () => {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const [enabled] = useState(() => !isCoarse() && !prefersReducedMotion())
  const [hot, setHot] = useState(false)

  useGSAP(() => {
    if (!enabled) return
    gsap.set([dotRef.current, ringRef.current], { xPercent: -50, yPercent: -50 })
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined

    const dot = dotRef.current
    const ring = ringRef.current
    const xDot = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' })
    const yDot = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' })
    const xRing = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3' })
    const yRing = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3' })

    const onMove = (e) => {
      xDot(e.clientX)
      yDot(e.clientY)
      xRing(e.clientX)
      yRing(e.clientY)

      const t = e.target
      setHot(
        !!t?.closest?.(
          'button, a, input, select, textarea, [data-cursor-hot]',
        ),
      )
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="cursor" aria-hidden="true">
      <span className="cursor__dot" ref={dotRef} />
      <span
        className={`cursor__ring${hot ? ' is-hot' : ''}`}
        ref={ringRef}
      />
    </div>
  )
}

export default Cursor
