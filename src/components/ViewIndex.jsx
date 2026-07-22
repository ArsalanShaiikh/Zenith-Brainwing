import { useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion, T } from '../Gsapconfig'
import { useView } from '../hooks/useView'
import { VIEWS } from '../lib/views'
import './ViewIndex.css'

const ViewIndex = () => {
  const rootRef = useRef(null)
  const ruleRefs = useRef([])
  const { activeView, prevView, goToView } = useView()

  useGSAP(
    () => {
      const rules = ruleRefs.current.filter(Boolean)
      if (!rules.length) return

      rules.forEach((r, i) => {
        if (i !== activeView) gsap.set(r, { scaleX: 0 })
      })

      const active = rules[activeView]
      if (!active) return

      if (prevView === null || prefersReducedMotion()) {
        gsap.set(active, { scaleX: 1 })
        return
      }

      gsap.set(active, { scaleX: 0 })
      gsap.to(active, {
        scaleX: 1,
        duration: 0.5,
        ease: 'zenith',
        delay: T.indexRule / 1000,
      })
    },
    { dependencies: [activeView, prevView], scope: rootRef },
  )

  return (
    <div className="vindex" ref={rootRef}>
      {/* Short viewports get a compact readout instead of the full list. */}
      <p className="vindex__compact u-label" aria-hidden="true">
        {VIEWS[activeView].num} / 06
      </p>

      <ul className="vindex__list">
        {VIEWS.map((v, i) => (
          <li className="vindex__item" key={v.id}>
            <button
              className={`vindex__btn${i === activeView ? ' is-active' : ''}`}
              type="button"
              onClick={() => goToView(i)}
              aria-current={i === activeView ? 'true' : undefined}
            >
              <span
                className="vindex__rule"
                ref={(el) => (ruleRefs.current[i] = el)}
                aria-hidden="true"
              />
              <span className="vindex__num">{v.num}</span>
              <span className="u-sr">{v.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ViewIndex
