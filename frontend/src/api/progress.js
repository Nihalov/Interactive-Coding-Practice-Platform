import { api } from './client.js'

const pendingStarts = new Set()

// A quick return to the library must read progress after the start request commits.
async function readProgress(path) {
    await Promise.allSettled([...pendingStarts])
    return api(path)
}

export const progressApi = {
    start(slug) {
        const request = api(`/api/users/me/progress/${encodeURIComponent(slug)}/start`, { method: 'PUT' })
            .finally(() => pendingStarts.delete(request))
        pendingStarts.add(request)
        return request
    },

    /** Complete progress map; the backend caps each page at 50 entries. */
    async list() {
        const entries = new Map()
        let index = 0
        let totalPages
        do {
            const page = await readProgress(`/api/users/me/progress?page=${index}&size=50`)
            page.content.forEach((p) => entries.set(p.problemSlug, p))
            totalPages = page.totalPages
            index++
        } while (index < totalPages)
        return entries
    },

    stats: () => readProgress('/api/users/me/stats'),

    page: ({ page, size }) => readProgress(`/api/users/me/progress?page=${page}&size=${size}`),
}
