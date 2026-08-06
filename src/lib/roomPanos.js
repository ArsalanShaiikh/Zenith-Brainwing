/**
 * Room-level 360 panoramas for the isometric interior walkthrough. Same
 * Marzipano cube-tile layout as the exterior Views panos (see `panos.js`),
 * just rooted per unit config instead of per elevation:
 * `public/panos/<3BHK|4BHK>/tiles/<roomId>/<level>/<face>/<row>/<col>.jpg`.
 *
 * The tiler that produced these only wrote levels 1-3 (512px tiles, up to a
 * 2048px face) plus a `preview.jpg` cube-face strip — no level 0 on disk,
 * same as the Views tool's `fallbackOnly` level, which Marzipano renders
 * straight from `previewUrl` rather than requesting tiles for it.
 */
const ROOT = '/panos'

const LEVELS = [
  { tileSize: 256, size: 256, fallbackOnly: true },
  { tileSize: 512, size: 512 },
  { tileSize: 512, size: 1024 },
  { tileSize: 512, size: 2048 },
]

const FACE_SIZE = 2048

/**
 * Every balcony shot in this set was captured with the camera's front face
 * pointed back into the room — the actual balcony/skyline only comes into
 * frame at yaw=π (its "back" face) — so open those facing outward instead of
 * at the room behind the camera.
 */
const initialYaw = (roomId) => (/balcony/i.test(roomId) ? Math.PI : 0)

/** `unitId` is `"3BHK"` / `"4BHK"` (see isoUnits.js); `roomId` is the tile
 *  folder name, e.g. `"3-master-bedroom"`. Returns null with no room tagged. */
export const roomScene = (unitId, roomId) => {
  if (!unitId || !roomId) return null
  const base = `${ROOT}/${unitId}/tiles/${roomId}`
  return {
    id: `${unitId}-${roomId}`,
    tileUrl: `${base}/{z}/{f}/{y}/{x}.jpg`,
    previewUrl: `${base}/preview.jpg`,
    levels: LEVELS,
    faceSize: FACE_SIZE,
    initialView: { yaw: initialYaw(roomId), pitch: 0, fov: Math.PI / 2 },
  }
}

/**
 * Nav dots for jumping straight from this room's panorama into another,
 * without backing out to the iso image first. Explicit only — a room shows
 * no dots until its own `links` array (in hotspotData.js /
 * hotspotData4bhk.js) says otherwise, each entry `{ to, yaw, pitch }` aimed
 * at a real doorway/opening rather than spaced out generically. Place them
 * with the dev-only pano tagger (see PanoramaModal's "Place hotspot" mode).
 */
export const roomLinkHotspots = (room, roomsById, onNavigate) =>
  (room?.links ?? [])
    .map((link) => {
      const target = roomsById.get(link.to)
      if (!target) return null
      return { yaw: link.yaw, pitch: link.pitch, label: target.label, onClick: () => onNavigate(target.id) }
    })
    .filter(Boolean)
