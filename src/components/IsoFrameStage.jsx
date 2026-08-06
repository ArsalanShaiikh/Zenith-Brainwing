import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useFramePreloader from '../hooks/useFramePreloader'
import { getHotspotPosition } from '../hotspots/interpolateHotspot'
import { requestFullscreen } from '../lib/fullscreen'
import { ISO_IMAGE_ASPECT_RATIO } from '../lib/isoUnits'
import HotspotMarker from './HotspotMarker'
import HotspotTagger, { hotspotDraftKey } from './HotspotTagger'
import PanoramaModal from './PanoramaModal'

const DRAG_SENSITIVITY = 5 // px of drag per frame step (touch fallback)
const LERP_FACTOR = 0.15 // hover-pan smoothing
const LERP_EPSILON = 0.05

function loadInitialRooms(unit) {
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
 * click. Shared by the standalone dev viewer (InteriorViewer) and the
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

  const { ready, progress } = useFramePreloader(FRAME_COUNT, frameUrl)

  const [frameIndex, setFrameIndex] = useState(0)
  const [rooms, setRooms] = useState(() => loadInitialRooms(unit))
  const [taggingActive, setTaggingActive] = useState(false)
  const [activeRoom, setActiveRoom] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [supportsHover, setSupportsHover] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
      : true,
  )

  const containerRef = useRef(null)
  const frameIndexRef = useRef(0)
  const lerpRef = useRef({ display: 0, target: 0, rafId: null })
  const dragStateRef = useRef({ dragging: false, startX: 0, startFrame: 0 })

  useEffect(() => {
    frameIndexRef.current = frameIndex
  }, [frameIndex])

  useEffect(() => {
    const mql = window.matchMedia('(hover: hover) and (pointer: fine)')
    const handleChange = (e) => setSupportsHover(e.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const lerpState = lerpRef.current
    return () => {
      if (lerpState.rafId != null) cancelAnimationFrame(lerpState.rafId)
    }
  }, [])

  const tickLerpRef = useRef(() => {})

  const tickLerp = useCallback(() => {
    const state = lerpRef.current
    state.display += (state.target - state.display) * LERP_FACTOR
    const rounded = Math.round(state.display)
    setFrameIndex((prev) => (prev !== rounded ? rounded : prev))

    if (Math.abs(state.target - state.display) > LERP_EPSILON) {
      state.rafId = requestAnimationFrame(() => tickLerpRef.current())
    } else {
      state.display = state.target
      state.rafId = null
    }
  }, [])

  useLayoutEffect(() => {
    tickLerpRef.current = tickLerp
  })

  const handleHoverMove = useCallback(
    (event) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const relX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      lerpRef.current.target = relX * (FRAME_COUNT - 1)

      if (lerpRef.current.rafId == null) {
        lerpRef.current.display = frameIndexRef.current
        lerpRef.current.rafId = requestAnimationFrame(() => tickLerpRef.current())
      }
    },
    [FRAME_COUNT],
  )

  const isHoverEvent = useCallback(
    (event) => supportsHover && event.pointerType !== 'touch',
    [supportsHover],
  )

  const handlePointerDown = useCallback(
    (event) => {
      if (!ready || taggingActive || isHoverEvent(event)) return
      dragStateRef.current = {
        dragging: true,
        startX: event.clientX,
        startFrame: frameIndexRef.current,
      }
      setIsDragging(true)
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Capture is best-effort; safe to ignore if unsupported.
      }
    },
    [ready, taggingActive, isHoverEvent],
  )

  const handlePointerMove = useCallback(
    (event) => {
      if (!ready || taggingActive) return

      if (isHoverEvent(event)) {
        handleHoverMove(event)
        return
      }

      if (!dragStateRef.current.dragging) return
      const deltaX = event.clientX - dragStateRef.current.startX
      const steps = Math.trunc(deltaX / DRAG_SENSITIVITY)
      const next = Math.min(FRAME_COUNT - 1, Math.max(0, dragStateRef.current.startFrame - steps))
      setFrameIndex(next)
    },
    [ready, taggingActive, isHoverEvent, handleHoverMove, FRAME_COUNT],
  )

  const endDrag = useCallback(() => {
    dragStateRef.current.dragging = false
    setIsDragging(false)
  }, [])

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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <img
          src={frameUrl(frameIndex)}
          alt={`${unit.label} apartment isometric interior view`}
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
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
                  // Must fire synchronously inside the click to count as a
                  // user gesture — the modal (and its own fullscreen button)
                  // doesn't exist yet, so this targets the whole document.
                  requestFullscreen(document.documentElement)
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
            onFrameChange={setFrameIndex}
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
