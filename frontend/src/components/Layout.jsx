import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function Layout() {
    const { user, logout } = useAuth()

    return (
        <>
            <header className="topbar">
                <span className="brand">CodeArena</span>
                <nav>
                    <NavLink to="/dashboard">Dashboard</NavLink>
                    <NavLink to="/problems">Problems</NavLink>
                    <NavLink to="/submissions">Submissions</NavLink>
                </nav>
                <div className="spacer" />
                <span className="who">
          {user?.username}
                    {user?.role === 'ADMIN' && <span className="badge">admin</span>}
        </span>
                <button className="link-button" onClick={logout}>
                    Log out
                </button>
            </header>
            <main className="page">
                <Outlet />
            </main>
        </>
    )
}