import { gsap, SplitText, prefersReducedMotion } from '../Gsapconfig'

const splits = new WeakMap()

/** Split once per element and cache; re-splitting on every view change leaks. */
const linesOf = (el) => {
  if (!el) return []
  let split = splits.get(el)
  if (!split) {
    split = new SplitText(el, {
      type: 'lines',
      linesClass: 'u-split-line',
      // Each line gets its own overflow-hidden mask so yPercent slides clip.
      mask: 'lines',
    })
    splits.set(el, split)
  }
  return split.lines
}

/** Park lines below their mask, ready to be revealed. */
export const hideLines = (els) => {
  const lines = [].concat(els).flatMap(linesOf)
  if (!lines.length) return lines
  gsap.set(lines, { yPercent: prefersReducedMotion() ? 0 : 110 })
  return lines
}

/**
 * Slide lines into place. dir 1 = arriving, -1 = leaving (slides up and out).
 * Always .set() then .to() — never .from().
 */
export const revealLines = (els, dir = 1, opts = {}) => {
  const lines = [].concat(els).flatMap(linesOf)
  if (!lines.length) return null

  if (prefersReducedMotion()) {
    gsap.set(lines, { yPercent: 0 })
    return null
  }

  if (dir === 1) {
    gsap.set(lines, { yPercent: 110 })
    return gsap.to(lines, {
      yPercent: 0,
      duration: 0.9,
      ease: 'zenith',
      stagger: 0.06,
      ...opts,
    })
  }

  return gsap.to(lines, {
    yPercent: -110,
    duration: 0.5,
    ease: 'zenith',
    stagger: 0.04,
    ...opts,
  })
}

export const revertLines = (el) => {
  const split = splits.get(el)
  if (split) {
    split.revert()
    splits.delete(el)
  }
}
