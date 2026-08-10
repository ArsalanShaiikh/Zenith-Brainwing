import { useEffect, useState } from 'react'
import { ISO_UNITS } from '../lib/isoUnits'
import IsoFrameStage from './IsoFrameStage'

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-[1.6]">
    <path d="M15 5 8 12l7 7" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

/**
 * Entry point into the isometric walkthrough from the compare flow: pick a
 * configuration (3 BHK / 4 BHK) off two preview cards, then pan through that
 * unit's baked frame sequence. A modal rather than a route, same as
 * UnitCompare and PlanZoom — this is a side-trip off comparing, not its own
 * destination. Reopens on the picker every time (state reset on close),
 * so a visitor always chooses fresh rather than resuming a stale unit.
 *
 * It does not ask the browser for full screen, and it never hands it back. The
 * whole visit is already full screen — the entry gate takes it, FullscreenGuard
 * puts the ask back the moment it's lost — so moving that ownership onto this
 * wrapper only bought a round trip out through the guard's sheet on the way
 * into the walkthrough, and another on the way back from a panorama. Picking a
 * configuration just takes the overlay edge to edge, in the glass we already
 * hold.
 */
const IsoWalkthroughModal = ({ open, onClose, initialUnitId }) => {
  const [unitId, setUnitId] = useState(initialUnitId ?? null)
  // Resets on each reopen — adjusted during render (as PlanZoom does for its
  // own open-state reset) rather than in an effect, since this component
  // stays mounted across opens/closes. The sidebar's configuration cards now
  // pick a unit before this ever opens, so it starts straight on the
  // walkthrough rather than its own picker screen.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setUnitId(initialUnitId ?? null)
  }

  useEffect(() => {
    if (!open) return
    // Browser's own fullscreen exit already answers Escape when we're
    // fullscreen — taking it too would close the whole modal in the same
    // keystroke, same guard PanoramaModal uses.
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const unit = ISO_UNITS.find((u) => u.id === unitId) ?? null
  // The walkthrough itself is the screen; the picker is still a sheet on top
  // of the plan behind it.
  const immersive = Boolean(unit)

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center bg-void/70 [backdrop-filter:blur(4px)] ${
        immersive ? 'bg-void p-0' : 'p-3 sm:p-6'
      }`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Isometric interior walkthrough"
        onClick={(e) => e.stopPropagation()}
        className={`card m-0 flex w-full flex-col overflow-hidden p-0 ${
          immersive ? 'h-full max-w-none rounded-none' : 'h-[92vh] max-w-[1600px]'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink/12 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3">
            {unit && (
              <button
                type="button"
                onClick={() => setUnitId(null)}
                aria-label="Back to configuration picker"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-ink-2 transition-colors duration-200 hover:text-ink touch:px-3.5 touch:py-2"
              >
                <BackIcon />
                Back
              </button>
            )}
            <div className="min-w-0">
              <p className="t-label text-ink-3">Interior walkthrough</p>
              <h3 className="mt-1 truncate font-fine text-[20px] leading-tight text-ink sm:text-[24px] lg:text-[28px]">
                {unit ? unit.label : 'Choose a configuration'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close walkthrough"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/15 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper touch:h-11 touch:w-11 lg:h-9 lg:w-9"
          >
            <CloseIcon />
          </button>
        </div>

        <div
          className={[
            'relative flex flex-1 items-center justify-center',
            immersive ? 'overflow-hidden bg-void' : 'overflow-y-auto bg-paper-2 p-4 sm:p-6',
          ].join(' ')}
        >
          {unit ? (
            <IsoFrameStage key={unit.id} unit={unit} fill />
          ) : (
            <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-4xl lg:gap-6 xl:max-w-5xl">
              {ISO_UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUnitId(u.id)}
                  className="group relative overflow-hidden rounded-xl border border-ink/12 bg-neutral-900 text-left shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)] transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ aspectRatio: '4 / 3' }}
                >
                  <img
                    src={`${u.basePath}/${u.framePrefix}${String(0).padStart(u.padLength, '0')}${u.extension}`}
                    alt={`${u.label} isometric preview`}
                    className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100"
                    draggable={false}
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-void/80 via-void/10 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-4 lg:p-5">
                    <span className="font-fine text-[22px] leading-none text-paper sm:text-[26px] lg:text-[30px]">
                      {u.label}
                    </span>
                    <span className="t-label rounded-full border border-paper/30 px-3 py-1.5 text-paper/90 transition-colors duration-200 group-hover:border-paper/60">
                      View interiors
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IsoWalkthroughModal
