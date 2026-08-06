import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * A QR code pointing at the visitor's own generated sheet, hosted just long
 * enough to be fetched. Scanning it opens the PDF on the visitor's own phone
 * — no messaging API, no business verification, no one clicking send on the
 * kiosk's behalf. From there, sharing it on to WhatsApp or Mail is a native
 * share sheet on a device that's actually signed into those apps, which the
 * kiosk tablet isn't.
 */
const ShareQr = ({ url, onClose }) => {
  const [qrSrc, setQrSrc] = useState(null)
  const [failed, setFailed] = useState(false)
  const [prevUrl, setPrevUrl] = useState(url)

  // A new url clears the previous code before the effect below builds the
  // next one. Adjusted during render, not in the effect: an effect would let
  // the previous QR code hang on screen for a frame before clearing it.
  if (prevUrl !== url) {
    setPrevUrl(url)
    setQrSrc(null)
    setFailed(false)
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
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (!url) return null

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
          <h3 className="font-fine text-[20px] leading-tight text-ink">Scan to get your sheet</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
            Point your phone&rsquo;s camera at the code — your selection opens right on your
            device, ready to save or share.
          </p>
        </div>

        <div className="grid aspect-square w-full max-w-[220px] place-items-center overflow-hidden rounded-lg bg-paper-2 p-3">
          {qrSrc ? (
            <img src={qrSrc} alt="QR code for your selection sheet" className="h-full w-full" />
          ) : failed ? (
            <p className="px-2 text-[11px] text-ink-3">Could not build the code — close and try again.</p>
          ) : (
            <span
              aria-hidden="true"
              className="h-7 w-7 animate-spin rounded-full border-2 border-ink/20 border-t-ink"
            />
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="t-label rounded-full border border-ink/15 px-4 py-2 text-ink-2 transition-colors duration-200 hover:bg-ink hover:text-paper"
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default ShareQr
