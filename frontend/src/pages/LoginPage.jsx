import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { describeError } from '../api/errors'
import { useAuth } from '../auth/useAuth'
import { ApiError } from '../api/client'
import { AuthShell } from '../components/practice/AuthShell'
import { Icon } from '../components/admin/Icon'

export function LoginPage() {
    const { user, login } = useAuth()
    const location = useLocation()
    const from = location.state?.from ?? '/'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [fieldErrors, setFieldErrors] = useState({})

    // Already logged in (or just logged in): leave this page
    if (user) {
        return <Navigate to={from} replace />
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setError(null)
        setFieldErrors({})
        setSubmitting(true)
        try {
            await login(email, password)
        } catch (err) {
            setError(describeError(err))
            setFieldErrors(err instanceof ApiError ? err.fieldErrors : {})
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AuthShell><div className="auth-card learner-auth-card">
            <p className="practice-eyebrow">Welcome back</p>
            <h1>Log in</h1>
            <p className="auth-description">Your next solution is waiting. Let’s pick up where you left off.</p>
            <form onSubmit={handleSubmit} noValidate>
                <fieldset disabled={submitting}>
                <div className="auth-field"><label htmlFor="login-email">Email</label>
                    <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="you@example.com" required aria-invalid={!!fieldErrors.email} aria-describedby="login-email-error"
                    />
                    <span id="login-email-error" className="field-error">{fieldErrors.email}</span>
                </div>
                <div className="auth-field"><label htmlFor="login-password">Password</label><div className="password-field">
                    <input
                        id="login-password" type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required aria-invalid={!!fieldErrors.password} aria-describedby="login-password-error"
                    />
                    <button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}><Icon name="eye" size={18} /></button></div>
                    <span id="login-password-error" className="field-error">{fieldErrors.password}</span>
                </div>
                {error && <p className="error auth-error" role="alert">{error}</p>}
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Logging in…' : 'Log in'}<Icon name="arrow" size={17} />
                </button>
                </fieldset>
            </form>
            <p className="muted">
                No account? <Link to="/register">Register</Link>
            </p>
        </div></AuthShell>
    )
}
