import { gsap, prefersReducedMotion } from '../Gsapconfig'

/**
 * Returns pointer handlers that pull an element toward the cursor.
 * Wrap the returned handlers in contextSafe() at the call site so the
 * tweens are owned by the component's gsap context.
 */
export const magnetic = (el, strength = 0.25) => {
  if (!el || prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) {
    return { onPointerMove: undefined, onPointerLeave: undefined }
  }

  const onPointerMove = (e) => {
    const r = el.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    gsap.to(el, {
      x: dx * strength,
      y: dy * strength,
      duration: 0.5,
      ease: 'zenith',
    })
  }

  const onPointerLeave = () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
  }

  return { onPointerMove, onPointerLeave }
}
