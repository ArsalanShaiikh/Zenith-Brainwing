/**
 * The vantage marks on the typical floor plan. Each one opens the crown pano
 * (171 m — the top of the tower) already facing the way that mark points, so
 * the plan and the view read as the same building.
 *
 * ---------------------------------------------------------------------------
 * SETTING THE ANGLES — this table is meant to be edited.
 *
 *   `yaw`  which way the pano faces, in radians, as Marzipano measures it.
 *   `pitch` how far up (negative) or down (positive) it tilts.
 *   `fov`  how wide the shot is; 1.3979 is what the panos were exported at.
 *
 * To find the numbers: open  /views?tune  and drag the pano until it faces the
 * way you want this mark to point. A readout appears under the elevation card
 * showing the live yaw / pitch / fov — copy those three into the row below.
 * The readout only ever appears with `?tune` in the address, never for a
 * visitor.
 *
 * The values shipped here are placeholders: they are simply the crown pano's
 * own opening direction, then a quarter turn apart each. They are *not* real
 * bearings — nothing here knows which way the building actually faces, so set
 * them (and rename the labels) against the sheet.
 * ---------------------------------------------------------------------------
 *
 * `x`/`y` are in the typical sheet's own coordinate space — the same
 * `TYPICAL_PLAN_VIEWBOX` (1600 × 1131) the residence outlines are traced in —
 * so a mark stays on its spot at every screen size. Listed clockwise from the
 * top of the sheet.
 */
export const TYPICAL_PLAN_VIEWPOINTS = [
  { id: 'vp-north', label: 'View 01', x: 866, y: 186, yaw: -0.5446, pitch: 0, fov: 1.3979 },
  { id: 'vp-east', label: 'View 02', x: 1360, y: 568, yaw: 1.0262, pitch: 0, fov: 1.3979 },
  { id: 'vp-south', label: 'View 03', x: 866, y: 952, yaw: 2.597, pitch: 0, fov: 1.3979 },
  { id: 'vp-west', label: 'View 04', x: 372, y: 568, yaw: -2.1154, pitch: 0, fov: 1.3979 },
]

/** Router state that sends the shell to a mark's pano and knows the way back. */
export const viewpointNavState = (mark) => ({
  planViewpoint: { yaw: mark.yaw, pitch: mark.pitch, fov: mark.fov, label: mark.label },
  // Carried untouched by the shell's back button, so leaving the pano lands
  // back on the plan you opened it from rather than the menu.
  returnState: { returnFloorplan: true },
})
