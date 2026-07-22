import { gsap, prefersReducedMotion } from '../Gsapconfig'

/**
 * The amenities hover move: lift the hovered tile, drop everything else to
 * 0.45. Passing null for `el` restores the whole set.
 */
export const dimSiblings = (el, list, opts = {}) => {
  const items = [].concat(list).filter(Boolean)
  if (!items.length) return

  const dim = opts.dim ?? 0.45
  const duration = opts.duration ?? 0.8

  if (!el) {
    gsap.to(items, { opacity: 1, duration, ease: 'zenith', overwrite: 'auto' })
    for (const item of items) {
      const img = item.querySelector('img')
      const label = item.querySelector('[data-tile-label]')
      if (img && !prefersReducedMotion()) {
        gsap.to(img, { scale: 1, duration, ease: 'zenith', overwrite: 'auto' })
      }
      if (label) {
        gsap.to(label, {
          opacity: 0,
          duration: 0.4,
          ease: 'zenith',
          overwrite: 'auto',
        })
      }
    }
    return
  }

  const others = items.filter((i) => i !== el)
  gsap.to(others, { opacity: dim, duration, ease: 'zenith', overwrite: 'auto' })
  gsap.to(el, { opacity: 1, duration, ease: 'zenith', overwrite: 'auto' })

  const img = el.querySelector('img')
  const label = el.querySelector('[data-tile-label]')
  if (img && !prefersReducedMotion()) {
    gsap.to(img, { scale: 1.06, duration, ease: 'zenith', overwrite: 'auto' })
  }
  if (label) {
    gsap.to(label, {
      opacity: 1,
      duration: 0.4,
      ease: 'zenith',
      overwrite: 'auto',
    })
  }
}
