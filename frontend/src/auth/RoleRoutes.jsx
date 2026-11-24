import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function HomeRedirect() {
    const { user } = useAuth()
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/problems'} replace />
}

export function PracticeRoute() {
    const { user } = useAuth()
    return user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <Outlet />
}
