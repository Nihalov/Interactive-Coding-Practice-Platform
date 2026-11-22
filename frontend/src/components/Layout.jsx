import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { DraftGuard } from './admin/DraftGuard'
import { useDraftActions } from '../hooks/useDraftGuard'

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
                <Link className="brand" to="/dashboard"><span className="brand-mark" aria-hidden="true">{'{ }'}</span>CodeArena</Link>
                <nav aria-label="Main navigation">
                    <NavLink to="/dashboard">Dashboard</NavLink>
                    <NavLink to="/problems">Problems</NavLink>
                    <NavLink to="/submissions">Submissions</NavLink>
                    {user?.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
                </nav>
                <div className="spacer" />
                <span className="who">
          {user?.username}
                    {user?.role === 'ADMIN' && <span className="badge">admin</span>}
        </span>
                <button className="link-button" onClick={() => discardThen(logout)}>
                    Log out
                </button>
            </header>
            <main className={`page ${location.pathname.startsWith('/admin') ? 'page-admin' : 'page-practice'}`}>
                <Outlet />
            </main>
        </>
    )
}
