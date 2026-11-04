const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime(iso) {
    if (!iso) return '—'
    // The backend sends up to 7 fractional digits; some browsers only parse 3
    const date = new Date(iso.replace(/(\.\d{3})\d+/, '$1'))
    return Number.isNaN(date.getTime()) ? iso : dateTime.format(date)
}

export function formatDuration(ms) {
    if (ms === null || ms === undefined) return '—'
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`
}