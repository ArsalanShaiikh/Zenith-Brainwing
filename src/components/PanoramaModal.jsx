import { useEffect, useMemo, useState } from 'react'
import { exitFullscreen, fullscreenSupported, isFullscreenActive, requestFullscreen } from '../lib/fullscreen'
import { roomLinkHotspots, roomScene } from '../lib/roomPanos'
import Pano from './Pano'

/**
 * Dev-only capture tool for `links` entries: toggle it, pick where the dot
 * should send you, click the spot in the panorama, then paste the JSON it
 * prints into that room's `links` array in hotspotData.js / hotspotData4bhk.js.
 * Same shape as the flat-image HotspotTagger — a copy-paste bridge into the
 * committed data, not a live editor.
 */
function PanoTagger({ candidates, active, onToggle, captured, targetId, onTargetChange }) {
  const [copied, setCopied] = useState(false)

  const json = captured
    ? JSON.stringify({ to: targetId, yaw: captured.yaw, pitch: captured.pitch }, null, 2)
    : null

  const handleCopy = async () => {
    if (!json) return
    try {
      await navigator.clipboard.writeText(`${json},`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can be unavailable outside a secure context.
    }
  }

  return (
    <div className="absolute bottom-4 right-4 z-20 flex w-80 flex-col gap-3 rounded-xl border border-neutral-700 bg-neutral-900/95 p-4 text-sm text-neutral-100 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Pano Hotspot Tagger</span>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md bg-neutral-800 px-2 py-1 text-xs hover:bg-neutral-700"
        >
          {active ? 'Done' : 'Place hotspot'}
        </button>
      </div>

      {active && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-400">Links to</span>
            <select
              value={targetId}
              onChange={(e) => onTargetChange(e.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1"
            >
              {candidates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-neutral-400">
            Click the spot in the panorama the dot should sit at — the
            doorway or opening toward that room. Recentre and click again to
            adjust.
          </p>

          {json ? (
            <>
              <pre className="overflow-x-auto rounded-md bg-neutral-800 p-2 text-xs text-emerald-300">
                {json}
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md bg-neutral-800 px-2 py-1.5 text-xs hover:bg-neutral-700"
              >
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
              <p className="text-xs text-neutral-500">
                Paste into this room&apos;s <code>links</code> array.
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-500">No point placed yet.</p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Full-screen room panorama overlay, opened from an interior hotspot.
 * Probes the tile set's preview strip first (plain <img>) so a room that
 * hasn't been shot yet shows our own "coming soon" state rather than
 * Marzipano failing on 404s. Only mounts `Pano` — and the marzipano
 * dynamic import it owns — once that preview is confirmed to exist.
 *
 * `rooms` is the full room list for the unit (not just the active one) so
 * floating nav dots can jump straight from this panorama into any other
 * room's, via `onNavigate`, without backing out to the iso image first.
 * Which rooms actually get a dot is explicit — see `room.links` and the
 * dev-only tagger below, not an automatic full mesh.
 */
export default function PanoramaModal({ room, unitId, rooms = [], onNavigate, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(isFullscreenActive)

  const scene = useMemo(
    () => (room ? roomScene(unitId, room.panorama) : null),
    [unitId, room],
  )
  const roomsById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])
  const hotspots = useMemo(
    () => roomLinkHotspots(room, roomsById, onNavigate),
    [room, roomsById, onNavigate],
  )
  const [status, setStatus] = useState(scene ? 'checking' : 'missing') // checking | ready | missing

  const candidates = useMemo(
    () => rooms.filter((r) => r.id !== room?.id),
    [rooms, room],
  )
  const [tagging, setTagging] = useState(false)
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? '')
  const [captured, setCaptured] = useState(null)

  useEffect(() => {
    if (!scene) return
    let cancelled = false

    const probe = new Image()
    probe.onload = () => {
      if (!cancelled) setStatus('ready')
    }
    probe.onerror = () => {
      if (!cancelled) setStatus('missing')
    }
    probe.src = scene.previewUrl

    return () => {
      cancelled = true
    }
  }, [scene])

  useEffect(() => {
    const onKeyDown = (e) => {
      // The browser's own fullscreen exit already answers this Escape —
      // taking it too would close the panorama in the same keystroke.
      if (e.key === 'Escape' && !document.fullscreenElement) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Tracks the real fullscreen state, not just clicks on the button — it also
  // catches the browser's own Escape-to-exit and any F11 outside our control,
  // plus the request fired from the hotspot click that opened this modal.
  useEffect(() => {
    const onChange = () => setIsFullscreen(isFullscreenActive())
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  // Leaving the panorama — by any route — must not strand the browser in
  // fullscreen once the modal is gone.
  useEffect(() => {
    return () => {
      if (isFullscreenActive()) exitFullscreen()
    }
  }, [])

  const toggleFullscreen = () => {
    if (isFullscreenActive()) {
      exitFullscreen()
    } else {
      requestFullscreen(document.documentElement)
    }
  }

  if (!room) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 text-white">
        <h2 className="text-lg font-medium">{room.label}</h2>
        <div className="flex items-center gap-2">
          {fullscreenSupported() && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-pressed={isFullscreen}
              aria-label={isFullscreen ? 'Exit full screen' : 'View full screen'}
              title={isFullscreen ? 'Exit full screen' : 'View full screen'}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
                {isFullscreen ? (
                  <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                ) : (
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                )}
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panorama"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        {status === 'ready' && (
          <Pano
            scene={scene}
            active
            autorotate={false}
            hotspots={hotspots}
            onTag={tagging ? setCaptured : undefined}
            className="absolute inset-0"
          />
        )}

        {status === 'checking' && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            Loading panorama&hellip;
          </div>
        )}

        {status === 'missing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
            <span className="text-base font-medium text-white">Panorama coming soon</span>
            <span className="text-sm">The 360&deg; view for {room.label} hasn&apos;t been added yet.</span>
          </div>
        )}

        {import.meta.env.DEV && status === 'ready' && candidates.length > 0 && (
          <PanoTagger
            candidates={candidates}
            active={tagging}
            onToggle={() => {
              setTagging((v) => !v)
              setCaptured(null)
            }}
            captured={captured}
            targetId={targetId}
            onTargetChange={setTargetId}
          />
        )}
      </div>
    </div>
  )
}
