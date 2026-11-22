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

    return (
        <>
            <header className="topbar">
                <Link className="brand" to="/problems"><span className="brand-mark" aria-hidden="true">{'{ }'}</span>CodeArena</Link>
                <nav aria-label="Main navigation">
                    <NavLink to="/problems">Problems</NavLink>
                    <NavLink to="/submissions">Submissions</NavLink>
                    {user?.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
                </nav>
                <div className="spacer" />
                <ProfileMenu key={location.key} user={user} active={location.pathname === '/profile'} onLogout={() => discardThen(logout)} />
            </header>
            <main className={`page ${location.pathname.startsWith('/admin') ? 'page-admin' : 'page-practice'}`}>
                <Outlet />
            </main>
        </>
    )
}
