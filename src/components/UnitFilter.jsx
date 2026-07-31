import { useEffect, useRef, useState } from 'react'
import { AREA_BOUNDS, FEATURE_FILTERS, PLAN_BY_KEY, PLAN_TYPES, SORT_OPTIONS, sqft } from '../lib/floorplans'

/**
 * Search by unit — the faceted half of the floorplan explorer, ported from the
 * `filtering-plans` prototype and re-cut in the Zenith palette.
 *
 * Results themselves render as a card grid alongside this panel (see
 * UnitGrid) — this column stays limited to facets, compare, and enquiry.
 */
const UnitFilter = ({ filters, onCompare, onEnquire }) => {
  const { state, set, toggle, reset, results, dirty, compare, toggleCompare, clearCompare } = filters

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {/* ---------- Facets ---------- */}
      <div className="shrink-0 rounded-xl border border-ink/10 bg-ink/3 p-2.5 md:p-3">
        {/* Count and sort stack rather than sit inline — the column is too
            narrow to hold both on one line below xl. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <p className="t-label text-ink-3">
            {results.length} {results.length === 1 ? 'plan' : 'plans'}
          </p>
          <SortMenu value={state.sortBy} onChange={(v) => set({ sortBy: v })} />
        </div>

        <Facet label="Configuration">
          {PLAN_TYPES.map((t) => (
            <Chip key={t.key} on={state.types.has(t.key)} onClick={() => toggle('types', t.key)}>
              {t.label}
            </Chip>
          ))}
        </Facet>

        <Facet label="Carpet area">
          <AreaRange value={state.area} onChange={(area) => set({ area })} />
        </Facet>

        <Facet label="Features">
          {FEATURE_FILTERS.map((f) => (
            <Chip
              key={f.key}
              on={state.features.has(f.key)}
              onClick={() => toggle('features', f.key)}
            >
              {f.label}
            </Chip>
          ))}
        </Facet>

        <button
          type="button"
          onClick={reset}
          disabled={!dirty}
          className="group mt-3 flex items-center gap-2 text-[11px] text-ink-3 transition-colors duration-200 hover:text-ink disabled:pointer-events-none disabled:opacity-35"
        >
          <span className="inline-block h-px w-4 bg-current transition-all duration-300 group-hover:w-7" />
          Reset filters
        </button>
      </div>

      {/* ---------- Compare ---------- */}
      <div className="shrink-0 rounded-xl border border-brass/35 bg-brass/6 p-2.5 md:p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="t-label text-ink-2">
            Compare <span className="text-brass-ink">({compare.length}/3)</span>
          </p>
          {compare.length > 0 && (
            <button
              type="button"
              onClick={clearCompare}
              className="text-[10px] text-ink-3 underline underline-offset-4 hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>

        {compare.length === 0 ? (
          <p className="mt-1.5 text-[11px] text-ink-3">Select up to 3 residences to compare.</p>
        ) : (
          <>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {compare.map((key) => {
                const p = PLAN_BY_KEY[key]
                if (!p) return null
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => toggleCompare(key)}
                      className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper px-2.5 py-1 text-[10.5px] text-ink-2 transition-colors duration-200 hover:border-ink/35 hover:text-ink"
                    >
                      <span className="max-w-24 truncate">{p.name}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={onCompare}
              disabled={compare.length < 2}
              className="mt-2.5 w-full rounded-full bg-ink py-2 text-[10px] uppercase tracking-[0.16em] text-paper transition-colors duration-200 hover:bg-brass-ink disabled:pointer-events-none disabled:opacity-35"
            >
              Compare now
            </button>
          </>
        )}
      </div>

      {/* ---------- Enquire ---------- */}
      <button
        type="button"
        onClick={() => onEnquire?.()}
        className="mt-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-paper transition-colors duration-200 hover:bg-brass-ink"
      >
        Enquire about a residence
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-[1.6]">
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}

const Facet = ({ label, children }) => (
  <div className="mt-2.5 border-t border-ink/10 pt-2.5">
    <p className="t-label mb-2 text-ink-3">{label}</p>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
)

const Chip = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={[
      'rounded-full border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors duration-200',
      on
        ? 'border-ink bg-ink text-paper'
        : 'border-ink/15 text-ink-2 hover:border-ink/40 hover:text-ink',
    ].join(' ')}
  >
    {children}
  </button>
)

/**
 * Dual-thumb carpet-area range. Two native sliders stacked over one drawn
 * track — the thumbs stay keyboard-operable, and the z-order flips at the
 * midpoint so neither handle can bury the other at the ends.
 */
const AreaRange = ({ value, onChange }) => {
  const { min, max, step } = AREA_BOUNDS
  const [lo, hi] = value
  const pct = (n) => ((n - min) / (max - min)) * 100
  const mid = (min + max) / 2

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2 text-[12px] tabular-nums text-ink-2">
        <span>{sqft(lo)}</span>
        <span className="truncate text-[9px] uppercase tracking-[0.16em] text-ink-3">sq.ft</span>
        <span>{sqft(hi)}</span>
      </div>
      <div className="relative mt-1.5 flex h-5 items-center">
        <div className="absolute inset-x-0 h-px bg-ink/15" />
        <div
          className="absolute h-px bg-brass"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          className="range-dual"
          aria-label="Minimum carpet area"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          style={{ zIndex: lo > mid ? 4 : 3 }}
        />
        <input
          type="range"
          className="range-dual"
          aria-label="Maximum carpet area"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          style={{ zIndex: hi < mid ? 4 : 3 }}
        />
      </div>
    </div>
  )
}

const SortMenu = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] transition-colors duration-200',
          open ? 'border-brass/70 text-ink' : 'border-ink/15 text-ink-2 hover:text-ink',
        ].join(' ')}
      >
        <span className="hidden text-ink-3 xl:inline">Sort</span>
        <span className="max-w-28 truncate lg:max-w-32">{current.label}</span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`h-2.5 w-2.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M2.5 4.5 L6 8 L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <ul
        role="listbox"
        className={[
          'absolute right-0 z-30 mt-1.5 w-52 max-w-[80vw] origin-top-right overflow-hidden rounded-xl',
          'border border-ink/12 bg-paper py-1 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)]',
          '[backdrop-filter:blur(10px)] transition-all duration-200 ease-out',
          open
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0',
        ].join(' ')}
      >
        {SORT_OPTIONS.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={[
                'flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-[12px] transition-colors duration-150',
                o.value === value ? 'bg-ink/5 text-ink' : 'text-ink-2 hover:bg-ink/4 hover:text-ink',
              ].join(' ')}
            >
              {o.label}
              {o.value === value && <span className="h-1 w-1 rounded-full bg-brass" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default UnitFilter
