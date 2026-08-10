import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * A QR code pointing at the visitor's own generated sheet, hosted just long
 * enough to be fetched. Scanning it opens the PDF on the visitor's own phone
 * — no messaging API, no business verification, no one clicking send on the
 * kiosk's behalf. From there, sharing it on to WhatsApp or Mail is a native
 * share sheet on a device that's actually signed into those apps, which the
 * kiosk tablet isn't.
 *
 * Driven by an explicit `status` rather than by "is there a url yet", because
 * on a kiosk the failure states are the ones that matter. The panel opens the
 * moment it is asked for and says what it is doing: building, ready, or a
 * reason it could not. Silence in front of a visitor reads as a dead button,
 * and a dead button is what they report — never the thing that actually broke.
 */
const ShareQr = ({ status = 'idle', url, message, onRetry, onClose }) => {
  const [qrSrc, setQrSrc] = useState(null)
  const [encodeFailed, setEncodeFailed] = useState(false)
  const [prevUrl, setPrevUrl] = useState(url)

  // A new url clears the previous code before the effect below builds the
  // next one. Adjusted during render, not in the effect: an effect would let
  // the previous QR code hang on screen for a frame before clearing it — and
  // one visitor's sheet showing under another visitor's heading, however
  // briefly, is the one mistake this panel must never make.
  if (prevUrl !== url) {
    setPrevUrl(url)
    setQrSrc(null)
    setEncodeFailed(false)
  }

  useEffect(() => {
    if (!url) return undefined
    let cancelled = false
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, {
          margin: 1,
          width: 480,
          color: { dark: '#1a1714', light: '#f4f1ea' },
        }),
      )
      .then((dataUrl) => {
        if (!cancelled) setQrSrc(dataUrl)
      })
      .catch((err) => {
        console.error('Could not build the QR code', err)
        if (!cancelled) setEncodeFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  // Escape closes, same as the backdrop. A kiosk visitor won't press it, but
  // whoever is demoing on a laptop will.
  useEffect(() => {
    if (status === 'idle') return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [status, onClose])

  if (status === 'idle') return null

  const failed = status === 'error' || encodeFailed
  const waiting = !failed && (status === 'building' || !qrSrc)

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-void/55 p-4 [backdrop-filter:blur(4px)]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scan to get your selection"
        onClick={(e) => e.stopPropagation()}
        className="card m-0 flex w-full max-w-[340px] flex-col items-center gap-4 p-6 text-center"
      >
        <div>
          <h3 className="font-fine text-[20px] leading-tight text-ink">
            {failed ? 'Could not build your code' : 'Scan to get your sheet'}
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
            {failed
              ? 'Your selection is safe — only the code failed. Try again, or download the sheet instead.'
              : 'Point your phone’s camera at the code — your selection opens right on your device, ready to save or share.'}
          </p>
        </div>

        <div
          aria-live="polite"
          className="grid aspect-square w-full max-w-[220px] place-items-center overflow-hidden rounded-lg bg-paper-2 p-3"
        >
          {failed ? (
            <p className="px-2 text-[11px] leading-relaxed text-ink-3">
              {message || 'Something went wrong building the code.'}
            </p>
          ) : qrSrc ? (
            <img src={qrSrc} alt="QR code for your selection sheet" className="h-full w-full" />
          ) : (
            <span
              aria-hidden="true"
              className="h-7 w-7 animate-spin rounded-full border-2 border-ink/20 border-t-ink"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {failed && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="t-label rounded-full bg-ink px-4 py-2 text-paper transition-colors duration-200 hover:bg-brass-ink"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="t-label rounded-full border border-ink/15 px-4 py-2 text-ink-2 transition-colors duration-200 hover:bg-ink hover:text-paper"
          >
            {waiting ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ShareQr
