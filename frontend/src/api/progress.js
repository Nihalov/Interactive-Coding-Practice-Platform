import { api } from './client.js'

export const progressApi = {
    /** Complete progress map; the backend caps each page at 50 entries. */
    async list() {
        const entries = new Map()
        let index = 0
        let totalPages
        do {
            const page = await api(`/api/users/me/progress?page=${index}&size=50`)
            page.content.forEach((p) => entries.set(p.problemSlug, p))
            totalPages = page.totalPages
            index++
        } while (index < totalPages)
        return entries
    },

    stats: () => api('/api/users/me/stats'),

    page: ({ page, size }) => api(`/api/users/me/progress?page=${page}&size=${size}`),
}
