import { useEffect, useState } from 'react'

const IDLE_MS = 5000

/**
 * True once the pointer has been still for 5s. The chrome dims to 0.25 but is
 * never removed — it stays hit-testable and in the tab order throughout.
 */
export const useIdleChrome = () => {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer

    const wake = () => {
      setIdle((was) => (was ? false : was))
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), IDLE_MS)
    }

    const events = [
      'pointermove',
      'pointerdown',
      'wheel',
      'keydown',
      'touchstart',
    ]
    for (const e of events) {
      window.addEventListener(e, wake, { passive: true })
    }
    wake()

    return () => {
      clearTimeout(timer)
      for (const e of events) window.removeEventListener(e, wake)
    }
  }, [])

  return idle
}
