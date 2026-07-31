import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { VANTAGES, TIMES, DEFAULT_VANTAGE } from '../lib/panos'
import Pano from '../components/Pano'

/**
 * The view from the tower, as the thing itself rather than a render of it: a
 * 360° pano per elevation, in daylight and at dusk. The panel keeps the same
 * instrument it always had — one elevation readout tying the view to a real
 * height — and the readout now drives which pano you are standing in.
 */

/** Sun and moon, at label scale. */
const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-[1.5]">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-[1.5]">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
)

const Views = ({ active }) => {
  const rootRef = useRef(null)
  const metreRef = useRef(null)
  const foldRef = useRef(null)

  const [i, setI] = useState(DEFAULT_VANTAGE)
  const [time, setTime] = useState('day')
  const [open, setOpen] = useState(true)
  // Matches the tile sets' own `autorotateEnabled`, minus the case where the
  // user has asked the machine to stop moving things on its own.
  const [spin, setSpin] = useState(() => !prefersReducedMotion())
  const [touched, setTouched] = useState(false)

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  // The fold. Animated on height rather than a transform so the card's glass
  // edge follows the content instead of the panel being clipped mid-collapse.
  useGSAP(
    () => {
      const el = foldRef.current
      if (!el) return
      if (prefersReducedMotion()) {
        gsap.set(el, { height: open ? 'auto' : 0, opacity: open ? 1 : 0 })
        return
      }
      gsap.to(el, {
        height: open ? 'auto' : 0,
        opacity: open ? 1 : 0,
        duration: 0.48,
        ease: 'zenith',
        overwrite: true,
      })
    },
    { dependencies: [open], scope: rootRef },
  )

  const cur = VANTAGES[i]
  const scene = cur.scenes[time]

  // eslint-disable-next-line react-hooks/refs
  const pick = contextSafe((next) => {
    if (next === i) return
    const from = VANTAGES[i].metres
    const to = VANTAGES[next].metres
    setI(next)
    const el = metreRef.current
    if (!el) return
    if (prefersReducedMotion()) {
      el.textContent = String(to)
      return
    }
    const proxy = { v: from }
    gsap.to(proxy, {
      v: to,
      duration: 0.7,
      ease: 'zenith',
      overwrite: true,
      onUpdate: () => {
        el.textContent = String(Math.round(proxy.v))
      },
    })
  })

  // Warm every vantage's cube preview at both hours, so switching elevation
  // or toggling day/evening dissolves on the spot instead of stalling on a
  // first fetch — each is one small request, and the viewer reads it straight
  // back out of cache when it actually switches there.
  useEffect(() => {
    if (!active) return
    VANTAGES.forEach((v) => {
      TIMES.forEach((t) => {
        const img = new Image()
        img.src = v.scenes[t.id].previewUrl
      })
    })
  }, [active])

  return (
    <div
      ref={rootRef}
      // This panel owns every gesture on it. The shell drives the view machine
      // off wheel / touch / pointer on the window, which would otherwise read a
      // scroll as "next view" and a drag as "swipe" — so the pano could neither
      // be zoomed nor turned. The observer's own opt-out covers the whole panel,
      // pano and card alike: on this screen a wheel zooms and a drag looks
      // around, and you leave by the back button. Keys still navigate.
      data-observer-ignore
      // Turning the pano is a drag, and a drag across a panel full of type
      // otherwise selects it — the same reason the gallery is select-none.
      className="h-full w-full select-none"
      onPointerDown={() => setTouched(true)}
    >
      {/* Full bleed: absolute against the panel resolves to the plate, padding
          and all, so the pano fills the screen while the chrome below stays
          inside the shell's reserve. */}
      <Pano
        data-reveal-figure
        scene={scene}
        active={active}
        autorotate={spin}
        className="absolute inset-0 z-0"
      />

      {/* Takes over the corner the stamp yields on this panel. Same offsets as
          the stamp at every breakpoint so the two swap in place, and the same
          sizing as the shell's back button so the plate reads as one pair of
          controls across the top. Sits outside the chrome wrapper because that
          is inset by the panel's padding, and this belongs on the plate edge. */}
      <button
        type="button"
        onClick={() => setSpin((s) => !s)}
        aria-pressed={spin}
        aria-label={spin ? 'Stop auto-rotate' : 'Start auto-rotate'}
        title={spin ? 'Stop auto-rotate' : 'Start auto-rotate'}
        className={[
          'absolute right-2 top-2 z-40 grid h-9 w-9 place-items-center rounded-full',
          'glass-surface shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)]',
          'transition-colors duration-200 hover:bg-ink hover:text-paper hover:backdrop-brightness-100',
          'touch:h-11 touch:w-11',
          'sm:right-2.5 sm:top-2.5 md:right-5 md:top-5 md:h-10 md:w-10',
          'lg:right-3 lg:top-3 3xl:right-4 3xl:top-4 3xl:h-11 3xl:w-11',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={[
            'h-4 w-4 fill-none stroke-current stroke-[1.5]',
            spin ? 'animate-spin [animation-duration:6s] motion-reduce:animate-none' : '',
          ].join(' ')}
        >
          <path d="M20.5 12a8.5 8.5 0 1 1-2.49-6.01" />
          <path d="M20.5 4.5v4h-4" />
          {!spin && <path d="M5 19 19 5" />}
        </svg>
      </button>

      {/* The chrome floats over the pano and this wrapper spans the whole
          plate, so it has to be click-through: anything hit-testable here sits
          between the cursor and Marzipano's canvas and swallows every drag and
          wheel. Each piece of chrome opts itself back in. */}
      <div className="pointer-events-none relative z-10 grid h-full w-full min-h-0 content-end justify-start lg:justify-end">
        <h1 className="sr" data-view-heading tabIndex={-1}>
          Views from Runwal Zenith
        </h1>

        {/* Drag affordance. Only where the card is on the other side, and only
            until the first touch of the plate. */}
        <p
          aria-hidden="true"
          className={[
            'pointer-events-none absolute bottom-0 left-0 hidden items-center gap-2',
            'text-paper/70 [text-shadow:0_2px_18px_rgb(0_0_0/0.6)]',
            'transition-opacity duration-500 lg:flex',
            touched ? 'opacity-0' : 'opacity-100',
          ].join(' ')}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 animate-[drift_2.4s_ease-in-out_infinite] fill-none stroke-current stroke-[1.5]"
          >
            <path d="M11 6 5 12l6 6" />
            <path d="m13 6 6 6-6 6" />
          </svg>
          <span className="t-label">Drag to look around</span>
        </p>

        <div
          data-reveal-figure
          className="pointer-events-auto glass w-[min(230px,66vw)] text-ink pb-2 pt-4 sm:w-[240px] lg:w-[220px] xl:w-[240px] 3xl:w-[280px] short:pt-3"
        >
          {/* The readout is the instrument and never folds away — only the
              elevations and the hour do, which is what hands the plate back to
              the pano on a short screen without losing where you are. */}
          <div className="flex items-start justify-between gap-1 pl-4 pr-2">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span
                  ref={metreRef}
                  className="t-fig text-[38px] leading-[0.9] tracking-[-0.03em] text-ink sm:text-[44px] 3xl:text-[54px] short:text-[32px]"
                >
                  {cur.metres}
                </span>
                <span className="t-label text-ink-3">m</span>
              </div>
              <p className="t-label pb-3 pt-1.5 text-brass-ink short:pb-2">{cur.label}</p>
            </div>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="views-vantages"
              aria-label={open ? 'Collapse elevations' : 'Choose an elevation'}
              title={open ? 'Collapse' : 'Expand'}
              className={[
                'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                'text-ink-3 transition-colors duration-200 hover:bg-ink/8 hover:text-ink',
                'touch:h-10 touch:w-10',
              ].join(' ')}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={[
                  'h-3.5 w-3.5 fill-none stroke-current stroke-[1.5]',
                  'transition-transform duration-400 ease-zenith motion-reduce:transition-none',
                  open ? '' : '-rotate-180',
                ].join(' ')}
              >
                <path d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          <div
            ref={foldRef}
            id="views-vantages"
            inert={open ? undefined : true}
            className="overflow-hidden"
          >
            <ul className="border-t border-ink/14">
              {VANTAGES.map((v, n) => {
                const on = n === i
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => pick(n)}
                      aria-pressed={on}
                      aria-label={`${v.metres} metres — ${v.label}`}
                      className={[
                        'flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors duration-200 short:py-1.5',
                        on ? 'text-ink' : 'text-ink-3 hover:bg-ink/8 hover:text-ink-2',
                      ].join(' ')}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-px transition-all duration-200 ${
                          on ? 'w-5 bg-brass' : 'w-2.5 bg-current'
                        }`}
                      />
                      <span className="min-w-[26px] text-[10px] tracking-[0.06em] tabular-nums">
                        {v.metres}
                      </span>
                      <span className={`text-[12px] 3xl:text-[13px] ${on ? 'font-normal' : 'font-light'}`}>
                        {v.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* The hour. A segmented pill rather than a switch: both states are
                somewhere you can be, neither is the off position. */}
            <div className="border-t border-ink/14 px-3 pb-1 pt-2.5 short:pt-2">
              <div className="relative grid grid-cols-2 rounded-full bg-ink/8 p-0.5">
                {/* Half the inner width exactly, so one full self-width step
                    lands it flush in the other slot. */}
                <span
                  aria-hidden="true"
                  className={[
                    'absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-2px)] rounded-full bg-ink',
                    'transition-transform duration-400 ease-zenith motion-reduce:transition-none',
                    time === 'evening' ? 'translate-x-full' : 'translate-x-0',
                  ].join(' ')}
                />
                {TIMES.map((t) => {
                  const on = t.id === time
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTime(t.id)}
                      aria-pressed={on}
                      className={[
                        'relative z-1 flex items-center justify-center gap-1.5 rounded-full py-1.5',
                        'transition-colors duration-300 short:py-1',
                        on ? 'text-paper' : 'text-ink-3 hover:text-ink',
                      ].join(' ')}
                    >
                      {t.id === 'day' ? <SunIcon /> : <MoonIcon />}
                      <span className="t-label">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Views
