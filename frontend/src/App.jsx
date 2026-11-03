import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { ProblemsPage } from './pages/ProblemsPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProblemDetailPage } from './pages/ProblemDetailPage'

export default function App() {
  return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/problems" replace />} />
            <Route path="/problems" element={<ProblemsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<p className="center-note">Page not found.</p>} />

          <Route path="/problems" element={<ProblemsPage />} />
          <Route path="/problems/:slug" element={<ProblemDetailPage />} />
      </Routes>
  )
}