import { useView } from '../hooks/useView'
import { VIEWS, NAV_VIEWS } from '../lib/views'
import './Nav.css'

const Nav = () => {
  const { activeView, goToView } = useView()

  const jump = (id) => () => {
    const i = VIEWS.findIndex((v) => v.id === id)
    goToView(i)
  }

  return (
    <nav className="nav" aria-label="Primary">
      <button
        className="nav__mark"
        type="button"
        onClick={jump('home')}
        aria-current={activeView === 0 ? 'true' : undefined}
      >
        <span className="nav__mark-name">RUNWAL ZENITH</span>
        <span className="nav__mark-place">Balkum &middot; Thane (W)</span>
      </button>

      <ul className="nav__list">
        {NAV_VIEWS.map((id) => {
          const v = VIEWS.find((x) => x.id === id)
          const i = VIEWS.indexOf(v)
          return (
            <li key={id}>
              <button
                className={`nav__link${activeView === i ? ' is-active' : ''}`}
                type="button"
                onClick={jump(id)}
                aria-current={activeView === i ? 'true' : undefined}
              >
                {v.label}
              </button>
            </li>
          )
        })}
      </ul>

      <button
        className={`nav__enquire${activeView === 5 ? ' is-active' : ''}`}
        type="button"
        onClick={jump('enquire')}
        aria-current={activeView === 5 ? 'true' : undefined}
      >
        Enquire
      </button>
    </nav>
  )
}

export default Nav
