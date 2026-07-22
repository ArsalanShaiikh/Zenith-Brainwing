import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { VIEWS } from '../lib/views'
import { preloadSrc } from '../lib/images'
import { countUp } from '../animations/countUp'
import './Preloader.css'

const MIN_MS = 1400
const WORDS = ['Elevation', 'beyond', 'imagination']

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    img.src = src
  })

const Preloader = ({ onReveal, onFinish }) => {
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const counterRef = useRef(null)
  const ruleRef = useRef(null)
  const wordRefs = useRef([])
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)

  // Kept in refs so the exit timeline never closes over a stale callback.
  const revealRef = useRef(onReveal)
  const finishRef = useRef(onFinish)
  useEffect(() => {
    revealRef.current = onReveal
    finishRef.current = onFinish
  }, [onReveal, onFinish])

  // ---- real asset progress -------------------------------------------
  useEffect(() => {
    let cancelled = false
    const started = performance.now()

    // Every view image, plus the fonts — the transitions must never wait
    // on network once the curtain is up.
    const tasks = [
      ...VIEWS.map((v) => loadImage(preloadSrc(v.img))),
      document.fonts?.ready ?? Promise.resolve(),
    ]

    let settled = 0
    const total = tasks.length

    for (const task of tasks) {
      task.then(() => {
        if (cancelled) return
        settled += 1
        setProgress(Math.round((settled / total) * 100))
      })
    }

    Promise.all(tasks).then(() => {
      if (cancelled) return
      const elapsed = performance.now() - started
      const wait = Math.max(0, MIN_MS - elapsed)
      setTimeout(() => !cancelled && setExiting(true), wait)
    })

    return () => {
      cancelled = true
    }
  }, [])

  // ---- counter + rule track real progress ------------------------------
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

  // ---- entrance --------------------------------------------------------
  useGSAP(
    () => {
      const words = wordRefs.current.filter(Boolean)
      if (!words.length) return

      if (prefersReducedMotion()) {
        gsap.set(words, { yPercent: 0 })
        return
      }

      gsap.set(words, { yPercent: 110 })
      gsap.to(words, {
        yPercent: 0,
        duration: 1.0,
        ease: 'zenith',
        stagger: 0.08,
        delay: 0.15,
      })
    },
    { scope: rootRef },
  )

  // ---- exit ------------------------------------------------------------
  useGSAP(
    () => {
      if (!exiting) return

      const words = wordRefs.current.filter(Boolean)
      const chrome = [counterRef.current, ruleRef.current].filter(Boolean)

      if (prefersReducedMotion()) {
        revealRef.current?.()
        gsap.to(rootRef.current, {
          opacity: 0,
          duration: 0.25,
          ease: 'none',
          onComplete: () => finishRef.current?.(),
        })
        return
      }

      const tl = gsap.timeline({ onComplete: () => finishRef.current?.() })

      tl.to([...words, ...chrome], {
        opacity: 0,
        y: -12,
        duration: 0.5,
        ease: 'zenith',
        stagger: 0.02,
      })
        .to(
          panelRef.current,
          {
            clipPath: 'inset(0% 0% 100% 0%)',
            duration: 1.1,
            ease: 'expo.inOut',
          },
          '-=0.1',
        )
        // Hand over at ~60% of the curtain so the home content and chrome are
        // already arriving as the panel clears. Unmount happens on complete.
        .add(() => revealRef.current?.(), '-=0.44')
    },
    { dependencies: [exiting], scope: rootRef },
  )

  return (
    <div className="pre" ref={rootRef} role="status" aria-live="polite">
      <div className="pre__panel" ref={panelRef}>
        <p className="pre__line">
          {WORDS.map((w, i) => (
            <span className="pre__mask" key={w}>
              <span
                className="pre__word"
                ref={(el) => (wordRefs.current[i] = el)}
              >
                {w}
              </span>
            </span>
          ))}
        </p>

        <p className="pre__counter" ref={counterRef}>
          000
        </p>

        <span className="pre__rule" ref={ruleRef} aria-hidden="true" />
        <span className="u-sr">Loading {progress} percent</span>
      </div>
    </div>
  )
}

export default Preloader
