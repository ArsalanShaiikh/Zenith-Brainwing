import { useEffect, useState } from "react";

export const hotspotDraftKey = (unitId) => `iso-hotspot-tagger-draft-${unitId}`;

function upsertKeyframe(room, frame, x, y) {
  const keyframes = room.keyframes.filter((k) => k.frame !== frame);
  keyframes.push({ frame, x, y });
  keyframes.sort((a, b) => a.frame - b.frame);
  return { ...room, keyframes };
}

/**
 * Dev-only hotspot authoring tool. When active, clicks on the viewer
 * (via overlayTargetRef) place/update a pin for the selected room at the
 * current frame instead of panning. Exports the working set as JSON to
 * paste into the active unit's hotspot data file (src/hotspots/hotspotData.js
 * or hotspotData4bhk.js).
 */
export default function HotspotTagger({
  active,
  onToggle,
  rooms,
  onRoomsChange,
  frameIndex,
  onFrameChange,
  frameCount,
  overlayTargetRef,
  draftKey,
}) {
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(rooms));
  }, [draftKey, rooms]);

  useEffect(() => {
    if (!active) return undefined;
    const el = overlayTargetRef.current;
    if (!el) return undefined;

    const handleClick = (event) => {
      if (!selectedRoomId) return;
      if (event.target.closest("[data-hotspot-tagger-panel]")) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

      onRoomsChange(
        rooms.map((room) =>
          room.id === selectedRoomId ? upsertKeyframe(room, frameIndex, x, y) : room
        )
      );
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [active, overlayTargetRef, selectedRoomId, frameIndex, rooms, onRoomsChange]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const checkpointFrames = [
    0,
    Math.round((frameCount - 1) / 3),
    Math.round((2 * (frameCount - 1)) / 3),
    frameCount - 1,
  ];
  const extraFrames = selectedRoom
    ? selectedRoom.keyframes
        .map((k) => k.frame)
        .filter((frame) => !checkpointFrames.includes(frame))
    : [];

  const exportJson = () => {
    const data = { frameCount, rooms };
    return `export default ${JSON.stringify(data, null, 2)};\n`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable outside a secure context; the
      // download button below is the fallback in that case.
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportJson()], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hotspotData.js";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearPinHere = () => {
    if (!selectedRoomId) return;
    onRoomsChange(
      rooms.map((room) =>
        room.id === selectedRoomId
          ? { ...room, keyframes: room.keyframes.filter((k) => k.frame !== frameIndex) }
          : room
      )
    );
  };

  return (
    <div
      data-hotspot-tagger-panel
      className="absolute bottom-4 right-4 z-20 flex flex-col gap-3 w-80 rounded-xl border border-neutral-700 bg-neutral-900/95 p-4 text-neutral-100 text-sm shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">Hotspot Tagger</span>
        <button
          type="button"
          onClick={onToggle}
          className="px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs"
        >
          {active ? "Done" : "Edit Hotspots"}
        </button>
      </div>

      {active && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-400 text-xs">Frame {frameIndex}</span>
            <input
              type="range"
              min={0}
              max={frameCount - 1}
              value={frameIndex}
              onChange={(e) => onFrameChange(Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-neutral-400 text-xs">Room</span>
            <select
              name="hotspot-room"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.label}
                </option>
              ))}
            </select>
          </label>

          <p className="text-neutral-400 text-xs">
            Click anywhere on the image to place/update the pin for the
            selected room at this frame. Tag each checkpoint below (0, 40,
            80, 120) - that's usually enough for smooth tracking across the
            pan.
          </p>

          {selectedRoom && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-1">
                {checkpointFrames.map((frame) => {
                  const tagged = selectedRoom.keyframes.some((k) => k.frame === frame);
                  const isCurrent = frame === frameIndex;
                  return (
                    <button
                      key={frame}
                      type="button"
                      onClick={() => onFrameChange(frame)}
                      className={`px-1.5 py-0.5 rounded text-xs border ${
                        isCurrent
                          ? "border-white bg-white text-neutral-900"
                          : tagged
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                          : "border-neutral-700 bg-neutral-800 text-neutral-400"
                      }`}
                      title={tagged ? "Pin placed" : "Not tagged yet"}
                    >
                      {frame}
                      {tagged ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>

              {extraFrames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {extraFrames.map((frame) => (
                    <button
                      key={frame}
                      type="button"
                      onClick={() => onFrameChange(frame)}
                      className={`px-1.5 py-0.5 rounded text-xs border ${
                        frame === frameIndex
                          ? "border-white bg-white text-neutral-900"
                          : "border-neutral-700 bg-neutral-800"
                      }`}
                    >
                      {frame}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearPinHere}
              className="flex-1 px-2 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs"
            >
              Clear pin here
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 px-2 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs"
            >
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 px-2 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs"
            >
              Download
            </button>
          </div>
        </>
      )}
    </div>
  );
}
