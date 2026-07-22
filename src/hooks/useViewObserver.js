import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Observer } from '../Gsapconfig'
import { useView } from './useView'
import { VIEWS } from '../lib/views'

/**
 * Wheel / touch / trackpad + keyboard driving of the view machine.
 *
 * Everything routes: the URL stays truthful and the browser's own back and
 * forward work without a bespoke history shim. The lock still lives in the
 * context — Observer can fire several times inside one React commit, so a
 * state-derived guard would leak.
 */
export const useViewObserver = () => {
  const { ready, isTransitioning, lockRef, activeRef } = useView()
  const navigate = useNavigate()
  const observerRef = useRef(null)

  useEffect(() => {
    if (!ready) return undefined

    const step = (delta) => {
      if (lockRef.current) return
      const next = activeRef.current + delta
      if (next < 0 || next >= VIEWS.length) return
      navigate(`/${VIEWS[next].id}`)
    }

    observerRef.current = Observer.create({
      target: window,
      type: 'wheel,touch,pointer',
      tolerance: 40,
      preventDefault: true,
      // Inverts the wheel so a downward scroll reads as "up" in Observer's
      // terms — what makes onUp -> next feel right for a wheel pushed down
      // and a finger swiped up alike.
      wheelSpeed: -1,
      // Drag surfaces (the plan rail, the form) own their own gestures.
      ignore: '[data-observer-ignore]',
      onUp: () => step(1),
      onDown: () => step(-1),
    })

    const onKey = (e) => {
      if (lockRef.current) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault()
          step(1)
          break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          step(-1)
          break
        case 'Home':
          e.preventDefault()
          navigate(`/${VIEWS[0].id}`)
          break
        case 'End':
          e.preventDefault()
          navigate(`/${VIEWS[VIEWS.length - 1].id}`)
          break
        default: {
          if (/^[1-5]$/.test(e.key)) {
            e.preventDefault()
            navigate(`/${VIEWS[Number(e.key) - 1].id}`)
          }
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      observerRef.current?.kill()
      observerRef.current = null
      window.removeEventListener('keydown', onKey)
    }
  }, [ready, navigate, lockRef, activeRef])

  useEffect(() => {
    const o = observerRef.current
    if (!o) return
    if (isTransitioning) o.disable()
    else o.enable()
  }, [isTransitioning])
}
