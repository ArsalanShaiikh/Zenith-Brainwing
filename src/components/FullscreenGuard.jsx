import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useVisitor } from '../hooks/useVisitor'
import {
  fullscreenSupported,
  isFullscreen,
  onFullscreenChange,
  requestFullscreen,
} from '../lib/fullscreen'
import Logo from './Logo'

/** Set the first time this browser actually reaches full screen. It is what
 *  arms the guard, and it is why a *refused* request can never trap anyone:
 *  a screen we have never held is a screen we never ask to have back. Kept in
 *  sessionStorage so a refresh mid-visit — which drops full screen on every
 *  desktop browser — still comes back to the prompt rather than to a window. */
const OK_KEY = 'zenith.fullscreen.ok'

const readArmed = () => {
  try {
    return sessionStorage.getItem(OK_KEY) === '1'
  } catch {
    return false
  }
}

const writeArmed = () => {
  try {
    sessionStorage.setItem(OK_KEY, '1')
  } catch {
    /* private mode — the guard just won't survive a refresh */
  }
}

/**
 * The screen stays whole.
 *
 * The entry gate asks for full screen once; this puts the same ask back on the
 * glass the moment the browser hands the window back — Esc, F11, the tablet's
 * chrome swipe. Anywhere on the sheet is the button, same as the gate.
 *
 * It only arms after full screen has genuinely been held (see `OK_KEY`), so a
 * browser or kiosk policy that refuses the request leaves the visit windowed
 * and usable rather than stuck behind a sheet that can't be dismissed.
 *
 * While the gate is still up it stays out of the way: that paper owns the
 * screen, and it carries the same prompt already.
 */
const FullscreenGuard = () => {
  const { gateOpen } = useVisitor()

  const rootRef = useRef(null)
  const armedRef = useRef(readArmed())

  // Read straight from storage for the first paint: an armed refresh must come
  // back to the sheet, not flash the app behind it for a frame first.
  const [out, setOut] = useState(() => fullscreenSupported() && readArmed() && !isFullscreen())

  useEffect(() => {
    if (!fullscreenSupported()) return undefined
    const sync = () => {
      if (isFullscreen()) {
        armedRef.current = true
        writeArmed()
        setOut(false)
        return
      }
      setOut(armedRef.current)
    }
    sync()
    return onFullscreenChange(sync)
  }, [])

  const restore = useCallback(() => {
    requestFullscreen()
  }, [])

  const showing = out && !gateOpen

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      if (prefersReducedMotion()) {
        gsap.set(root, { autoAlpha: 1 })
        return
      }
      gsap.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
    },
    { dependencies: [showing], scope: rootRef },
  )

  if (!showing) return null

  return createPortal(
    <div
      ref={rootRef}
      data-fullscreen-guard
      role="dialog"
      aria-modal="true"
      aria-label="Return to full screen"
      onClick={restore}
      className="fixed inset-0 z-210 grid cursor-pointer place-content-center place-items-center gap-6 bg-paper px-6 text-ink opacity-0 md:gap-7"
    >
      <div className="flex flex-col items-center gap-4 text-center md:gap-5">
        <Logo width={200} className="w-33 sm:w-37.5 md:w-42 3xl:w-50" />
        <div className="flex flex-col items-center gap-1">
          <span className="font-fine text-[clamp(38px,min(8vw,11vh),88px)] leading-none tracking-[-0.02em]">
            Zenith
          </span>
          <span className="mt-1 text-[9px] uppercase tracking-[0.2em] text-ink-3 md:text-[10px]">
            Balkum &middot; Thane (W)
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 text-center md:gap-5">
        <p className="max-w-[32ch] text-[12px] font-light leading-relaxed text-ink-3 md:text-[13px]">
          Zenith is built for the whole screen. Step back in to carry on where you
          left off.
        </p>
        <button
          type="button"
          onClick={restore}
          className={[
            'inline-flex items-center justify-center gap-2.5 rounded-full bg-ink px-6 py-3',
            'text-[10px] uppercase tracking-[0.16em] text-paper',
            'transition-colors duration-200 hover:bg-brass-ink',
            'md:px-7 md:py-3.5 md:text-[11px] 3xl:px-9 3xl:py-4 3xl:text-[12px]',
            'touch:py-4',
          ].join(' ')}
        >
          Return to Full Screen
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]"
          >
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink-3/70 md:text-[11px]">
          or tap anywhere
        </span>
      </div>

      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-brass" />
    </div>,
    document.body,
  )
}

export default FullscreenGuard
