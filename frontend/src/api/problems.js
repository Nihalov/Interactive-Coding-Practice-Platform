import { api } from './client.js'

export const problemsApi = {
    list: ({ difficulty, q, page, size, sort }) => {
        const query = new URLSearchParams({ page: String(page), size: String(size) })
        if (q?.trim()) query.set('q', q.trim())
        if (difficulty) {
            query.set('difficulty', difficulty)
        }
        if (sort) query.set('sort', sort)
        return api(`/api/problems?${query}`)
    },

    get: (slug) => api(`/api/problems/${encodeURIComponent(slug)}`),

    samples: (slug) => api(`/api/problems/${encodeURIComponent(slug)}/samples`),

    run: (slug, sourceCode) =>
        api(`/api/problems/${encodeURIComponent(slug)}/run`, { method: 'POST', body: { sourceCode } }),
}
