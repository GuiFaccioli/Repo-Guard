import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import AuthCallbackPage from './pages/AuthCallbackPage'
import LandingPage from './pages/LandingPage'
import RepositoryDetailPage from './pages/RepositoryDetailPage'
import RepositoryListPage from './pages/RepositoryListPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/repositories" element={<RepositoryListPage />} />
        <Route path="/repositories/:id" element={<RepositoryDetailPage />} />
      </Route>
    </Routes>
  )
}

export default App
