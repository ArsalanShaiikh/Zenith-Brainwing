import { lazy, Suspense, useRef, useState } from 'react'
import { useViewReveal } from '../hooks/useViewReveal'
import { GROUPS, POIS } from '../map/locationData'

// MapLibre is heavy; only pull it in once the Location view is actually opened.
const LocationMap = lazy(() => import('../map/LocationMap'))

const Location = ({ active }) => {
  const rootRef = useRef(null)
  const [activeId, setActiveId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  useViewReveal(active, rootRef)

  // Only build the map while the view is actually open — no point loading
  // MapLibre and its tiles for a panel the user hasn't reached. It re-mounts
  // on revisit, which is cheap with tiles cached, and the void backdrop means
  // there is never a white flash while it re-initialises.
  const select = (id) => setActiveId((cur) => (cur === id ? null : id))

  // absolute inset-0 breaks out of the view's chrome-clearing padding so the
  // map runs full-bleed to the plate; the panel is then positioned by hand to
  // clear the back button and the status chip.
  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      {/* Full-bleed map. data-observer-ignore keeps wheel/drag on the map for
          panning and zoom instead of triggering a view change. */}
      <div className="absolute inset-0 z-0 bg-void" data-observer-ignore>
        {active && (
          <Suspense fallback={null}>
            <LocationMap
              activeId={activeId}
              hoveredId={hoveredId}
              onSelect={setActiveId}
              onHover={setHoveredId}
            />
          </Suspense>
        )}
      </div>

      {/* Destination panel — floating glass. Bottom sheet on phone/tablet,
          left card from lg up. */}
      <div
        data-reveal-figure
        data-observer-ignore
        className={[
          'glass absolute z-10 flex flex-col overflow-hidden rounded-plate',
          // phone / tablet: bottom sheet. On a short (landscape) viewport it
          // takes more of the height, since there is little to begin with.
          'inset-x-2 bottom-2 max-h-[54%] sm:inset-x-2.5 sm:bottom-2.5 md:inset-x-5 md:bottom-5',
          'short:max-h-[82%]',
          // lg+: left card, vertically centred
          'lg:inset-x-auto lg:bottom-auto lg:left-3 lg:top-1/2 lg:max-h-[min(560px,84%)]',
          'lg:w-[clamp(320px,25vw,460px)] lg:-translate-y-1/2 3xl:left-4',
        ].join(' ')}
      >
        <div className="shrink-0 border-b border-ink/12 px-5 py-4 sm:px-6 short:py-2.5 lg:px-[clamp(20px,1.5vw,32px)] lg:py-[clamp(16px,1.2vw,26px)]">
          <p
            data-reveal
            className="t-label flex items-center gap-2 text-ink-3 before:h-px before:w-3.5 before:bg-brass before:content-['']"
          >
            03 &middot; Location
          </p>
          <h2
            data-reveal
            data-view-heading
            tabIndex={-1}
            className="t-h2 mt-1.5 text-ink outline-none short:mt-1 short:text-[17px]"
          >
            Balkum, and everything from it
          </h2>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain py-1.5">
          {GROUPS.map((g, gi) => (
            <section key={g.id} className={gi > 0 ? 'mt-1 border-t border-ink/10 pt-1' : ''}>
              <h3 className="t-label px-5 pb-1 pt-2 text-ink-3 lg:px-[clamp(20px,1.5vw,32px)]">
                {g.label}
              </h3>
              <ul>
                {g.pois.map((poi) => {
                  const on = activeId === poi.id
                  return (
                    <li key={poi.id}>
                      <button
                        type="button"
                        onClick={() => select(poi.id)}
                        onPointerEnter={() => setHoveredId(poi.id)}
                        onPointerLeave={() => setHoveredId(null)}
                        aria-pressed={on}
                        className={[
                          'flex w-full items-center gap-3 border-l-2 px-5 py-2.5 text-left transition-colors duration-200 short:py-1.5',
                          'lg:px-[clamp(20px,1.5vw,32px)] lg:py-[clamp(9px,0.7vw,16px)]',
                          on
                            ? 'border-brass bg-ink/8 text-ink'
                            : 'border-transparent text-ink-2 hover:border-brass hover:bg-ink/6 hover:text-ink',
                        ].join(' ')}
                      >
                        <span
                          aria-hidden="true"
                          className={`block shrink-0 rounded-full transition-all duration-200 ${
                            on ? 'h-2 w-2 bg-brass' : 'h-1.5 w-1.5 bg-ink/25'
                          }`}
                        />
                        <span className="flex-1 text-[14px] font-light lg:text-[clamp(14px,0.95vw,17px)]">
                          {poi.place}
                        </span>
                        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                          <span className="t-fig text-[13px] text-ink lg:text-[clamp(13px,0.85vw,16px)]">
                            {poi.dist}
                          </span>
                          <span className="t-label text-[9px] text-ink-3">{poi.time}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          <p className="px-5 pb-2 pt-2.5 text-[9px] uppercase leading-relaxed tracking-widest text-ink-3 lg:px-[clamp(20px,1.5vw,32px)]">
            {POIS.length} landmarks &middot; drive times approximate
          </p>
        </div>
      </div>
    </div>
  )
}

export default Location
