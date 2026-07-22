import { useCallback, useMemo, useRef, useState } from 'react'
import { ViewContext } from './viewContextObject'
import { T } from '../Gsapconfig'
import { VIEWS } from '../lib/views'

export const ViewProvider = ({ children }) => {
  const [state, setState] = useState({
    activeView: 0,
    prevView: null,
    direction: 1,
    isTransitioning: false,
  })
  const [ready, setReady] = useState(false)

  // A ref mirror of the lock so goToView can reject synchronously, before
  // React has re-rendered. Observer fires far faster than the commit cycle,
  // so reading state here would let a wheel burst through the guard.
  const lockRef = useRef(false)
  const activeRef = useRef(0)
  const timerRef = useRef(null)

  /**
   * Set a view with no choreography at all. Used when arriving from the menu:
   * the panel is still covering the screen, so playing a 1150ms transition
   * from whatever was last open only shows the user the page they didn't ask
   * for. prevView stays null, which is the signal MediaLayer reads as
   * "first paint" — it snaps the plate rather than wiping to it.
   */
  const jumpToView = useCallback((next) => {
    if (!Number.isInteger(next) || next < 0 || next >= VIEWS.length) return
    clearTimeout(timerRef.current)
    lockRef.current = false
    activeRef.current = next
    setState({
      activeView: next,
      prevView: null,
      direction: 1,
      isTransitioning: false,
    })
  }, [])

  const goToView = useCallback((next) => {
    if (lockRef.current) return false
    if (!Number.isInteger(next)) return false
    if (next < 0 || next >= VIEWS.length) return false
    if (next === activeRef.current) return false

    const from = activeRef.current
    lockRef.current = true
    activeRef.current = next

    setState({
      activeView: next,
      prevView: from,
      direction: next > from ? 1 : -1,
      isTransitioning: true,
    })

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      lockRef.current = false
      setState((s) => ({ ...s, isTransitioning: false }))
    }, T.total)

    return true
  }, [])

  const next = useCallback(() => goToView(activeRef.current + 1), [goToView])
  const prev = useCallback(() => goToView(activeRef.current - 1), [goToView])

  const value = useMemo(
    () => ({
      ...state,
      ready,
      setReady,
      goToView,
      jumpToView,
      next,
      prev,
      lockRef,
      activeRef,
    }),
    [state, ready, goToView, jumpToView, next, prev],
  )

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>
}
