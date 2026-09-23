import { useEffect, useRef } from 'react'
import { useVisitor } from '../hooks/useVisitor'
import { initVisitorProfile } from '../lib/geo'

/**
 * Kicks off visitor device/location profiling exactly once, the moment the
 * visitor actually enters the site (VisitorContext's `gateOpen` flips to
 * false — the entry gate has been dismissed) rather than on first paint,
 * so the GPS permission prompt (if it fires at all) never appears before
 * the visitor has done anything. Renders nothing.
 */
const VisitorProfileTracker = () => {
  const { gateOpen } = useVisitor()
  const startedRef = useRef(false)

  useEffect(() => {
    if (gateOpen || startedRef.current) return
    if (window.location.pathname.startsWith('/admin')) return
    startedRef.current = true
    initVisitorProfile()
  }, [gateOpen])

  return null
}

export default VisitorProfileTracker
