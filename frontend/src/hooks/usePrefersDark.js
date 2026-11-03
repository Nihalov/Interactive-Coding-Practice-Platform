import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-color-scheme: dark)'

function subscribe(callback) {
    const media = window.matchMedia(QUERY)
    media.addEventListener('change', callback)
    return () => media.removeEventListener('change', callback)
}

export function usePrefersDark() {
    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(QUERY).matches,
        () => false,
    )
}