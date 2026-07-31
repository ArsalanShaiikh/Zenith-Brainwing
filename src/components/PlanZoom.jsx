import { useEffect, useRef, useState } from 'react'
import { FEATURE_LABELS, sqft } from '../lib/floorplans'

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.5

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * The zoomed plan viewer opened from a grid card — a large centred panel
 * showing the whole sheet. Pressing + zooms in on the centre of the image
 * and, once zoomed past 100%, the sheet can be dragged around by the cursor.
 * The zoom control itself can also be dragged out of the way if it sits over
 * something you need to read.
 */
const PlanZoom = ({ plan, onClose }) => {
  const frameRef = useRef(null)
  const imgRef = useRef(null)
  const panDrag = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 })
  const pillRef = useRef(null)
  const pillDrag = useRef({ active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 })

  // Reset the zoom/pan/share state whenever a different plan is opened —
  // adjusted during render (React's own pattern for this) rather than in an
  // effect, since this component stays mounted across plan changes.
  const [openKey, setOpenKey] = useState(plan?.key)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [shared, setShared] = useState(false)
  const [pillPos, setPillPos] = useState(null)
  if (plan?.key !== openKey) {
    setOpenKey(plan?.key)
    setScale(1)
    setPan({ x: 0, y: 0 })
    setShared(false)
  }

  useEffect(() => {
    if (!plan) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [plan, onClose])

  if (!plan) return null

  /** The sheet's actual rendered box under object-contain — computed from its
   *  intrinsic aspect ratio against the frame, since the <img> itself is
   *  sized h-full/w-full (needed so max-height can resolve at all) and so its
   *  own offsetWidth/offsetHeight no longer reflect the letterboxed content. */
  const fittedBox = () => {
    const img = imgRef.current
    const frame = frameRef.current
    if (!img || !frame || !img.naturalWidth || !img.naturalHeight) return null
    const rect = frame.getBoundingClientRect()
    const fit = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
    return { w: img.naturalWidth * fit, h: img.naturalHeight * fit, rect }
  }

  /** Keeps the sheet from being dragged or zoomed entirely off-frame. */
  const clampPan = (p, s) => {
    const box = fittedBox()
    if (!box) return p
    const maxX = Math.max(0, (box.w * s - box.rect.width) / 2)
    const maxY = Math.max(0, (box.h * s - box.rect.height) / 2)
    return { x: clamp(p.x, -maxX, maxX), y: clamp(p.y, -maxY, maxY) }
  }

  /** Zooms in/out on the image's own centre — any existing pan just scales
   *  proportionally, so a dragged view stays anchored to the same spot. */
  const zoomAt = (dir) => {
    const next = clamp(scale + dir * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM)
    if (next === scale) return
    const ratio = next / scale
    const nextPan = { x: pan.x * ratio, y: pan.y * ratio }
    setScale(next)
    setPan(clampPan(nextPan, next))
  }

  const zoomIn = () => zoomAt(1)
  const zoomOut = () => zoomAt(-1)

  // Drag-to-pan on the sheet itself, active once zoomed in.
  const onImagePointerDown = (e) => {
    if (scale <= MIN_ZOOM) return
    e.preventDefault()
    panDrag.current = { active: true, startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onImagePointerMove = (e) => {
    if (!panDrag.current.active) return
    const dx = e.clientX - panDrag.current.startX
    const dy = e.clientY - panDrag.current.startY
    setPan(clampPan({ x: panDrag.current.startPanX + dx, y: panDrag.current.startPanY + dy }, scale))
  }
  const endImageDrag = () => {
    if (!panDrag.current.active) return
    panDrag.current.active = false
    setDragging(false)
  }

  // Dragging the floating zoom pill itself out of the way.
  const onPillPointerDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const r = pillRef.current.getBoundingClientRect()
    pillDrag.current = { active: true, startX: e.clientX, startY: e.clientY, startLeft: r.left, startTop: r.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPillPointerMove = (e) => {
    if (!pillDrag.current.active) return
    const dx = e.clientX - pillDrag.current.startX
    const dy = e.clientY - pillDrag.current.startY
    const pill = pillRef.current
    const frame = frameRef.current
    if (!pill || !frame) return
    const bounds = frame.getBoundingClientRect()
    const left = clamp(pillDrag.current.startLeft + dx, bounds.left + 4, bounds.right - pill.offsetWidth - 4)
    const top = clamp(pillDrag.current.startTop + dy, bounds.top + 4, bounds.bottom - pill.offsetHeight - 4)
    setPillPos({ x: left - bounds.left, y: top - bounds.top })
  }
  const endPillDrag = () => {
    pillDrag.current.active = false
  }

  const SPECS = plan.carpet
    ? [
        ['Configuration', plan.config],
        ['RERA carpet', `${sqft(plan.carpet.sqft)} sq.ft · ${plan.carpet.sqm} sq.m`],
        ['Balcony', `${sqft(plan.balcony.sqft)} sq.ft`],
        ['Total', `${sqft(plan.total.sqft)} sq.ft · ${plan.total.sqm} sq.m`],
      ]
    : [
        ['Configuration', plan.config],
        ['Covers', plan.band],
      ]

  const amenities = plan.features?.map((f) => FEATURE_LABELS[f]) ?? []

  const handleShare = async () => {
    const shareData = {
      title: `${plan.name} — Runwal Zenith`,
      text: `${plan.name} (${plan.config}) at Runwal Zenith`,
      url: window.location.href,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }
      await navigator.clipboard.writeText(shareData.url)
      setShared(true)
      setTimeout(() => setShared(false), 1800)
    } catch {
      // Cancelled share sheet or blocked clipboard — nothing to recover from.
    }
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-void/70 p-3 [backdrop-filter:blur(4px)] sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${plan.name} — zoomed floor plan`}
        onClick={(e) => e.stopPropagation()}
        className="card m-0 flex h-[92vh] w-full max-w-[1600px] flex-col overflow-hidden p-0"
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink/12 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="t-label text-ink-3">{plan.sheet}</p>
            <h3 className="mt-1 truncate font-fine text-[20px] leading-tight text-ink sm:text-[24px]">
              {plan.name}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="t-label rounded-full border border-ink/15 px-3 py-1.5 text-ink-2 transition-colors duration-200 hover:text-ink"
            >
              {shared ? 'Copied' : 'Share'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/15 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* The sheet — drags to pan once zoomed, zooms toward the cursor. */}
        <div
          ref={frameRef}
          className="relative flex-1 overflow-hidden bg-paper-2"
          style={{ touchAction: 'none', cursor: scale > MIN_ZOOM ? (dragging ? 'grabbing' : 'grab') : 'default' }}
          onPointerDown={onImagePointerDown}
          onPointerMove={onImagePointerMove}
          onPointerUp={endImageDrag}
          onPointerCancel={endImageDrag}
        >
          <div
            className="flex h-full w-full items-center justify-center p-4"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transition: dragging ? 'none' : 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <picture className="block h-full w-full">
              <source type="image/webp" srcSet={`${plan.base}-1600.webp`} />
              <img
                ref={imgRef}
                src={`${plan.base}-1600.jpg`}
                alt={`${plan.name} floor plan`}
                className="h-full w-full object-contain"
                draggable={false}
              />
            </picture>
          </div>

          {/* Zoom control — draggable via the grip. Stops pointerdown here so
              it never bubbles to the frame's pan handler above, which would
              otherwise grab pointer capture and swallow the button's click
              (this is what broke zoom out once the sheet was zoomed in). */}
          <div
            ref={pillRef}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute z-10 flex items-center gap-1 rounded-full border border-ink/15 bg-paper/95 p-1 shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)] [backdrop-filter:blur(6px)]"
            style={pillPos ? { left: pillPos.x, top: pillPos.y, right: 'auto', bottom: 'auto' } : { right: 12, bottom: 12 }}
          >
            <button
              type="button"
              onPointerDown={onPillPointerDown}
              onPointerMove={onPillPointerMove}
              onPointerUp={endPillDrag}
              onPointerCancel={endPillDrag}
              aria-label="Move zoom control"
              title="Drag to move"
              className="grid h-8 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-full text-ink/60 transition-colors duration-200 hover:text-ink active:cursor-grabbing"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
                <circle cx="8" cy="6" r="1.4" />
                <circle cx="8" cy="12" r="1.4" />
                <circle cx="8" cy="18" r="1.4" />
                <circle cx="14" cy="6" r="1.4" />
                <circle cx="14" cy="12" r="1.4" />
                <circle cx="14" cy="18" r="1.4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={zoomOut}
              disabled={scale <= MIN_ZOOM}
              aria-label="Zoom out"
              className="grid h-8 w-8 place-items-center rounded-full text-ink transition-colors duration-200 hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4.35-4.35M8.5 11h5" />
              </svg>
            </button>
            <span className="t-label w-10 text-center text-ink-2">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={scale >= MAX_ZOOM}
              aria-label="Zoom in"
              className="grid h-8 w-8 place-items-center rounded-full text-ink transition-colors duration-200 hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4.35-4.35M11 8.5v5M8.5 11h5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-ink/12 p-4 sm:p-5">
          <dl
            className={[
              'grid gap-x-5 gap-y-1',
              SPECS.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2',
            ].join(' ')}
          >
            {SPECS.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="t-label text-ink-3">{k}</dt>
                <dd className="m-0 text-[12px] font-normal text-ink md:text-[13px]">{v}</dd>
              </div>
            ))}
          </dl>
          {amenities.length > 0 && (
            <p className="m-0 text-[11px] text-ink-3 md:text-[12px]">{amenities.join(' · ')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlanZoom
