import { useCallback, useEffect, useMemo, useState } from 'react'
import { VisitorContext } from './visitorContextObject'
import { isFullscreen } from '../lib/fullscreen'

/**
 * The visitor session — who is being shown the tower, and what they marked.
 *
 * Two things live here:
 *   • The entry sequence. `stage` walks 'fullscreen' → 'name' → 'welcome' →
 *     'done'; the gate renders while it isn't 'done', and everything behind it
 *     (notably the landing's 100-frame preload) keeps working underneath.
 *   • The selection. Every marked residence, space or render is stored as a
 *     flat record carrying its own PDF payload (title, sub, jpg url), so the
 *     sheet builder never has to reach back into the view that saved it.
 *
 * Persisted to sessionStorage, not localStorage: a refresh mid-visit must not
 * lose a selection, but the next visitor on the same machine starts clean.
 */

const KEY = 'zenith.visitor.v1'

const STAGES = ['fullscreen', 'name', 'welcome', 'done']

const EMPTY = { name: '', stage: 'fullscreen', saved: [] }

/** The anonymous analytics id (lib/analytics.js, lib/geo.js) and the
 *  once-per-visitor location flag. Dropped on "New visitor" so the next
 *  person counts as a visitor of their own, not as more of the last one. */
const ANALYTICS_KEYS = ['zenith_visitor_id', 'zenith_geo_attempted']

/** A saved record needs these to survive into the PDF; anything short of that
 *  is a stale shape from an older build and gets dropped. */
const isRecord = (r) =>
  r && typeof r.id === 'string' && typeof r.kind === 'string' && typeof r.img === 'string'

const read = () => {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return EMPTY
    const v = JSON.parse(raw)
    return {
      name: typeof v.name === 'string' ? v.name : '',
      stage: STAGES.includes(v.stage) ? v.stage : 'fullscreen',
      saved: Array.isArray(v.saved) ? v.saved.filter(isRecord) : [],
    }
  } catch {
    return EMPTY
  }
}

export const VisitorProvider = ({ children }) => {
  const [state, setState] = useState(read)
  // Bumped by resetVisitor. App keys everything behind the provider on it, so
  // a new visitor gets freshly mounted views — no filters, compare picks,
  // gallery position or half-typed enquiry left over from the last one.
  const [visit, setVisit] = useState(0)

  // Write-through. Private-mode Safari throws on setItem with a full quota, and
  // a failed save must never take the app down with it.
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* session storage unavailable — the visit just won't survive a refresh */
    }
  }, [state])

  const setStage = useCallback((stage) => setState((s) => ({ ...s, stage })), [])

  const setName = useCallback(
    (name) => setState((s) => ({ ...s, name: name.trim().slice(0, 40) })),
    [],
  )

  /** Add the record if it isn't marked, drop it if it is. Appends rather than
   *  prepends, so the sheet reads in the order the visit happened. */
  const toggleSave = useCallback((record) => {
    if (!isRecord(record)) return
    setState((s) => {
      const has = s.saved.some((r) => r.id === record.id)
      return {
        ...s,
        saved: has ? s.saved.filter((r) => r.id !== record.id) : [...s.saved, record],
      }
    })
  }, [])

  /**
   * Hand the kiosk to the next person: forget the name and every marked item,
   * start a new analytics visitor, and put the entry gate back up. Full screen
   * is kept when it's still held (the gate opens on the name, not on the full
   * screen ask), so a sales host can do this between visitors without the
   * screen jumping out of full screen.
   */
  const resetVisitor = useCallback(() => {
    try {
      ANALYTICS_KEYS.forEach((k) => sessionStorage.removeItem(k))
    } catch {
      /* storage unavailable — the next visitor shares the old analytics id */
    }
    setState({ ...EMPTY, stage: isFullscreen() ? 'name' : 'fullscreen' })
    setVisit((v) => v + 1)
  }, [])

  const savedIds = useMemo(() => new Set(state.saved.map((r) => r.id)), [state.saved])
  const isSaved = useCallback((id) => savedIds.has(id), [savedIds])

  const value = useMemo(
    () => ({
      name: state.name,
      stage: state.stage,
      gateOpen: state.stage !== 'done',
      saved: state.saved,
      savedCount: state.saved.length,
      isSaved,
      toggleSave,
      setStage,
      setName,
      visit,
      resetVisitor,
    }),
    [state, isSaved, toggleSave, setStage, setName, visit, resetVisitor],
  )

  return <VisitorContext.Provider value={value}>{children}</VisitorContext.Provider>
}
