import { createContext } from 'react'

// Value shape: { user, loading, login(email, password), register(email, username, password), logout() }
export const AuthContext = createContext(null)