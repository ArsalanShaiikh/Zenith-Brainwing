import { useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'

/**
 * The opening panel. Deliberately near-empty: the render carries it, and the
 * only interface is an elevation readout tying the view to a real height.
 */
const VANTAGES = [
  { id: 'podium', label: 'Podium', level: 'L05', metres: 18, facing: 'Balkum' },
  { id: 'mid', label: 'Mid rise', level: 'L24', metres: 78, facing: 'Thane creek' },
  { id: 'high', label: 'High rise', level: 'L40', metres: 130, facing: 'Yeoor hills' },
  { id: 'crown', label: 'Crown', level: 'L52', metres: 168, facing: 'Open horizon' },
]

const Views = ({ active }) => {
  const rootRef = useRef(null)
  const [i, setI] = useState(3)
  const metreRef = useRef(null)

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const pick = contextSafe((next) => {
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

  const cur = VANTAGES[i]

  return (
    <div ref={rootRef} className="grid h-full w-full min-h-0 content-end justify-start lg:justify-end">
      <h1 className="sr" data-view-heading tabIndex={-1}>
        Views from Runwal Zenith
      </h1>

      <div
        data-reveal-figure
        className="glass w-[min(230px,66vw)] text-ink pb-2 pt-4 sm:w-[240px] lg:w-[220px] xl:w-[240px] 3xl:w-[280px]"
      >
        <div className="flex items-baseline gap-1.5 px-4">
          <span
            ref={metreRef}
            className="t-fig text-[38px] leading-[0.9] tracking-[-0.03em] text-ink sm:text-[44px] 3xl:text-[54px]"
          >
            {cur.metres}
          </span>
          <span className="t-label text-ink-3">m</span>
        </div>

        <p className="t-label px-4 pb-3 pt-1.5 text-brass-ink">{cur.facing}</p>

        <ul className="border-t border-ink/14">
          {VANTAGES.map((v, n) => {
            const on = n === i
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => pick(n)}
                  aria-pressed={on}
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
                    {v.level}
                  </span>
                  <span className={`text-[12px] 3xl:text-[13px] ${on ? 'font-normal' : 'font-light'}`}>
                    {v.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default Views
