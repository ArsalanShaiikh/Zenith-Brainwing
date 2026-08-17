import { useLocation } from 'react-router-dom'
import { useVisitor } from '../hooks/useVisitor'

/**
 * The studio credit — "Powered by Brainwing Innovations" — parked in the
 * bottom-right corner of every screen.
 *
 * Mounted once at the app root rather than per screen, so it survives route
 * changes without remounting and reads as part of the device rather than part
 * of any one panel. It sits at z-150: above every screen (each roots at z-100)
 * and below the entry gate (z-200) and the fullscreen guard (z-210), which own
 * the screen outright while they are up. That ordering is deliberate — the
 * lockup is white with transparency, so it disappears on those paper surfaces
 * and has no business floating over them.
 *
 * Two screens keep something of their own on the floor, and the mark yields
 * rather than stacking on top:
 *   • Gallery runs a thumbnail rail along the bottom edge — the mark lifts to
 *     clear it.
 *   • Location puts its destination panel on the floor as a full-width sheet
 *     below lg, leaving no corner to sit in; from lg up that panel becomes a
 *     left card and the corner frees up again.
 *
 * The bottom-left blocks that share this band (the landing hero, the gallery
 * title, the showcase caption) each reserve a right lane wide enough for the
 * mark plus its inset, so nothing runs underneath it at any width.
 */

/** Small enough to read as a credit rather than a second brand. The two
 *  max-height variants matter on landscape phones, where vertical room is the
 *  scarce axis — they are listed last so they win over the width steps. */
const SIZE = [
  'w-21 sm:w-24 md:w-28 lg:w-31 3xl:w-37 4xl:w-43',
  'short:w-19 stubby:w-17',
].join(' ')

/** `max()` against the safe-area insets keeps the mark off the home indicator
 *  and out from under a notch when a phone is held in landscape. */
const INSET_X = [
  'pr-[max(1rem,env(safe-area-inset-right))]',
  'md:pr-[max(1.5rem,env(safe-area-inset-right))]',
  'lg:pr-[max(1.75rem,env(safe-area-inset-right))]',
  '3xl:pr-[max(2.5rem,env(safe-area-inset-right))]',
].join(' ')

const INSET_Y = [
  'pb-[max(1rem,env(safe-area-inset-bottom))]',
  'md:pb-[max(1.5rem,env(safe-area-inset-bottom))]',
  'lg:pb-[max(1.75rem,env(safe-area-inset-bottom))]',
  '3xl:pb-[max(2.5rem,env(safe-area-inset-bottom))]',
].join(' ')

/** Clears the gallery's thumbnail rail: 44px thumb + 24px padding below md,
 *  52px + 32px from md up, plus a gap. */
const INSET_Y_GALLERY = [
  'pb-[calc(78px+env(safe-area-inset-bottom))]',
  'md:pb-[calc(96px+env(safe-area-inset-bottom))]',
].join(' ')

/** The lane the bottom-left blocks hold open for this mark lives in
 *  lib/brandLane.js, next to the arithmetic that ties the two together. */

const BrandMark = () => {
  const { gateOpen } = useVisitor()
  const { pathname } = useLocation()

  // The gate is a full sheet of paper; a white lockup has nothing to say there.
  if (gateOpen) return null

  const onGallery = pathname === '/gallery'
  const onLocation = pathname === '/location'

  return (
    <div
      className={[
        'pointer-events-none fixed bottom-0 right-0 z-150',
        INSET_X,
        onGallery ? INSET_Y_GALLERY : INSET_Y,
        onLocation ? 'hidden lg:block' : '',
      ].join(' ')}
    >
      <picture className="block">
        <source
          type="image/webp"
          srcSet="/img/brand/brainwing-240.webp 240w, /img/brand/brainwing-480.webp 480w"
          sizes="(min-width: 1920px) 148px, (min-width: 1024px) 124px, (min-width: 768px) 112px, 96px"
        />
        <img
          src="/img/brand/brainwing-480.png"
          srcSet="/img/brand/brainwing-240.png 240w, /img/brand/brainwing-480.png 480w"
          sizes="(min-width: 1920px) 148px, (min-width: 1024px) 124px, (min-width: 768px) 112px, 96px"
          width={480}
          height={128}
          alt="Powered by Brainwing Innovations"
          decoding="async"
          // The lockup is white, and the media behind it is not always dark —
          // a bright sky in a render would otherwise swallow it.
          className={`block h-auto opacity-70 drop-shadow-[0_1px_8px_rgb(0_0_0/0.55)] ${SIZE}`}
        />
      </picture>
    </div>
  )
}

export default BrandMark
