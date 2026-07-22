import { useEffect, useRef } from 'react'
import { Observer } from '../Gsapconfig'
import { useView } from './useView'
import { VIEWS } from '../lib/views'

/**
 * Wheel / touch / trackpad + keyboard driving of the view machine.
 *
 * Two layers of guarding, deliberately redundant:
 *  1. the Observer is disabled outright while a transition runs
 *  2. goToView rejects synchronously off a ref
 * (2) is what actually holds under wheel spam — Observer can fire several
 * times inside one React commit, so a state-derived guard would leak.
 */
export const useViewObserver = () => {
  const { next, prev, goToView, ready, isTransitioning, lockRef } = useView()
  const observerRef = useRef(null)

  useEffect(() => {
    if (!ready) return undefined

    observerRef.current = Observer.create({
      target: window,
      type: 'wheel,touch,pointer',
      tolerance: 40,
      preventDefault: true,
      // Inverts the wheel so a downward scroll reads as "up" in Observer's
      // terms. That is what makes onUp -> next feel correct for both a wheel
      // pushed down and a finger swiped up.
      wheelSpeed: -1,
      // Anything inside a drag surface (the residences slider) owns its own
      // gesture; ignoring it here is what stops a panel drag changing view.
      ignore: '[data-observer-ignore]',
      onUp: () => next(),
      onDown: () => prev(),
    })

    const onKey = (e) => {
      if (lockRef.current) return

      // Never hijack typing in the enquiry form.
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault()
          next()
          break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          prev()
          break
        case 'Home':
          e.preventDefault()
          goToView(0)
          break
        case 'End':
          e.preventDefault()
          goToView(VIEWS.length - 1)
          break
        default: {
          if (/^[1-6]$/.test(e.key)) {
            e.preventDefault()
            goToView(Number(e.key) - 1)
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
  }, [ready, next, prev, goToView, lockRef])

  useEffect(() => {
    const o = observerRef.current
    if (!o) return
    if (isTransitioning) o.disable()
    else o.enable()
  }, [isTransitioning])
}
