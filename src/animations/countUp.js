import { gsap } from '../Gsapconfig'

/**
 * Tween a proxy object and write the rounded value out on each update, so the
 * DOM text node is never itself the animation target.
 */
export const countUp = (el, to, opts = {}) => {
  if (!el) return null
  const proxy = { v: opts.from ?? 0 }
  const pad = opts.pad ?? 3

  return gsap.to(proxy, {
    v: to,
    duration: opts.duration ?? 0.6,
    ease: opts.ease ?? 'none',
    overwrite: true,
    onUpdate: () => {
      el.textContent = String(Math.round(proxy.v)).padStart(pad, '0')
    },
    ...opts.tween,
  })
}
