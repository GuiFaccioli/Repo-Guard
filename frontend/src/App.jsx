import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import LandingPage from './pages/LandingPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import RepositoryListPage from './pages/RepositoryListPage'
import RepositoryDetailPage from './pages/RepositoryDetailPage'
import RepositoryCheckGuidePage from './pages/RepositoryCheckGuidePage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/repositories" element={<RepositoryListPage />} />
        <Route path="/repositories/:id" element={<RepositoryDetailPage />} />
        <Route path="/repositories/:id/checks/:checkId" element={<RepositoryCheckGuidePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
