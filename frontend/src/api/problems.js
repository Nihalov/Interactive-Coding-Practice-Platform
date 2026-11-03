import { api } from './client'

export const problemsApi = {
    list: ({ difficulty, page, size }) => {
        const query = new URLSearchParams({ page: String(page), size: String(size) })
        if (difficulty) {
            query.set('difficulty', difficulty)
        }
        return api(`/api/problems?${query}`)
    },

    get: (slug) => api(`/api/problems/${encodeURIComponent(slug)}`),

    samples: (slug) => api(`/api/problems/${encodeURIComponent(slug)}/samples`),

    run: (slug, sourceCode) =>
        api(`/api/problems/${encodeURIComponent(slug)}/run`, { method: 'POST', body: { sourceCode } }),
}