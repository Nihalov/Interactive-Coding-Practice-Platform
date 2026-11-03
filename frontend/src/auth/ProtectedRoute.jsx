import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return <p className="center-note">Loading…</p>
    }
    if (!user) {
        // Remember where the user was going, so login can send them back
        return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }
    return <Outlet />
}