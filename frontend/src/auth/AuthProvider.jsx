import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/auth'
import { setUnauthorizedHandler, tokenStore } from '../api/client'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    // true while a stored token is being checked against the server
    const [loading, setLoading] = useState(() => tokenStore.get() !== null)

    const logout = useCallback(() => {
        tokenStore.clear()
        setUser(null)
    }, [])

    // Any 401 on an authenticated request ends the session
    useEffect(() => {
        setUnauthorizedHandler(logout)
        return () => setUnauthorizedHandler(null)
    }, [logout])

    // Restore the session on page load by asking the server who the token belongs to
    useEffect(() => {
        if (tokenStore.get() === null) {
            return
        }
        let cancelled = false
        authApi
            .me()
            .then((me) => {
                if (!cancelled) setUser(me)
            })
            .catch(() => {
                // A 401 already logged the user out through the handler. Any other failure
                // (such as the backend being down) simply leaves the user logged out.
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    const login = useCallback(async (email, password) => {
        const response = await authApi.login(email, password)
        tokenStore.set(response.accessToken)
        setUser(response.user)
    }, [])

    const register = useCallback(
        async (email, username, password) => {
            await authApi.register(email, username, password)
            await login(email, password)
        },
        [login],
    )

    const value = useMemo(
        () => ({ user, loading, login, register, logout }),
        [user, loading, login, register, logout],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}