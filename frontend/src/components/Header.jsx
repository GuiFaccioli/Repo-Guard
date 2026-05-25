import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Connect' },
  { to: '/repositories', label: 'Dashboard' },
  { to: '/auth/callback', label: 'OAuth Flow' },
]

function Header() {
  return (
    <header className="site-header">
      <div className="brand">
        <span className="brand-icon" aria-hidden="true">
          RG
        </span>
        <div>
          <p className="brand-name">RepoGuard</p>
          <p className="brand-tagline">GitHub-first repository health tool</p>
        </div>
      </div>

      <p className="header-status">Frontend foundation</p>

      <nav aria-label="Main navigation">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link-active' : 'nav-link'
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

export default Header
