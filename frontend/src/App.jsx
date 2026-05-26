import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import LandingPage from './pages/LandingPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<Navigate to="/" replace />} />
        <Route path="/repositories" element={<Navigate to="/" replace />} />
        <Route path="/repositories/:id" element={<Navigate to="/" replace />} />
        <Route path="/repositories/:id/checks/:checkId" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
