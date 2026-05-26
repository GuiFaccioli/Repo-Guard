import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'

function AppLayout() {
  const location = useLocation()
  const showHeader = location.pathname.startsWith('/repositories')

  return (
    <div className={`app-shell ${showHeader ? 'app-shell-with-header' : ''}`.trim()}>
      {showHeader ? <Header /> : null}
      <div className="layout-frame">
        <Outlet />
      </div>
    </div>
  )
}

export default AppLayout
