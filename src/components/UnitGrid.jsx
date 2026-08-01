import { sqft } from '../lib/floorplans'

/**
 * The results half of "Search by unit" — every plan that survives the
 * current facets, rendered as a full plan-sheet card rather than a text row.
 * With no filter applied `results` is the whole catalogue, so the grid reads
 * as "all residences"; narrowing a facet removes cards directly instead of
 * hiding them behind a list. Clicking a card's image opens it in the zoom
 * viewer (see PlanZoom).
 */
const UnitGrid = ({ results, compare, toggleCompare, compareFull, onZoom, onReset }) => {
  if (results.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-ink/10 bg-ink/3 p-8 text-center md:flex-1">
        <div>
          <p className="text-[13px] text-ink-3">No residences match these filters.</p>
          <button
            type="button"
            onClick={onReset}
            className="mt-2 text-[12px] text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            Reset filters
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="no-scrollbar grid auto-rows-min grid-cols-1 gap-3 pb-2 sm:grid-cols-2 md:min-h-0 md:flex-1 md:overflow-y-auto xl:grid-cols-3">
      {results.map((p) => {
        const inCompare = compare.includes(p.key)
        return (
          <article
            key={p.key}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-paper-2 transition-colors duration-200 hover:border-ink/25"
          >
            <label
              onClick={(e) => e.stopPropagation()}
              title={inCompare ? 'Remove from compare' : 'Add to compare'}
              className="absolute left-2 top-2 z-10 grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-ink/15 bg-paper/90 [backdrop-filter:blur(4px)]"
            >
              <input
                type="checkbox"
                checked={inCompare}
                onChange={() => toggleCompare(p.key)}
                disabled={!inCompare && compareFull}
                aria-label={`Compare ${p.name}`}
                className="h-3.5 w-3.5 accent-brass disabled:opacity-30"
              />
            </label>

            <button
              type="button"
              onClick={() => onZoom(p)}
              aria-label={`Zoom into ${p.name}`}
              className="relative block aspect-[4/5] w-full overflow-hidden bg-paper-2"
            >
              <picture>
                <source type="image/webp" srcSet={`${p.base}-960.webp`} />
                <img
                  src={`${p.base}-960.jpg`}
                  alt={`${p.name} floor plan`}
                  className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                  draggable={false}
                />
              </picture>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-void/0 opacity-0 transition-all duration-200 group-hover:bg-void/25 group-hover:opacity-100">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-paper/95 text-ink shadow-[0_8px_20px_-8px_rgb(0_0_0/0.5)]">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="M20 20l-4.35-4.35M11 8.5v5M8.5 11h5" />
                  </svg>
                </span>
              </span>
            </button>

            <div className="flex flex-1 flex-col gap-1 border-t border-ink/10 p-2.5">
              <span className="truncate text-[12.5px] text-ink">{p.name}</span>
              <span className="truncate text-[10.5px] text-ink-3">
                {p.carpet ? `${sqft(p.carpet.sqft)} sq.ft carpet` : p.band}
              </span>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default UnitGrid
