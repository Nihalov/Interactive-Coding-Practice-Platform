import { api, ApiError } from './client'
import { ACTIVE_STATUSES } from './results'

function abortError() {
    return new DOMException('Aborted', 'AbortError')
}

function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms)
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(timer)
                reject(abortError())
            },
            { once: true },
        )
    })
}

export const submissionsApi = {
    submit: (problemSlug, sourceCode) =>
        api('/api/submissions', { method: 'POST', body: { problemSlug, sourceCode } }),

    get: (id) => api(`/api/submissions/${id}`),

    history: ({ problem, page, size }) => {
        const query = new URLSearchParams({ page: String(page), size: String(size) })
        if (problem) {
            query.set('problem', problem)
        }
        return api(`/api/users/me/submissions?${query}`)
    },
}

/**
 * Polls until the submission leaves QUEUED/RUNNING.
 * Stops when the signal is aborted, on any API error, or after the timeout.
 */
export async function waitForSubmission(id, { signal, onUpdate, intervalMs = 1000, timeoutMs = 120_000 } = {}) {
    const deadline = Date.now() + timeoutMs
    for (;;) {
        if (signal?.aborted) {
            throw abortError()
        }
        const submission = await submissionsApi.get(id)
        onUpdate?.(submission)
        if (!ACTIVE_STATUSES.has(submission.status)) {
            return submission
        }
        if (Date.now() > deadline) {
            throw new ApiError(0, 'Still judging after 2 minutes. Check your submission history later.')
        }
        await sleep(intervalMs, signal)
    }
}