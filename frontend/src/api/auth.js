import { api } from './client'

export const authApi = {
    login: (email, password) =>
        api('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),

    register: (email, username, password) =>
        api('/api/auth/register', {
            method: 'POST',
            body: { email, username, password },
            auth: false,
        }),

    me: () => api('/api/auth/me'),
}