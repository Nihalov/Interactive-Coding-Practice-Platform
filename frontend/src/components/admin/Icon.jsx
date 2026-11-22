const paths = {
    book: 'M4 4h6a3 3 0 0 1 3 3v13a4 4 0 0 0-4-2H4z M13 7a3 3 0 0 1 3-3h5v14h-4a4 4 0 0 0-4 2',
    plus: 'M12 5v14 M5 12h14',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    external: 'M14 4h6v6 M20 4l-9 9 M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5',
    refresh: 'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-1l2 6 M4 12l2 6a7 7 0 0 0 12-1',
    check: 'M5 12l4 4L19 6',
    shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M9 12l2 2 4-4',
    trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
    close: 'M6 6l12 12 M18 6L6 18',
    edit: 'M15 4l5 5 M4 20l5-1L21 7l-5-5L4 14z',
    save: 'M5 3h12l4 4v14H3V3z M7 3v6h10V3 M7 21v-8h10v8',
    layers: 'M12 3l10 6-10 6L2 9z M3 14l9 5 9-5 M3 18l9 5 9-5',
    play: 'M8 4l13 8-13 8z',
    code: 'M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',
    clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    trophy: 'M8 3h8v7a4 4 0 0 1-8 0z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 14v6 M8 21h8',
    terminal: 'M4 6l6 6-6 6 M13 18h7',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    copy: 'M9 9h12v12H9z M15 9V3H3v12h6',
    expand: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5',
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
    logout: 'M9 4H4v16h5 M14 8l4 4-4 4 M8 12h13',
    chevron: 'M6 9l6 6 6-6',
    search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    activity: 'M2 12h5l3-8 4 16 3-8h5',
}

export function Icon({ name, size = 18, className = '' }) {
    return <svg className={`ui-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={paths[name] ?? paths.book} />
    </svg>
}
