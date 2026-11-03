import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { describeError } from '../api/errors'
import { useAuth } from '../auth/useAuth'

export function RegisterPage() {
    const { user, register } = useAuth()

    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [fieldErrors, setFieldErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)

    if (user) {
        return <Navigate to="/" replace />
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setError(null)
        setFieldErrors({})
        setSubmitting(true)
        try {
            await register(email, username, password)
        } catch (err) {
            setFieldErrors(err instanceof ApiError ? err.fieldErrors : {})
            setError(describeError(err))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="auth-card">
            <h1>Create an account</h1>
            {/* noValidate: the backend is the source of truth, so its messages are shown as they are */}
            <form onSubmit={handleSubmit} noValidate>
                <label>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                    {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
                </label>
                <label>
                    Username
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                    />
                    {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
                </label>
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Creating account…' : 'Register'}
                </button>
            </form>
            <p className="muted">
                Already registered? <Link to="/login">Log in</Link>
            </p>
        </div>
    )
}