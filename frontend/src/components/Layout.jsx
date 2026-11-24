import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { DraftGuard } from './admin/DraftGuard'
import { useDraftActions } from '../hooks/useDraftGuard'
import { ProfileMenu } from './ProfileMenu'

export function Layout() {
    return <DraftGuard><LayoutContent /></DraftGuard>
}

function LayoutContent() {
    const { user, logout } = useAuth()
    const { discardThen } = useDraftActions()
    const location = useLocation()
    const isAdmin = user?.role === 'ADMIN'
    const dashboardPath = isAdmin ? '/admin' : '/profile'

    return (
        <>
            <header className="topbar">
                <Link className="brand" to={isAdmin ? '/admin' : '/problems'}><span className="brand-mark" aria-hidden="true">{'{ }'}</span>CodeArena</Link>
                <nav aria-label="Main navigation">
                    {isAdmin ? <NavLink to="/admin">Admin dashboard</NavLink> : <>
                        <NavLink to="/problems">Problems</NavLink>
                        <NavLink to="/submissions">Submissions</NavLink>
                    </>}
                </nav>
                <div className="spacer" />
                <ProfileMenu key={location.key} user={user} dashboardPath={dashboardPath} active={location.pathname === dashboardPath} onLogout={() => discardThen(logout)} />
            </header>
            <main className={`page ${location.pathname.startsWith('/admin') ? 'page-admin' : 'page-practice'}`}>
                <Outlet />
            </main>
        </>
    )
}
