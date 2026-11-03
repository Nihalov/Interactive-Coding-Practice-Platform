import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { describeError } from '../api/errors'
import { useAuth } from '../auth/useAuth'

export function LoginPage() {
    const { user, login } = useAuth()
    const location = useLocation()
    const from = location.state?.from ?? '/'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    // Already logged in (or just logged in): leave this page
    if (user) {
        return <Navigate to={from} replace />
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setError(null)
        setSubmitting(true)
        try {
            await login(email, password)
        } catch (err) {
            setError(describeError(err))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="auth-card">
            <h1>Log in</h1>
            <form onSubmit={handleSubmit} noValidate>
                <label>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </label>
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Logging in…' : 'Log in'}
                </button>
            </form>
            <p className="muted">
                No account? <Link to="/register">Register</Link>
            </p>
        </div>
    )
}