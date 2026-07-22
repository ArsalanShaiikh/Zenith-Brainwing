import { useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'

/**
 * The Runwal Realty lockup.
 *
 * The supplied "SVG" is a wrapper around one embedded PNG — there are no paths
 * in it, so DrawSVG has nothing to stroke. It is revealed with a masked wipe
 * instead, which is the motion language the rest of the app already uses for
 * media. Swap `src` for real path geometry and this can become a draw.
 */
const Logo = ({ className = '', width = 240, reveal = false, delay = 0 }) => {
  const wrapRef = useRef(null)
  const imgRef = useRef(null)

  useGSAP(
    () => {
      if (!reveal) return
      const wrap = wrapRef.current
      const img = imgRef.current
      if (!wrap || !img) return

      if (prefersReducedMotion()) {
        gsap.set(wrap, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 })
        gsap.set(img, { scale: 1, y: 0 })
        return
      }

      // Wipe up from the baseline while the mark settles down into place —
      // the two directions crossing is what stops it feeling like a fade.
      gsap.set(wrap, { clipPath: 'inset(0% 0% 100% 0%)', opacity: 1 })
      gsap.set(img, { scale: 1.06, y: 10 })

      gsap
        .timeline({ delay })
        .to(wrap, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out' }, 0)
        .to(img, { scale: 1, y: 0, duration: 1.3, ease: 'zenith' }, 0)
    },
    { dependencies: [reveal], scope: wrapRef },
  )

  return (
    <span
      ref={wrapRef}
      className={`block overflow-hidden ${className}`}
      style={reveal ? { opacity: 0 } : undefined}
    >
      <picture className="block">
        <source
          type="image/webp"
          srcSet="/img/brand/runwal-240.webp 240w, /img/brand/runwal-480.webp 480w, /img/brand/runwal-960.webp 960w"
          sizes={`${width}px`}
        />
        <img
          ref={imgRef}
          src="/img/brand/runwal-480.png"
          srcSet="/img/brand/runwal-240.png 240w, /img/brand/runwal-480.png 480w, /img/brand/runwal-960.png 960w"
          sizes={`${width}px`}
          width={width}
          height={Math.round((width * 958) / 960)}
          alt="Runwal Realty"
          decoding="async"
          className="block h-auto w-full origin-bottom"
        />
      </picture>
    </span>
  )
}

export default Logo
