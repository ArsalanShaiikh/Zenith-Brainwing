import { gsap, prefersReducedMotion } from '../Gsapconfig'

export const CLIP_OPEN = 'inset(0% 0% 0% 0%)'
export const clipFrom = (dir) =>
  dir === 1 ? 'inset(0% 0% 100% 0%)' : 'inset(100% 0% 0% 0%)'
export const clipTo = (dir) =>
  dir === 1 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)'

/**
 * Clip-wipe a media element in, with its inner <img> settling from an
 * overscale. Forward wipes bottom-up, back wipes top-down.
 */
export const wipeMedia = (el, dir = 1, opts = {}) => {
  if (!el) return null
  const inner = el.querySelector('img') ?? el

  if (prefersReducedMotion()) {
    gsap.set(el, { clipPath: CLIP_OPEN, opacity: 0 })
    gsap.set(inner, { scale: 1 })
    return gsap.to(el, { opacity: 1, duration: 0.25, ease: 'none' })
  }

  gsap.set(el, { clipPath: clipFrom(dir) })
  gsap.set(inner, { scale: 1.14 })

  const tl = gsap.timeline()
  tl.to(el, { clipPath: CLIP_OPEN, duration: 0.95, ease: 'expo.out' }, 0)
  tl.to(inner, { scale: 1, duration: 1.5, ease: 'expo.out' }, 0)
  if (opts.delay) tl.delay(opts.delay)
  return tl
}

/** The outgoing image keeps drifting while it is covered. */
export const driftMedia = (el) => {
  if (!el || prefersReducedMotion()) return null
  const inner = el.querySelector('img') ?? el
  return gsap.to(inner, { scale: 1.06, duration: 1.15, ease: 'none' })
}

/** Reveal a figure already in the DOM (view content, not the media layer). */
export const wipeIn = (els, opts = {}) => {
  const list = [].concat(els).filter(Boolean)
  if (!list.length) return null

  if (prefersReducedMotion()) {
    gsap.set(list, { clipPath: CLIP_OPEN, opacity: 1 })
    return null
  }

  gsap.set(list, { clipPath: 'inset(0% 0% 100% 0%)', opacity: 1 })
  return gsap.to(list, {
    clipPath: CLIP_OPEN,
    duration: 0.9,
    ease: 'expo.out',
    stagger: 0.1,
    ...opts,
  })
}
