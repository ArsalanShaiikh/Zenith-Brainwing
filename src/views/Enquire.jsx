import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { magnetic } from '../animations/magnetic'
import './Enquire.css'

/** Matches the breakpoints where .enq__right becomes a scroll container. */
const SCROLLS_QUERY = '(max-width: 860px), (max-height: 700px)'

const FIELDS = [
  { id: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { id: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { id: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
]

const CONFIGS = ['3 BHK Classic', '3 BHK Grand', 'Sky Residence', 'Penthouse']

const Enquire = ({ active }) => {
  const rootRef = useRef(null)
  const submitRef = useRef(null)
  const [filled, setFilled] = useState({})
  const [sent, setSent] = useState(false)
  const [scrolls, setScrolls] = useState(false)

  // Only hand the wheel to the form when it is genuinely a scroll container;
  // on desktop the column must still pass wheel through to the view machine.
  useEffect(() => {
    const mq = window.matchMedia(SCROLLS_QUERY)
    const sync = () => setScrolls(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const onPointerMove = contextSafe((e) => {
    magnetic(submitRef.current, 0.25).onPointerMove?.(e)
  })
  // eslint-disable-next-line react-hooks/refs
  const onPointerLeave = contextSafe(() => {
    magnetic(submitRef.current, 0.25).onPointerLeave?.()
  })

  const mark = (id) => (e) =>
    setFilled((f) => ({ ...f, [id]: e.target.value.trim().length > 0 }))

  const onSubmit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="vw enq" ref={rootRef}>
      <div className="vw__col enq__left">
        <p className="vw__eyebrow u-label" data-reveal>
          06 &middot; Enquire
        </p>
        <h2
          className="vw__heading u-h2"
          data-reveal
          data-view-heading
          tabIndex={-1}
        >
          Request the drawing set
        </h2>

        <dl className="enq__contact" data-reveal>
          <div className="enq__contact-row">
            <dt className="u-label">Sales</dt>
            <dd>
              <a className="enq__tel" href="tel:+912200000000">
                +91 22 0000 0000
              </a>
            </dd>
          </div>
          <div className="enq__contact-row">
            <dt className="u-label">Site</dt>
            <dd>Balkum, Thane (W) 400608</dd>
          </div>
        </dl>

        <p className="enq__rera u-label" data-reveal>
          MahaRERA P51700XXXXXX &middot; maharera.mahaonline.gov.in
        </p>
      </div>

      <div
        className="enq__right"
        {...(scrolls ? { 'data-observer-ignore': '' } : {})}
      >
        <form className="enq__form" onSubmit={onSubmit} noValidate>
          {FIELDS.map((f) => (
            <div
              className={`enq__field${filled[f.id] ? ' is-filled' : ''}`}
              key={f.id}
            >
              <label className="enq__label" htmlFor={f.id}>
                {f.label}
              </label>
              <input
                className="enq__input"
                id={f.id}
                name={f.id}
                type={f.type}
                autoComplete={f.autoComplete}
                onChange={mark(f.id)}
                onBlur={mark(f.id)}
              />
              <span className="enq__rule" aria-hidden="true" />
            </div>
          ))}

          <div className="enq__field is-filled enq__field--select">
            <label className="enq__label" htmlFor="config">
              Configuration
            </label>
            <select className="enq__input enq__select" id="config" name="config">
              {CONFIGS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="enq__rule" aria-hidden="true" />
          </div>

          <div
            className="enq__submit-wrap"
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <button
              className="u-link enq__submit"
              type="submit"
              ref={submitRef}
              data-cursor-hot
            >
              {sent ? 'Received — we will be in touch' : 'Send enquiry'}
              <span className="u-link__rule enq__submit-rule" />
            </button>
          </div>

          <p className="u-sr" aria-live="polite">
            {sent ? 'Enquiry received. We will be in touch.' : ''}
          </p>
        </form>
      </div>
    </div>
  )
}

export default Enquire
