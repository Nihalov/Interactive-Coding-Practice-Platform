import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
    const { user, loading } = useAuth()

    if (loading) {
        return <p className="center-note">Loading…</p>
    }
    if (!user) {
        return <Navigate to="/login" replace />
    }
    return <Outlet />
}
