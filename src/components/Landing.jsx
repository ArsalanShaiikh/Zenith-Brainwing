import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { VIEWS } from '../lib/views'
import { preloadSrc } from '../lib/images'
import { countUp } from '../animations/countUp'
import Logo from './Logo'

const MIN_MS = 1400

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    img.src = src
  })

/**
 * The landing gate. Loads on paper, counts real asset progress, then hands
 * over on a deliberate press — the pause before entering is what frames this
 * as an experience rather than a page you happened to land on.
 */
const Landing = ({ onEnter }) => {
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const counterRef = useRef(null)
  const ruleRef = useRef(null)
  const markRef = useRef(null)
  const enterRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [armed, setArmed] = useState(false)
  const [exiting, setExiting] = useState(false)

  const enterCb = useRef(onEnter)
  useEffect(() => {
    enterCb.current = onEnter
  }, [onEnter])

  useEffect(() => {
    let cancelled = false
    const started = performance.now()

    const tasks = [
      ...VIEWS.map((v) => loadImage(preloadSrc(v.img))),
      document.fonts?.ready ?? Promise.resolve(),
    ]
    let settled = 0
    for (const task of tasks) {
      task.then(() => {
        if (cancelled) return
        settled += 1
        setProgress(Math.round((settled / tasks.length) * 100))
      })
    }

    Promise.all(tasks).then(() => {
      if (cancelled) return
      const wait = Math.max(0, MIN_MS - (performance.now() - started))
      setTimeout(() => !cancelled && setArmed(true), wait)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useGSAP(
    () => {
      if (counterRef.current) countUp(counterRef.current, progress, { pad: 3 })
      if (ruleRef.current) {
        gsap.to(ruleRef.current, {
          scaleX: progress / 100,
          duration: 0.6,
          ease: 'zenith',
          overwrite: 'auto',
        })
      }
    },
    { dependencies: [progress], scope: rootRef },
  )

  useGSAP(
    () => {
      if (!markRef.current) return
      if (prefersReducedMotion()) {
        gsap.set(markRef.current, { opacity: 1, y: 0 })
        return
      }
      gsap.set(markRef.current, { opacity: 0, y: 14 })
      gsap.to(markRef.current, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'zenith',
        delay: 0.15,
      })
    },
    { scope: rootRef },
  )

  useGSAP(
    () => {
      if (!armed || !enterRef.current) return
      if (prefersReducedMotion()) {
        gsap.set(enterRef.current, { opacity: 1, y: 0 })
        return
      }
      gsap.set(enterRef.current, { opacity: 0, y: 8 })
      gsap.to(enterRef.current, { opacity: 1, y: 0, duration: 0.7, ease: 'zenith' })
    },
    { dependencies: [armed], scope: rootRef },
  )

  useGSAP(
    () => {
      if (!exiting) return

      if (prefersReducedMotion()) {
        enterCb.current?.()
        return
      }

      const chrome = [markRef.current, counterRef.current, enterRef.current].filter(
        Boolean,
      )
      // Fade the content, then hand straight over — no curtain lift here.
      // Routing unmounts this component, so any wipe started now would be cut
      // mid-flight, and the old code's clip-then-navigate left a window where
      // you saw straight through to whatever was mounted behind. The menu
      // picks the paper up on the other side and wipes it off itself, so the
      // surface reads as one continuous move.
      gsap
        .timeline({ onComplete: () => enterCb.current?.() })
        .to(chrome, {
          opacity: 0,
          y: -10,
          duration: 0.4,
          ease: 'zenith',
          stagger: 0.03,
        })
    },
    { dependencies: [exiting], scope: rootRef },
  )

  return (
    <div ref={rootRef} data-gate
      className="fixed inset-0 z-100">
      <div
        ref={panelRef}
        className="absolute inset-0 grid place-content-center place-items-center gap-6 bg-paper px-6 text-ink md:gap-7 md:px-10"
        style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      >
        <div className="flex flex-col items-center gap-4 text-center md:gap-5">
          <Logo
            reveal
            delay={0.2}
            width={200}
            className="w-33 sm:w-37.5 md:w-42 3xl:w-50"
          />

          <div ref={markRef} className="flex flex-col items-center gap-1">
            <span className="font-fine text-[clamp(38px,min(8vw,11vh),88px)] leading-none tracking-[-0.02em]">
              Zenith
            </span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.2em] text-ink-3 md:text-[10px]">
              Balkum &middot; Thane (W)
            </span>
          </div>
        </div>

        <button
          ref={enterRef}
          type="button"
          disabled={!armed}
          onClick={() => setExiting(true)}
          className={[
            'inline-flex items-center gap-2.5 rounded-full border border-hair px-5 py-2.5 opacity-0',
            'text-[10px] uppercase tracking-[0.16em] text-ink transition-colors duration-200',
            'md:px-6 md:py-3 md:text-[11px]',
            'hover:border-ink hover:bg-ink hover:text-paper',
            'disabled:pointer-events-none',
          ].join(' ')}
        >
          <span>Enter experience</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.5]">
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
        </button>

        <p
          ref={counterRef}
          className="t-fig absolute bottom-6 right-6 text-[11px] tracking-[0.12em] text-ink-3 md:bottom-9 md:right-10 md:text-[12px]"
        >
          000
        </p>

        <span
          ref={ruleRef}
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-brass"
        />

        <span className="sr" role="status" aria-live="polite">
          {armed ? 'Ready. Press enter experience.' : `Loading ${progress} percent`}
        </span>
      </div>
    </div>
  )
}

export default Landing
