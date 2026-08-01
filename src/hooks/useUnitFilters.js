import { useCallback, useMemo, useState } from 'react'
import { AREA_BOUNDS, filterPlans } from '../lib/floorplans'

/** Everything cleared — the state the Reset control returns to. */
const initialState = () => ({
  types: new Set(),
  features: new Set(),
  area: [AREA_BOUNDS.min, AREA_BOUNDS.max],
  sortBy: 'default',
})

/**
 * The search-by-unit facet state, modelled on the filtering-plans prototype:
 * one flat state object, `set` for scalars, `toggle` for the Set-valued
 * facets, and a memoised result list. `dirty` drives whether the Reset
 * control has anything to do.
 */
/** Compare is capped at 3 — the amount a side-by-side table can hold before
 *  it needs its own scroll axis. Kept as an ordered array (not a Set) so the
 *  compare bar and the modal list selections in the order they were picked. */
const MAX_COMPARE = 3

export function useUnitFilters() {
  const [state, setState] = useState(initialState)
  const [compare, setCompare] = useState([])

  const set = useCallback((patch) => setState((s) => ({ ...s, ...patch })), [])

  const toggle = useCallback((key, value) => {
    setState((s) => {
      const next = new Set(s[key])
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...s, [key]: next }
    })
  }, [])

  const reset = useCallback(() => setState(initialState()), [])

  const toggleCompare = useCallback((key) => {
    setCompare((c) => {
      if (c.includes(key)) return c.filter((k) => k !== key)
      if (c.length >= MAX_COMPARE) return c
      return [...c, key]
    })
  }, [])

  const clearCompare = useCallback(() => setCompare([]), [])

  const results = useMemo(() => filterPlans(state), [state])

  const dirty =
    state.types.size > 0 ||
    state.features.size > 0 ||
    state.area[0] > AREA_BOUNDS.min ||
    state.area[1] < AREA_BOUNDS.max

  return {
    state,
    set,
    toggle,
    reset,
    results,
    dirty,
    compare,
    toggleCompare,
    clearCompare,
    compareFull: compare.length >= MAX_COMPARE,
  }
}
