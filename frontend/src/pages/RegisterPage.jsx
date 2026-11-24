import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HomeRedirect } from '../auth/RoleRoutes'
import { ApiError } from '../api/client'
import { describeError } from '../api/errors'
import { useAuth } from '../auth/useAuth'
import { AuthShell } from '../components/practice/AuthShell'
import { Icon } from '../components/admin/Icon'

export function RegisterPage() {
    const { user, register } = useAuth()

    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [fieldErrors, setFieldErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    if (user) {
        return <HomeRedirect />
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
        <AuthShell><div className="auth-card learner-auth-card">
            <p className="practice-eyebrow">Start your next chapter</p>
            <h1>Create an account</h1>
            <p className="auth-description">A place for your code, your progress, and your next breakthrough.</p>
            {/* noValidate: the backend is the source of truth, so its messages are shown as they are */}
            <form onSubmit={handleSubmit} noValidate>
                <fieldset disabled={submitting}>
                <div className="auth-field"><label htmlFor="register-email">Email</label>
                    <input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="you@example.com" required aria-invalid={!!fieldErrors.email} aria-describedby="register-email-error"
                    />
                    <span id="register-email-error" className="field-error">{fieldErrors.email}</span>
                </div>
                <div className="auth-field"><label htmlFor="register-username">Username</label>
                    <input
                        id="register-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        placeholder="What should we call you?" required minLength={3} maxLength={30} aria-invalid={!!fieldErrors.username} aria-describedby="register-username-error"
                    />
                    <span id="register-username-error" className="field-error">{fieldErrors.username}</span>
                </div>
                <div className="auth-field"><label htmlFor="register-password">Password</label><div className="password-field">
                    <input
                        id="register-password" type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Create a password" required minLength={8} maxLength={72} aria-invalid={!!fieldErrors.password} aria-describedby="register-password-help register-password-error"
                    />
                    <button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}><Icon name="eye" size={18} /></button></div>
                    <span id="register-password-help" className="auth-field-help">Use 8–72 characters.</span>
                    <span id="register-password-error" className="field-error">{fieldErrors.password}</span>
                </div>
                {error && <p className="error auth-error" role="alert">{error}</p>}
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Creating account…' : 'Register'}<Icon name="arrow" size={17} />
                </button>
                </fieldset>
            </form>
            <p className="muted">
                Already registered? <Link to="/login">Log in</Link>
            </p>
        </div></AuthShell>
    )
}
