import { api } from './client'

export const progressApi = {
    /** slug -> { solved, attempts, ... } for the user's most recently attempted problems (page size is capped at 50) */
    async list() {
        const page = await api('/api/users/me/progress?size=50')
        return new Map(page.content.map((p) => [p.problemSlug, p]))
    },
}