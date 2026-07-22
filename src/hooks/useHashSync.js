import { useEffect } from 'react'
import { useView } from './useView'
import { VIEWS } from '../lib/views'

const indexFromHash = () => {
  const id = window.location.hash.replace('#', '')
  const i = VIEWS.findIndex((v) => v.id === id)
  return i === -1 ? null : i
}

/** Reads the initial deep link, then keeps hash and state in sync both ways. */
export const useHashSync = () => {
  const { activeView, goToView, ready } = useView()

  // Deep link on first paint, under the preloader curtain.
  useEffect(() => {
    const i = indexFromHash()
    if (i !== null) goToView(i)
    // Once only — later hash changes are handled by the popstate listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // State -> hash
  useEffect(() => {
    if (!ready) return
    const id = VIEWS[activeView].id
    if (window.location.hash === `#${id}`) return
    window.history.pushState(null, '', `#${id}`)
  }, [activeView, ready])

  // Hash -> state. pushState never emits popstate or hashchange, so anything
  // arriving here is a genuine back/forward navigation and needs no guard
  // flag. Both events can fire for one nav; the second goToView is a no-op
  // because the target already matches the active view.
  useEffect(() => {
    const onPop = () => {
      const i = indexFromHash()
      goToView(i === null ? 0 : i)
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [goToView])
}
