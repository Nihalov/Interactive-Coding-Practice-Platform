import { api } from './client'

const SCHEMA_VERSION = 1

export const workspaceApi = {
    /** Returns { version, updatedAt, state: { schemaVersion, elements } }. version is null if nothing was saved yet. */
    get: (slug) => api(`/api/problems/${encodeURIComponent(slug)}/workspace`),

    save: (slug, version, elements) =>
        api(`/api/problems/${encodeURIComponent(slug)}/workspace`, {
            method: 'PUT',
            body: { version, state: { schemaVersion: SCHEMA_VERSION, elements } },
        }),
}