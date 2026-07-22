import { useView } from '../hooks/useView'
import { VIEWS } from '../lib/views'

/**
 * The only chrome over the render besides the dock: one indicator of where you
 * are. Everything factual lives on the dock's paper.
 */
const Stamp = () => {
  const { activeView } = useView()
  const v = VIEWS[activeView]

  return (
    <div className="pointer-events-none absolute right-2 top-2 z-40 sm:right-2.5 sm:top-2.5 md:right-5 md:top-5 lg:right-3 lg:top-3 3xl:right-4 3xl:top-4">
      <div className="chip pointer-events-auto shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)]">
        <span className="t-fig text-[10px] text-brass">{v.num}</span>
        <span className="t-label text-ink">{v.label}</span>
      </div>
    </div>
  )
}

export default Stamp
