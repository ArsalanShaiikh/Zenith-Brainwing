import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useVisitor } from '../hooks/useVisitor'
import Logo from './Logo'

/** How long the personalised welcome holds before it hands over on its own. */
const WELCOME_DWELL = 3000

/** Whether this browser will put the document itself into full screen. iOS
 *  Safari on the phone exposes the API for <video> only, so the primary button
 *  changes its promise rather than making one it can't keep. */
const fullscreenSupported = () => {
  if (typeof document === 'undefined') return false
  const el = document.documentElement
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen)
}

const requestFullscreen = async () => {
  const el = document.documentElement
  const req = el.requestFullscreen || el.webkitRequestFullscreen
  if (!req) return
  try {
    await req.call(el, { navigationUI: 'hide' })
  } catch {
    /* the browser or an admin policy said no — the visit carries on regardless */
  }
}

/** "arsalan  shaikh" → "Arsalan Shaikh". Typed on a tablet by someone who is
 *  about to see their own name set in the wordmark face, so it gets cased. */
const displayName = (raw) =>
  raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')

/**
 * The way in. Three screens on one sheet of paper:
 *   1. full screen — the tool is a walk-in kiosk, so it asks for the whole glass
 *   2. the name    — the only thing we take, and the only thing the sheet needs
 *   3. the welcome — their name in the wordmark face, then it hands over
 *
 * It sits *over* the app rather than in front of it, so the landing mounts and
 * pulls its hundred orbit frames while the visitor is still typing. By the time
 * the paper wipes up, the tower is warm and turns on the first drag.
 *
 * The wipe is this component's, not the landing's: both screens are the same
 * paper carrying the same lockup, so one surface leaves and the tower is behind
 * it. `Landing` reads `gateOpen` and holds its canvas dark until that moment
 * (see the reveal effect there).
 */
