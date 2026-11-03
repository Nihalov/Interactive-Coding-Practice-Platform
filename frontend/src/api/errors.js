import { ApiError } from './client'

export function describeError(err) {
    if (err instanceof ApiError) {
        if (err.status === 429 && err.retryAfterSeconds) {
            return `Too many attempts. Try again in ${err.retryAfterSeconds} seconds.`
        }
        return err.message
    }
    return 'Something went wrong. Please try again.'
}