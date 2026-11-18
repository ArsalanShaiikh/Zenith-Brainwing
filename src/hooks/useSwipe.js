import { useRef } from 'react'

/**
 * Horizontal swipe → previous / next, for full-screen media (Gallery,
 * Showcase). On a touchscreen people swipe photos without thinking; before
 * this the only ways through were the arrow buttons and the keyboard.
 *
 * Spread the returned props on the stage, and give it `touch-action: pan-y`
 * (Tailwind `touch-pan-y`) so the browser leaves horizontal drags to us.
 * A swipe is a mostly-horizontal move of at least MIN_DX px. Gestures that
 * start on a control, or inside anything marked `data-swipe-ignore` (e.g. a
 * thumbnail rail that scrolls sideways on its own), are left alone.
 */
const MIN_DX = 50

export const useSwipe = ({ onLeft, onRight }) => {
  const start = useRef(null)

  const onPointerDown = (e) => {
    if (e.button > 0) return
    if (e.target.closest('button, a, input, [role="button"], [data-swipe-ignore]')) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }

  const onPointerUp = (e) => {
    const s = start.current
    start.current = null
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0) onLeft?.()
    else onRight?.()
  }

  const onPointerCancel = () => {
    start.current = null
  }

  return { onPointerDown, onPointerUp, onPointerCancel }
}
