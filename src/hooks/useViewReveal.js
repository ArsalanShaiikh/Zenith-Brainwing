import { useGSAP, gsap, prefersReducedMotion, T } from '../Gsapconfig'
import { hideLines, revealLines } from '../animations/revealLines'
import { wipeIn } from '../animations/wipeMedia'

/**
 * The per-view half of the transition: outgoing lines slide up and out at 0ms,
 * incoming lines slide in at 420ms, incoming figures wipe at 520ms.
 *
 * Views mark their text with [data-reveal] and their figures with
 * [data-reveal-figure]. First activation skips the outgoing leg.
 */
export const useViewReveal = (active, rootRef, deps = []) => {
  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const texts = gsap.utils.toArray('[data-reveal]', root)
      const figures = gsap.utils.toArray('[data-reveal-figure]', root)

      if (!active) {
        // Park it hidden so the next activation always starts from the mask.
        if (texts.length) hideLines(texts)
        if (figures.length) {
          gsap.set(figures, { clipPath: 'inset(0% 0% 100% 0%)', opacity: 0 })
        }
        return
      }

      if (prefersReducedMotion()) {
        if (texts.length) revealLines(texts, 1)
        if (figures.length) {
          gsap.set(figures, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 })
        }
        return
      }

      const tl = gsap.timeline()
      if (texts.length) {
        hideLines(texts)
        tl.add(() => revealLines(texts, 1), T.inLines / 1000)
      }
      if (figures.length) {
        gsap.set(figures, { clipPath: 'inset(0% 0% 100% 0%)', opacity: 0 })
        tl.add(() => wipeIn(figures), T.inFigures / 1000)
      }
    },
    { dependencies: [active, ...deps], scope: rootRef },
  )
}
