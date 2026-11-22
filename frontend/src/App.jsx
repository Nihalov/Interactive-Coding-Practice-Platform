import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminRoute } from './auth/AdminRoute'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ProblemDetailPage } from './pages/ProblemDetailPage'
import { ProblemsPage } from './pages/ProblemsPage'
import { RegisterPage } from './pages/RegisterPage'
import { SubmissionDetailPage } from './pages/SubmissionDetailPage'
import { SubmissionsPage } from './pages/SubmissionsPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminNewProblemPage, AdminProblemPage } from './pages/AdminProblemPage'

const router = createBrowserRouter(createRoutesFromElements(
        <>
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
                    <Route element={<AdminRoute />}>
                        <Route path="/admin" element={<AdminDashboardPage />} />
                        <Route path="/admin/problems/new" element={<AdminNewProblemPage />} />
                        <Route path="/admin/problems/:slug/edit" element={<AdminProblemPage />} />
                    </Route>
                </Route>
            </Route>

            <Route path="*" element={<p className="center-note">Page not found.</p>} />
        </>,
))

export default function App() {
    return <RouterProvider router={router} />
}
