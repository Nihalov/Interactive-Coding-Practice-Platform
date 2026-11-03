const key = (slug) => `codearena.code.${slug}`

export function loadDraft(slug) {
    try {
        return localStorage.getItem(key(slug))
    } catch {
        return null
    }
}

export function saveDraft(slug, code) {
    try {
        localStorage.setItem(key(slug), code)
    } catch {
        // storage full or blocked: the draft just isn't saved
    }
}

export function clearDraft(slug) {
    try {
        localStorage.removeItem(key(slug))
    } catch {
        // ignore
    }
}