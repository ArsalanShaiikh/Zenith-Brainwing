import { FEATURE_LABELS, sqft } from '../lib/floorplans'

/** One row per stated fact, in the order the plan sheets read. Reference
 *  plans carry no carpet/balcony/total, so those cells fall through to '—'. */
const ROWS = [
  { label: 'Configuration', get: (p) => p.config },
  { label: 'Bedrooms', get: (p) => p.bedrooms ?? '—' },
  { label: 'RERA carpet', get: (p) => (p.carpet ? `${sqft(p.carpet.sqft)} sq.ft` : '—') },
  { label: 'Balcony', get: (p) => (p.balcony ? `${sqft(p.balcony.sqft)} sq.ft` : '—') },
  { label: 'Total', get: (p) => (p.total ? `${sqft(p.total.sqft)} sq.ft` : '—') },
  { label: 'Living room', get: (p) => p.living ?? '—' },
  {
    label: 'Features',
    get: (p) => (p.features?.length ? p.features.map((f) => FEATURE_LABELS[f]).join(', ') : '—'),
  },
]

/**
 * Side-by-side compare — the 2–3 residences picked from the unit list, read
 * off the same facts the search results and the plan readout already show.
 * A modal rather than a route: comparing is a quick side-trip off the search,
 * not a destination of its own.
 */
const UnitCompare = ({ open, plans, onClose, onRemove }) => {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-void/55 p-4 [backdrop-filter:blur(4px)]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compare residences"
        onClick={(e) => e.stopPropagation()}
        className="card m-0 max-h-[85vh] w-full max-w-3xl overflow-y-auto p-4 sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="t-h2 text-[18px] sm:text-[20px]">Compare residences</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close compare"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/15 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {plans.length === 0 ? (
          <p className="mt-4 text-[12px] text-ink-3">No residences selected.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="w-32 border-b border-hair pb-2 pr-2" />
                  {plans.map((p) => (
                    <th key={p.key} className="border-b border-hair px-2 pb-2 align-bottom">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-normal text-ink">{p.name}</span>
                        <button
                          type="button"
                          onClick={() => onRemove(p.key)}
                          aria-label={`Remove ${p.name} from compare`}
                          className="shrink-0 text-[11px] text-ink-3 hover:text-ink"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className="t-label border-b border-hair py-2 pr-2 text-ink-3 font-normal"
                    >
                      {row.label}
                    </th>
                    {plans.map((p) => (
                      <td
                        key={p.key}
                        className={`border-b border-hair px-2 py-2 text-[12.5px] ${
                          row.label === 'Total' ? 'text-brass-ink' : 'text-ink'
                        }`}
                      >
                        {row.get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default UnitCompare
