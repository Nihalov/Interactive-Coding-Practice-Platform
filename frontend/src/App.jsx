import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ProblemDetailPage } from './pages/ProblemDetailPage'
import { ProblemsPage } from './pages/ProblemsPage'
import { RegisterPage } from './pages/RegisterPage'
import { SubmissionDetailPage } from './pages/SubmissionDetailPage'
import { SubmissionsPage } from './pages/SubmissionsPage'
import { WorkspacePage } from './pages/WorkspacePage'

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/problems" element={<ProblemsPage />} />
                    <Route path="/problems/:slug" element={<ProblemDetailPage />} />
                    <Route path="/problems/:slug/workspace" element={<WorkspacePage />} />
                    <Route path="/submissions" element={<SubmissionsPage />} />
                    <Route path="/submissions/:id" element={<SubmissionDetailPage />} />
                </Route>
            </Route>

            <Route path="*" element={<p className="center-note">Page not found.</p>} />
        </Routes>
    )
}