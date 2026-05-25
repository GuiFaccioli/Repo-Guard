import { Outlet } from 'react-router-dom'
import Header from './Header'

function AppLayout() {
  return (
    <div className="app-shell">
      <div className="layout-frame">
        <Header />
        <Outlet />
      </div>
    </div>
  )
}

export default AppLayout
