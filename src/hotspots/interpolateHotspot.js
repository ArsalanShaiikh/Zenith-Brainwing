/**
 * Given a room's keyframes (sorted ascending by frame) and the current frame
 * index, returns the interpolated {x, y} position (fractional 0-1 of the
 * image content box). Clamps at the ends instead of extrapolating.
 */
export function getHotspotPosition(keyframes, frameIndex) {
  if (!keyframes || keyframes.length === 0) return null;
  if (keyframes.length === 1) return { x: keyframes[0].x, y: keyframes[0].y };

  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  if (frameIndex <= first.frame) return { x: first.x, y: first.y };
  if (frameIndex >= last.frame) return { x: last.x, y: last.y };

  let k1 = first;
  let k2 = last;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i].frame <= frameIndex && keyframes[i + 1].frame >= frameIndex) {
      k1 = keyframes[i];
      k2 = keyframes[i + 1];
      break;
    }
  }

  if (k2.frame === k1.frame) return { x: k1.x, y: k1.y };

  const t = (frameIndex - k1.frame) / (k2.frame - k1.frame);
  return {
    x: k1.x + (k2.x - k1.x) * t,
    y: k1.y + (k2.y - k1.y) * t,
  };
}
