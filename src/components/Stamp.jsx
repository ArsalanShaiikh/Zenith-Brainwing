import { useView } from '../hooks/useView'
import { VIEWS } from '../lib/views'

/**
 * The only chrome over the render besides the dock: one indicator of where you
 * are. Everything factual lives on the dock's paper.
 *
 * Views is the exception: it owns this corner for its autorotate toggle, and
 * over a live pano a control earns the spot more than a label does. Faded
 * rather than unmounted, so the two hand over during the transition instead of
 * one popping out from under the other.
 */
const Stamp = () => {
  const { activeView } = useView()
  const v = VIEWS[activeView]
  const yielded = v.id === 'views'

  return (
    <div
      aria-hidden={yielded || undefined}
      className={[
        'pointer-events-none absolute right-2 top-2 z-40 transition-opacity duration-300',
        'sm:right-2.5 sm:top-2.5 md:right-5 md:top-5 lg:right-3 lg:top-3 3xl:right-4 3xl:top-4',
        yielded ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      <div
        className={`chip shadow-[0_14px_34px_-16px_rgb(0_0_0/0.5)] ${
          yielded ? '' : 'pointer-events-auto'
        }`}
      >
        <span className="t-fig text-[10px] text-brass 4xl:text-[13px]">{v.num}</span>
        <span className="t-label text-ink">{v.label}</span>
      </div>
    </div>
  )
}

export default Stamp
