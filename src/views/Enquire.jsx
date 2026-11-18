import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { magnetic } from '../animations/magnetic'
import { submitEnquiry, validateEnquiry } from '../lib/enquiries'

const FIELDS = [
  { id: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { id: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { id: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
]

const CONFIGS = ['3 BHK', 'Jodi / combined', 'Not sure yet']

const Enquire = ({ active }) => {
  const rootRef = useRef(null)
  const submitRef = useRef(null)
  const [filled, setFilled] = useState({})
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState({})
  const formRef = useRef(null)

  // On a shared exhibition screen the next visitor must not find the last
  // one's name, phone and email still on the form. Clear it shortly after
  // the confirmation has been seen.
  useEffect(() => {
    if (!sent) return undefined
    const t = setTimeout(() => {
      formRef.current?.reset()
      setFilled({})
      setSent(false)
    }, 6000)
    return () => clearTimeout(t)
  }, [sent])

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  // eslint-disable-next-line react-hooks/refs
  const onPointerMove = contextSafe((e) => {
    magnetic(submitRef.current, 0.2).onPointerMove?.(e)
  })
  // eslint-disable-next-line react-hooks/refs
  const onPointerLeave = contextSafe(() => {
    magnetic(submitRef.current, 0.2).onPointerLeave?.()
  })

  const mark = (id) => (e) =>
    setFilled((f) => ({ ...f, [id]: e.target.value.trim().length > 0 }))

  return (
    <div ref={rootRef} className="grid h-full w-full min-h-0 place-content-center place-items-center">
      <div
        data-reveal-figure
        className={[
          'card grid w-full max-w-[560px] gap-5 overflow-y-auto overscroll-contain p-5',
          'max-h-full [touch-action:pan-y]',
          'sm:p-6 md:max-w-[720px] md:gap-8 md:p-8',
          // Keep it scrollable (not `overflow-hidden`) so a short-height desktop
          // viewport can reach the whole form instead of clipping it; compact
          // the gaps on short screens so it usually fits without scrolling.
          'lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-10',
          'short:gap-3 short:p-4 md:short:gap-4',
          '3xl:max-w-[860px] 3xl:p-10',
        ].join(' ')}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <p className="t-label flex items-center gap-2 text-ink-3 before:h-px before:w-3.5 before:bg-brass before:content-['']">
            05 &middot; Enquire
          </p>
          <h2 data-view-heading tabIndex={-1} className="t-h2 outline-none">
            Request the
            <br className="hidden lg:inline" /> drawing set
          </h2>

          <dl className="mt-auto pt-3">
            <div className="flex items-baseline justify-between gap-3 border-t border-hair py-2">
              <dt className="t-label text-ink-3">Sales</dt>
              <dd className="m-0 text-[13px] font-light">
                <a href="tel:+912200000000" className="hover:text-brass-ink">
                  +91 22 0000 0000
                </a>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-hair py-2">
              <dt className="t-label text-ink-3">Site</dt>
              <dd className="m-0 text-right text-[13px] font-light">
                Balkum, Thane (W) 400608
              </dd>
            </div>
          </dl>

          <p className="text-[9px] uppercase leading-relaxed tracking-[0.08em] text-ink-3 short:hidden">
            MahaRERA P51700046734
            <br />
            maharera.mahaonline.gov.in
          </p>
        </div>

        <form
          ref={formRef}
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            if (sending || sent) return
            const data = Object.fromEntries(new FormData(e.currentTarget))
            const problems = validateEnquiry(data)
            setErrors(problems)
            if (Object.keys(problems).length) return
            setSending(true)
            // Saved, or kept on this device and retried — never lost; see
            // lib/enquiries.js. The visitor gets the same confirmation.
            await submitEnquiry(data)
            setSending(false)
            setSent(true)
          }}
          className="flex min-w-0 flex-col gap-4 md:gap-5"
        >
          {FIELDS.map((f) => (
            <div key={f.id} className="group relative pt-4">
              <label
                htmlFor={f.id}
                className={[
                  'pointer-events-none absolute left-0 top-4 origin-top-left text-[14px] font-light text-ink-3',
                  'transition-[transform,color] duration-400 ease-zenith',
                  'group-focus-within:-translate-y-4 group-focus-within:scale-[0.72]',
                  'group-focus-within:uppercase group-focus-within:tracking-[0.14em] group-focus-within:text-ink-2',
                  filled[f.id]
                    ? '-translate-y-4 scale-[0.72] uppercase tracking-[0.14em] text-ink-2'
                    : '',
                ].join(' ')}
              >
                {f.label}
              </label>
              <input
                id={f.id}
                name={f.id}
                type={f.type}
                autoComplete={f.autoComplete}
                onChange={mark(f.id)}
                onBlur={mark(f.id)}
                readOnly={sent}
                aria-invalid={errors[f.id] ? 'true' : undefined}
                aria-describedby={errors[f.id] ? `${f.id}-error` : undefined}
                className="w-full border-0 border-b border-hair bg-transparent px-0 pb-2 pt-0.5 font-ui text-[16px] font-light text-ink outline-none"
              />
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-brass transition-transform duration-450 ease-zenith group-focus-within:scale-x-100"
              />
              {errors[f.id] && (
                <p id={`${f.id}-error`} className="mt-1 text-[11px] font-light text-brass-ink">
                  {errors[f.id]}
                </p>
              )}
            </div>
          ))}

          <fieldset className="m-0 border-0 p-0">
            <legend className="t-label p-0 text-ink-3">Configuration</legend>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {CONFIGS.map((c, n) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    name="config"
                    value={c}
                    defaultChecked={n === 0}
                    className="peer sr"
                  />
                  <span
                    className={[
                      'inline-block rounded-full border border-hair px-3 py-1.5 text-[12px] font-light',
                      'transition-colors duration-200 hover:border-ink-3',
                      'peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper',
                      'peer-focus-visible:outline-1 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-brass',
                    ].join(' ')}
                  >
                    {c}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-auto pt-1" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
            <button
              ref={submitRef}
              type="submit"
              className="inline-flex items-center gap-2.5 rounded-full bg-ink px-5 py-2.5 text-[12px] uppercase tracking-widest text-paper transition-colors duration-200 will-change-transform hover:bg-brass"
            >
              <span>{sent ? 'Received' : sending ? 'Sending…' : 'Send enquiry'}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.5]">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
            <p role="status" aria-live="polite" className="t-label mt-2.5 min-h-3 text-brass-ink">
              {sent ? 'We will be in touch shortly.' : ''}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Enquire