const EntryGate = () => {
  const { stage, name, setName, setStage } = useVisitor()

  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const inputRef = useRef(null)
  const leavingRef = useRef(false)

  const [leaving, setLeaving] = useState(false)
  const [draft, setDraft] = useState(name)
  const [nudge, setNudge] = useState(false)

  const showing = stage !== 'done' || leaving

  // --- Hand over to the app. ---------------------------------------------
  const finish = useCallback(() => {
    if (leavingRef.current) return
    leavingRef.current = true
    setLeaving(true)

    const root = rootRef.current
    if (!root || prefersReducedMotion()) {
      setStage('done')
      setLeaving(false)
      return
    }

    gsap
      .timeline()
      // The panel goes first, so the lockup is the last thing standing.
      .to(panelRef.current, { autoAlpha: 0, y: -10, duration: 0.32, ease: 'power2.in' })
      // Handing over here, not after the wipe: the landing needs the whole
      // wipe to scale its tower in behind this paper, so the two read as one
      // move. Waiting for the wipe to end would show a cut instead.
      .add(() => setStage('done'))
      .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' })
      .add(() => setLeaving(false))
  }, [setStage])

  // --- Stage 1 → 2. -------------------------------------------------------
  const onEnterFullscreen = async () => {
    await requestFullscreen()
    setStage('name')
  }

  // --- Stage 2 → 3. -------------------------------------------------------
  const onSubmitName = (e) => {
    e.preventDefault()
    if (displayName(draft).length < 2) {
      setNudge(true)
      inputRef.current?.focus()
      return
    }
    setNudge(false)
    setName(displayName(draft))
    setStage('welcome')
  }

  // The welcome hands over on its own; the button below it is the shortcut,
  // not the only way through.
  useEffect(() => {
    if (stage !== 'welcome' || leaving) return undefined
    const t = setTimeout(finish, WELCOME_DWELL)
    return () => clearTimeout(t)
  }, [stage, leaving, finish])

  // Focus the field once its entrance has cleared, so the caret doesn't ride
  // in on a moving element (and, on a tablet, the keyboard comes up with it).
  useEffect(() => {
    if (stage !== 'name') return undefined
    const t = setTimeout(() => inputRef.current?.focus(), 420)
    return () => clearTimeout(t)
  }, [stage])

  // --- Entrances. ---------------------------------------------------------
  useGSAP(
    () => {
      const panel = panelRef.current
      if (!panel || leavingRef.current) return
      if (prefersReducedMotion()) {
        gsap.set(panel, { autoAlpha: 1, y: 0 })
        return
      }
      gsap.fromTo(
        panel,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'zenith', delay: stage === 'fullscreen' ? 0.5 : 0.1 },
      )
    },
    { dependencies: [stage], scope: rootRef },
  )

  if (!showing) return null

  const pill = [
    'inline-flex items-center justify-center gap-2.5 rounded-full bg-ink px-6 py-3',
    'text-[10px] uppercase tracking-[0.16em] text-paper',
    'transition-colors duration-200 hover:bg-brass-ink',
    'md:px-7 md:py-3.5 md:text-[11px] 3xl:px-9 3xl:py-4 3xl:text-[12px]',
    'touch:py-4',
  ].join(' ')

  return createPortal(
    <div
      ref={rootRef}
      data-entry-gate
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Runwal Zenith"
      className="fixed inset-0 z-200 grid place-content-center place-items-center gap-6 bg-paper px-6 text-ink md:gap-7"
      style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
    >
      {/* The lockup. Deliberately the same mark, size and position as the
          landing's loader — this paper wipes off to reveal that one, and a
          logo that shifted between the two would give the seam away. */}
      <div className="flex flex-col items-center gap-4 text-center md:gap-5">
        <Logo reveal delay={0.15} width={200} className="w-33 sm:w-37.5 md:w-42 3xl:w-50" />
        <div className="flex flex-col items-center gap-1">
          <span className="font-fine text-[clamp(38px,min(8vw,11vh),88px)] leading-none tracking-[-0.02em]">
            Zenith
          </span>
          <span className="mt-1 text-[9px] uppercase tracking-[0.2em] text-ink-3 md:text-[10px]">
            Balkum &middot; Thane (W)
          </span>
        </div>
      </div>

      <div ref={panelRef} className="flex w-full max-w-[420px] flex-col items-center opacity-0">
        {stage === 'fullscreen' && (
          <div className="flex flex-col items-center gap-4 text-center md:gap-5">
            <p className="max-w-[32ch] text-[12px] font-light leading-relaxed text-ink-3 md:text-[13px]">
              {fullscreenSupported()
                ? 'Zenith is built for the whole screen. Step in, and the tower fills it.'
                : 'Zenith is built for the whole screen. Rotate to landscape for the full tower.'}
            </p>
            <button type="button" onClick={onEnterFullscreen} className={pill}>
              {fullscreenSupported() ? 'Enter Full Screen' : 'Begin'}
              {fullscreenSupported() ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              )}
            </button>
          </div>
        )}

        {stage === 'name' && (
          <form onSubmit={onSubmitName} className="flex w-full flex-col items-center gap-5 md:gap-6">
            <div className="flex w-full flex-col items-center gap-3">
              <label
                htmlFor="visitor-name"
                className="t-label text-center text-ink-3"
              >
                May we have your name
              </label>
              <input
                ref={inputRef}
                id="visitor-name"
                name="name"
                type="text"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  if (nudge) setNudge(false)
                }}
                placeholder="Your name"
                maxLength={40}
                autoComplete="name"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-describedby={nudge ? 'visitor-name-hint' : undefined}
                className={[
                  'w-full border-b bg-transparent pb-2 text-center outline-none',
                  'font-fine text-[clamp(26px,4.5vw,40px)] leading-[1.1] tracking-[-0.01em] text-ink',
                  'placeholder:font-ui placeholder:text-[15px] placeholder:tracking-[0.02em] placeholder:text-ink-3/55',
                  'transition-colors duration-300',
                  nudge ? 'border-brass-ink' : 'border-ink/22 focus:border-brass',
                ].join(' ')}
              />
              <p
                id="visitor-name-hint"
                role={nudge ? 'alert' : undefined}
                className={[
                  'text-[11px] font-light transition-opacity duration-300 md:text-[12px]',
                  nudge ? 'text-brass-ink opacity-100' : 'text-ink-3 opacity-100',
                ].join(' ')}
              >
                {nudge
                  ? 'A name, so we can put it on your sheet.'
                  : 'We print it on the selection you take home.'}
              </p>
            </div>

            <button type="submit" className={pill}>
              Continue
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        )}

        {stage === 'welcome' && (
          <div className="flex flex-col items-center gap-4 text-center md:gap-5">
            <div className="flex flex-col items-center gap-1">
              <span className="t-label text-ink-3">Welcome</span>
              <span className="font-fine text-[clamp(30px,5.5vw,56px)] leading-[1.05] tracking-[-0.02em] text-ink">
                {name}
              </span>
            </div>
            <p className="max-w-[34ch] text-[12px] font-light leading-relaxed text-ink-3 md:text-[13px]">
              Mark what you like as you go. We&rsquo;ll gather it into a sheet you can
              take with you.
            </p>
            <button type="button" onClick={finish} className={pill}>
              Enter
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* The same brass hairline the loader finishes on, so the seam between
          the two sheets of paper has nothing to show. */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-brass" />
    </div>,
    document.body,
  )
}

export default EntryGate
