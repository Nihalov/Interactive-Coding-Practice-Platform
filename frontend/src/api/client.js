const TOKEN_KEY = 'codearena.token'

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (token) => localStorage.setItem(TOKEN_KEY, token),
    clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
    constructor(status, message, fieldErrors = null, retryAfterSeconds = null) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.fieldErrors = fieldErrors ?? {}
        this.retryAfterSeconds = retryAfterSeconds
    }
}

// The auth provider registers a callback here, so a 401 anywhere logs the user out
let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
    unauthorizedHandler = handler
}

function defaultMessage(status) {
    switch (status) {
        case 401:
            return 'Your session has expired. Please log in again.'
        case 403:
            return 'You do not have permission to do that.'
        case 429:
            return 'Too many requests. Please slow down.'
        default:
            return `Request failed (${status})`
    }
}

/**
 * Every backend call goes through here.
 * options: { method = 'GET', body, auth = true }
 * auth: false is used by login and register, which must never send or react to a token.
 */
export async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {}
    const token = auth ? tokenStore.get() : null
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
    }

    let response
    try {
        response = await fetch(path, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        })
    } catch {
        throw new ApiError(0, 'Cannot reach the server. Is the backend running?')
    }

    if (response.ok) {
        if (response.status === 204) {
            return undefined
        }
        return response.json()
    }

    // The backend's error shape: { timestamp, status, error, message, path, fieldErrors }
    let errorBody = {}
    try {
        errorBody = await response.json()
    } catch {
        // Spring Security's own 401 responses have no body
    }

    // Only react if we actually sent a token that the server rejected
    if (response.status === 401 && token && unauthorizedHandler) {
        unauthorizedHandler()
    }

    const retryHeader = response.headers.get('Retry-After')
    throw new ApiError(
        response.status,
        errorBody.message ?? defaultMessage(response.status),
        errorBody.fieldErrors ?? null,
        retryHeader ? Number(retryHeader) : null,
    )
}