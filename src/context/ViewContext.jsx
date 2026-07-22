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
      next,
      prev,
      lockRef,
      activeRef,
    }),
    [state, ready, goToView, next, prev],
  )

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>
}
