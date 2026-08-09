import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useFramePreloader from '../hooks/useFramePreloader'
import useIsoPan from '../hooks/useIsoPan'
import { getHotspotPosition } from '../hotspots/interpolateHotspot'
import { ISO_IMAGE_ASPECT_RATIO } from '../lib/isoUnits'
import HotspotMarker from './HotspotMarker'
import HotspotTagger, { hotspotDraftKey } from './HotspotTagger'
import PanoramaModal from './PanoramaModal'

const DRAG_SENSITIVITY = 5 // px of drag per frame step (touch fallback)

function loadInitialRooms(unit) {
  // The draft is the tagger's working state and the tagger is dev-only, so a
  // stale one left in a visitor's localStorage would quietly stand in for the
  // committed positions with nothing in the running app to say so.
  if (!import.meta.env.DEV) return unit.hotspotData.rooms
  try {
    const draft = localStorage.getItem(hotspotDraftKey(unit.id))
    if (draft) {
      // The tagger only owns position — everything else (label, panorama)
      // stays live off the committed dataset, so editing hotspotData.js isn't
      // silently shadowed by a draft saved before that edit.
      const bySourceId = new Map(unit.hotspotData.rooms.map((r) => [r.id, r]))
      return JSON.parse(draft)
        .filter((room) => bySourceId.has(room.id))
        .map((room) => ({ ...bySourceId.get(room.id), keyframes: room.keyframes }))
    }
  } catch {
    // Malformed/absent draft - fall back to the committed dataset.
  }
  return unit.hotspotData.rooms
}

/**
 * The pannable isometric frame sequence for a single unit: hover-driven
 * panning on desktop (mouse position maps to frame index, eased for a
 * parallax feel), drag-to-pan fallback on touch. This is a bounded pan (not
 * a 360 loop), so all frame math clamps instead of wrapping. Room hotspots
 * track their tagged position across frames and open a panorama modal on
 * click — see useIsoPan for the parking and re-anchoring that keep a marker
 * still enough to actually press. Shared by the standalone dev viewer
 * (InteriorViewer) and the
 * compare-flow walkthrough modal — mount with `key={unit.id}` so switching
 * units gets a clean remount rather than carrying over stale frame/room state.
 */
export default function IsoFrameStage({ unit, enableTagging = false }) {
  const FRAME_COUNT = unit.frameCount

  const frameUrl = useCallback(
    (index) =>
      `${unit.basePath}/${unit.framePrefix}${String(index).padStart(unit.padLength, '0')}${unit.extension}`,
    [unit],
  )

  const { framesRef, ready, loadedCount, progress } = useFramePreloader(FRAME_COUNT, frameUrl)

  const [rooms, setRooms] = useState(() => loadInitialRooms(unit))
  const [taggingActive, setTaggingActive] = useState(false)
  const [activeRoom, setActiveRoom] = useState(null)

  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const drawnRef = useRef(-1)

  // Pointer → frame. The pan parks while the pointer is over a marker and
  // eases control back rather than snapping when the cursor takes over
  // somewhere new — without those two, reaching for a hotspot re-renders the
  // apartment under your cursor and the marker walks away from its room.
  const { frameIndex, setFrame, isDragging, supportsHover } = useIsoPan({
    elRef: containerRef,
    frameCount: FRAME_COUNT,
    enabled: ready && !taggingActive,
    dragSensitivity: DRAG_SENSITIVITY,
  })

  // Paint the frame ourselves rather than swapping an <img src>. A src swap is
  // asynchronous: the browser holds the previous frame on screen until the new
  // one is decoded, so a pan across a cold sequence drifts visibly behind the
  // cursor. drawImage decodes on the spot, in this tick, from an image we are
  // holding — the picture can never fall out of step with the hotspots again.
  // Before paint (layout effect) so a frame lands in the same frame it is set.
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const img = framesRef.current[frameIndex]
    if (!canvas || !img?.complete || !img.naturalWidth) return
    if (drawnRef.current === frameIndex) return

    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
    }
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    drawnRef.current = frameIndex
    // `loadedCount` is the signal that a frame we could not draw yet has since
    // arrived — first of all frame 0, under the loading bar.
  }, [framesRef, frameIndex, loadedCount])

  const hotspotPositions = useMemo(
    () =>
      rooms.map((room) => ({
        room,
        position: getHotspotPosition(room.keyframes, frameIndex),
      })),
    [rooms, frameIndex],
  )

  const cursorStyle = taggingActive
    ? 'crosshair'
    : supportsHover
      ? 'default'
      : isDragging
        ? 'grabbing'
        : 'grab'

  return (
    <>
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden touch-none w-full max-w-6xl rounded-xl border border-neutral-700 shadow-2xl bg-neutral-900"
        style={{ aspectRatio: ISO_IMAGE_ASPECT_RATIO, cursor: cursorStyle }}
      >
        {/* object-contain, not cover: hotspots are placed as a fraction of
            this box, so the picture must never be cropped out from under
            them if the box ever resolves off the frames' aspect ratio. */}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${unit.label} apartment isometric interior view`}
          className="block w-full h-full object-contain pointer-events-none"
        />

        {ready &&
          hotspotPositions.map(({ room, position }) =>
            position ? (
              <HotspotMarker
                key={room.id}
                x={position.x}
                y={position.y}
                label={room.label}
                onClick={() => {
                  if (taggingActive) return
                  // No fullscreen request here: the document is already in it
                  // (the entry gate takes it, FullscreenGuard keeps it), and
                  // moving it onto another element only risks handing it back.
                  setActiveRoom(room)
                }}
              />
            ) : null,
          )}

        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
            <div className="w-48 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm tabular-nums">Loading {progress}%</span>
          </div>
        )}

        {enableTagging && import.meta.env.DEV && (
          <HotspotTagger
            key={unit.id}
            active={taggingActive}
            onToggle={() => setTaggingActive((v) => !v)}
            rooms={rooms}
            onRoomsChange={setRooms}
            frameIndex={frameIndex}
            onFrameChange={setFrame}
            frameCount={FRAME_COUNT}
            overlayTargetRef={containerRef}
            draftKey={hotspotDraftKey(unit.id)}
          />
        )}
      </div>

      <PanoramaModal
        key={activeRoom?.id}
        room={activeRoom}
        unitId={unit.id}
        rooms={rooms}
        onNavigate={(roomId) => setActiveRoom(rooms.find((r) => r.id === roomId) ?? null)}
        onClose={() => setActiveRoom(null)}
      />
    </>
  )
}
