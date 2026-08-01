import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useVisitor } from '../hooks/useVisitor'

/** How long the "saved" confirmation holds before the row offers again. */
const DONE_DWELL = 2800

/**
 * Kept short on purpose. The row is one line inside a box that is only ~250px
 * of usable width at the narrowest desktop, so every state has to fit beside
 * the heart, the count and the arrow without ellipsing.
 */
const COPY = {
  empty: 'Mark spaces to begin',
  idle: 'Download your selection',
  working: 'Preparing your sheet',
  done: 'Saved to your device',
  error: 'Sheet failed — retry',
}

/**
 * The one *action* in a box otherwise full of destinations, so it is the one
 * thing in there wearing solid ink rather than the sheet's glass. It sits above
 * the navigation with a rule under it, which is what keeps the two from reading
 * as one list.
 *
 * The builder and pdf-lib are pulled in on the click, not on mount — nobody
 * pays for the sheet until they ask for it.
 */
const DownloadSelection = () => {
  const { name, saved, savedCount } = useVisitor()
  const rootRef = useRef(null)
  const barRef = useRef(null)
  const [state, setState] = useState('idle')

  const empty = savedCount === 0
  const busy = state === 'working'
  const label = empty ? COPY.empty : COPY[state]

  useEffect(() => {
    if (state !== 'done' && state !== 'error') return undefined
    const t = setTimeout(() => setState('idle'), DONE_DWELL)
    return () => clearTimeout(t)
  }, [state])

  // An indeterminate sweep along the foot of the row while the sheet builds —
  // the same brass hairline the loader uses, travelling instead of filling.
  useGSAP(
    () => {
      const bar = barRef.current
      if (!bar) return
      if (!busy || prefersReducedMotion()) {
        gsap.set(bar, { autoAlpha: busy ? 0.9 : 0, xPercent: 0 })
        return
      }
      gsap.set(bar, { autoAlpha: 1 })
      gsap.fromTo(
        bar,
        { xPercent: -100 },
        { xPercent: 400, duration: 1.15, ease: 'power1.inOut', repeat: -1 },
      )
    },
    { dependencies: [busy], scope: rootRef },
  )

  const onClick = async () => {
    if (empty || busy) return
    setState('working')
    try {
      const { downloadPreferenceSheet } = await import('../lib/preferencePdf')
      await downloadPreferenceSheet({ name, saved })
      setState('done')
    } catch (err) {
      console.error('Could not build the selection sheet', err)
      setState('error')
    }
  }

  return (
    <div ref={rootRef} className="border-b border-ink/14 pb-2 lg:pb-[clamp(8px,0.55vw,15px)] short:pb-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={empty || busy}
        aria-live="polite"
        aria-label={
          empty
            ? 'Mark spaces to build your sheet'
            : `${COPY[state]} — ${savedCount} marked`
        }
        className={[
          'group relative flex w-full items-center gap-2.5 overflow-hidden rounded-[5px]',
          'px-2.5 py-2 text-left transition-colors duration-300',
          'md:gap-3 md:px-3 md:py-2.5',
          'lg:gap-[clamp(8px,0.6vw,16px)] lg:px-[clamp(10px,0.7vw,20px)] lg:py-[clamp(7px,0.5vw,14px)]',
          'short:py-1.5',
          empty
            ? 'cursor-not-allowed border border-ink/12 bg-ink/4 text-ink-3'
            : 'bg-ink text-paper hover:bg-brass-ink',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={[
            'h-3.5 w-3.5 shrink-0 transition-transform duration-500 ease-zenith',
            'lg:h-[clamp(13px,0.9vw,20px)] lg:w-[clamp(13px,0.9vw,20px)]',
            empty ? 'fill-none stroke-ink-3' : 'fill-brass-lift stroke-brass-lift',
          ].join(' ')}
          strokeWidth="1.6"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>

        <span className="min-w-0 flex-1 truncate">
          <span className="block text-[10.5px] font-normal uppercase tracking-[0.11em] md:text-[11px] lg:text-[clamp(10.5px,0.6vw,15px)]">
            {label}
          </span>
        </span>

        {!empty && (
          <span
            className={[
              't-fig shrink-0 rounded-full px-1.5 text-[10px] leading-[1.6]',
              'lg:px-[clamp(6px,0.4vw,10px)] lg:text-[clamp(10px,0.55vw,14px)]',
              'bg-paper/18 text-paper',
            ].join(' ')}
          >
            {String(savedCount).padStart(2, '0')}
          </span>
        )}

        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={[
            'h-3.5 w-3.5 shrink-0 fill-none stroke-current stroke-[1.6]',
            'transition-transform duration-500 ease-zenith',
            'lg:h-[clamp(13px,0.85vw,19px)] lg:w-[clamp(13px,0.85vw,19px)]',
            empty ? '' : 'group-hover:translate-y-0.5',
          ].join(' ')}
        >
          <path d="M12 4v13M6.5 11.5 12 17l5.5-5.5M5 20h14" />
        </svg>

        {/* Build progress — a brass hairline travelling the row's foot. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <span ref={barRef} className="block h-px w-1/4 bg-brass-lift opacity-0" />
        </span>
      </button>
    </div>
  )
}

export default DownloadSelection
