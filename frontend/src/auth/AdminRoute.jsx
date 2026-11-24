import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { Icon } from '../components/admin/Icon'

// The enclosing ProtectedRoute handles login. The API independently enforces ADMIN permissions.
export function AdminRoute() {
    const { user } = useAuth()
    const location = useLocation()
    if (user?.role !== 'ADMIN') {
        return (
            <section className="narrow">
                <h1>Admin access required</h1>
                <p className="muted">Your account does not have permission to manage problems or test cases.</p>
                <Link to="/problems">Back to problems</Link>
            </section>
        )
    }
    return (
        <div className="admin-shell">
            <aside className="admin-sidebar">
                <p className="admin-eyebrow">Workspace</p>
                <div className="admin-sidebar-title"><Icon name="shield" />Administration</div>
                <nav aria-label="Admin navigation">
                    <NavLink to="/admin" className={location.pathname !== '/admin/problems/new' ? 'active' : ''} end>
                        <Icon name="book" />Problem library
                    </NavLink>
                    <NavLink to="/admin/problems/new"><Icon name="plus" />New problem</NavLink>
                </nav>
                <div className="admin-sidebar-footer"><span className="sidebar-rule" /><p>Great problems start with clear statements and thoughtful tests.</p></div>
            </aside>
            <Outlet />
        </div>
    )
}
