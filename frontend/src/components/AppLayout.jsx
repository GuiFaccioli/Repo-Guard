import { Outlet } from 'react-router-dom'
import Header from './Header'

function AppLayout() {
  return (
    <div className="app-shell app-shell-with-header">
      <Header />
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
