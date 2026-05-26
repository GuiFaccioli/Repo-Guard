import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'

function AppLayout() {
  const location = useLocation()
  const showHeader = location.pathname.startsWith('/repositories')

  return (
    <div className={`app-shell ${showHeader ? 'app-shell-with-header' : ''}`.trim()}>
      {showHeader ? <Header /> : null}
      <main className="layout-frame app-main">
        <Outlet />
      </main>
      <footer className="site-footer" aria-label="Footer">
        <div className="layout-frame site-footer-inner">
          <p className="site-footer-brand">RepoGuard</p>
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
