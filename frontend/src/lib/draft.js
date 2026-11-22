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
        return true
    } catch {
        return false
    }
}

export function clearDraft(slug) {
    try {
        localStorage.removeItem(key(slug))
        return true
    } catch {
        return false
    }
}
