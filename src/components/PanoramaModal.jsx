import { useEffect, useMemo, useState } from 'react'
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
 *
 * Nothing here touches the fullscreen API. The visit is already full screen and
 * stays that way (entry gate, then FullscreenGuard); this overlay is a fixed
 * sheet over the whole viewport either way. Handing full screen back on close —
 * which this used to do — only dropped the visitor onto the guard's "return to
 * full screen" sheet on the way out of a 360.
 */
export default function PanoramaModal({ room, unitId, rooms = [], onNavigate, onClose }) {
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

  if (!room) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={room.label} className="fixed inset-0 z-110 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-ink/12 bg-paper px-4 py-3 text-ink sm:px-5 lg:px-6">
        <h2 className="min-w-0 truncate text-base font-medium sm:text-lg lg:text-xl">{room.label}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {/* No fullscreen toggle: the only thing it could do from here is take
              the visit *out* of the screen it is composed for. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panorama"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/15 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper touch:h-11 touch:w-11"
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
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/70">
            Loading panorama&hellip;
          </div>
        )}

        {status === 'missing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-white/70">
            <span className="text-base font-medium text-white sm:text-lg">Panorama coming soon</span>
            <span className="text-sm sm:text-base">The 360&deg; view for {room.label} hasn&apos;t been added yet.</span>
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
