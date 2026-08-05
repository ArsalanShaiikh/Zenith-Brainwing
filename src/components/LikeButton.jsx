import { useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useVisitor } from '../hooks/useVisitor'

/** Spark count and how far each one travels, in px. Fixed rather than scaled
 *  off the button: the burst reads as the same gesture at every size. */
const SPARKS = 6
const SPARK_R = 21

/** Two sizes, so the control can sit in a row of viewer chrome without being
 *  the odd one out, or tuck into the corner of a plan sheet. */
const SIZES = {
  md: {
    box: 'h-10 w-10 md:h-11 md:w-11 3xl:h-12 3xl:w-12 4xl:h-14 4xl:w-14 touch:h-11 touch:w-11',
    icon: 'h-4.5 w-4.5 md:h-5 md:w-5 3xl:h-5.5 3xl:w-5.5 4xl:h-6 4xl:w-6',
  },
  sm: {
    box: 'h-9 w-9 md:h-10 md:w-10 3xl:h-11 3xl:w-11 touch:h-11 touch:w-11',
    icon: 'h-4 w-4 md:h-4.5 md:w-4.5 3xl:h-5 3xl:w-5',
  },
}

/**
 * Two materials. `glass` is the frosted chrome every viewer over dark media
 * uses; `paper` is flat, for the explorer's cream field where the glass
 * brightness lift has no dark backdrop to work against (the same reason the
 * explorer's own back button is flat).
 */
const TONES = {
  glass: {
    base: 'glass-surface',
    off: 'shadow-[0_14px_34px_-16px_rgb(0_0_0/0.6)]',
    on: 'shadow-[0_0_0_1px_rgb(162_138_0/0.5),0_14px_34px_-16px_rgb(0_0_0/0.6)]',
  },
  paper: {
    base: 'border bg-paper',
    off: 'border-ink/15 hover:bg-paper-2',
    on: 'border-brass/55 bg-[rgb(162_138_0/0.08)]',
  },
}

/**
 * The mark control — one heart, on every surface a visitor can keep something
 * from. It owns nothing: the caller hands it a record (see lib/saveables.js)
 * and the visitor session decides whether that record is already marked.
 *
 * The animation runs from the click, never from the `on` prop. A single button
 * instance is reused as the viewer steps between frames, so its state flips
 * whenever the visitor lands on something they marked earlier — bursting there
 * would celebrate a gesture nobody made.
 */
const LikeButton = ({ record, className = '', label = 'this', size = 'md', tone = 'glass' }) => {
  const { isSaved, toggleSave } = useVisitor()
  const rootRef = useRef(null)
  const iconRef = useRef(null)
  const ringRef = useRef(null)
  const sparkRefs = useRef([])

  const on = record ? isSaved(record.id) : false

  // The ring and the sparks are laid over the button with `inset-0`, so it has
  // to be a positioned ancestor. It carries `relative` for that — but only when
  // the caller hasn't positioned it itself: emitting both `relative` and the
  // caller's `absolute` leaves the winner to stylesheet order, which is how the
  // plan-sheet heart ended up sitting under the drawing instead of on it.
  const positioned = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className)

  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const play = contextSafe((marking) => {
    const icon = iconRef.current
    const ring = ringRef.current
    const sparks = sparkRefs.current.filter(Boolean)
    if (!icon || prefersReducedMotion()) return

    gsap.killTweensOf([icon, ring, ...sparks])

    if (!marking) {
      // Letting go: a small give, then settle. No burst — nothing to celebrate.
      gsap.set([ring, ...sparks], { autoAlpha: 0 })
      gsap
        .timeline()
        .to(icon, { scale: 0.82, duration: 0.12, ease: 'power2.in' })
        .to(icon, { scale: 1, duration: 0.42, ease: 'back.out(2.4)' })
      return
    }

    gsap
      .timeline()
      // The heart is squashed into the press, then thrown back out past 1.
      .to(icon, { scale: 0.68, duration: 0.11, ease: 'power2.in' }, 0)
      .to(icon, { scale: 1, duration: 0.72, ease: 'elastic.out(1, 0.42)' }, 0.11)
      // A ring pushing out from under it.
      .fromTo(
        ring,
        { scale: 0.55, autoAlpha: 0.85 },
        { scale: 2, autoAlpha: 0, duration: 0.66, ease: 'power2.out' },
        0.08,
      )
      // Six brass sparks thrown radially, shrinking as they go.
      .fromTo(
        sparks,
        { x: 0, y: 0, scale: 0, autoAlpha: 1 },
        {
          x: (i) => Math.cos((i / SPARKS) * Math.PI * 2 - Math.PI / 2) * SPARK_R,
          y: (i) => Math.sin((i / SPARKS) * Math.PI * 2 - Math.PI / 2) * SPARK_R,
          scale: (i) => (i % 2 ? 0.7 : 1),
          autoAlpha: 0,
          duration: 0.62,
          ease: 'power2.out',
        },
        0.08,
      )
  })

  const onClick = (e) => {
    // These sit inside viewers that step on click/keys — the mark is its own
    // gesture and must not also advance the frame behind it.
    e.stopPropagation()
    if (!record) return
    play(!on)
    toggleSave(record)
  }

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Remove ${label} from your selection` : `Add ${label} to your selection`}
      title={on ? 'Remove from your selection' : 'Add to your selection'}
      className={[
        'group grid place-items-center rounded-full',
        positioned ? '' : 'relative',
        'transition-[box-shadow,background-color,border-color] duration-300',
        TONES[tone].base,
        on ? TONES[tone].on : TONES[tone].off,
        SIZES[size].box,
        className,
      ].join(' ')}
    >
      {/* Ring — pushed out from under the heart on marking. */}
      <span
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full border border-brass opacity-0"
      />

      {/* Sparks, thrown radially. They start stacked at the centre. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
        {Array.from({ length: SPARKS }, (_, i) => (
          <span
            key={i}
            ref={(el) => (sparkRefs.current[i] = el)}
            className="absolute h-1 w-1 rounded-full bg-brass opacity-0"
          />
        ))}
      </span>

      <svg
        ref={iconRef}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={[
          'relative transition-colors duration-300 ease-zenith',
          SIZES[size].icon,
          on
            ? 'fill-brass stroke-brass'
            : 'fill-none stroke-ink-2 group-hover:stroke-brass-ink',
        ].join(' ')}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}

export default LikeButton
