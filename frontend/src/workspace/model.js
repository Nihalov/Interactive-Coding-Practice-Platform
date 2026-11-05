export const MAX_ELEMENTS = 500
export const CANVAS_W = 2400
export const CANVAS_H = 1400

export const CELL_W = 56
export const CELL_H = 44
export const POINTER_H = 24
export const NOTE_LINE_H = 18

const VAR_W = 150
const VAR_H = 44
const NOTE_W = 190
const NOTE_MAX_LINES = 8
const NOTE_CHARS_PER_LINE = 24

// Default positions leave room on the left for array names
const SPAWN = {
    ARRAY: { x: 140, y: 140 },
    POINTER: { x: 140, y: 60 },
    VARIABLE: { x: 760, y: 140 },
    TEXT: { x: 1000, y: 140 },
}
const POINTER_NAMES = ['i', 'j', 'k', 'l', 'm', 'n']
const VARIABLE_NAMES = ['x', 'y', 'z', 'w']

export function shorten(text, max) {
    const s = String(text ?? '')
    return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/** Ids must match the backend rule [A-Za-z0-9_-]{1,64}; numbers only ever go up, so ids are never reused */
function nextId(elements, prefix) {
    const pattern = new RegExp(`^${prefix}-(\\d+)$`)
    let max = 0
    for (const e of elements) {
        const match = pattern.exec(e.id)
        if (match) {
            max = Math.max(max, Number(match[1]))
        }
    }
    return `${prefix}-${max + 1}`
}

/** Builds a new element with sensible defaults, positioned so new ones do not hide each other */
export function createElement(type, elements) {
    const count = elements.filter((e) => e.type === type).length
    const base = SPAWN[type]
    const x = base.x + (count % 6) * 36
    const y = base.y + (count % 8) * 80

    switch (type) {
        case 'ARRAY':
            return {
                id: nextId(elements, 'arr'),
                type,
                x,
                y,
                name: count === 0 ? 'arr' : `arr${count + 1}`,
                values: [1, 2, 3, 4],
            }
        case 'POINTER': {
            const arrays = elements.filter((e) => e.type === 'ARRAY')
            const target = arrays[arrays.length - 1]
            const pointer = {
                id: nextId(elements, 'ptr'),
                type,
                name: POINTER_NAMES[count] ?? `p${count + 1}`,
                x,
                y,
            }
            // With an array on the canvas, start bound to its first cell
            if (target && (target.values ?? []).length > 0) {
                pointer.targetElementId = target.id
                pointer.index = 0
                pointer.x = target.x
                pointer.y = target.y - 50
            }
            return pointer
        }
        case 'VARIABLE':
            return {
                id: nextId(elements, 'var'),
                type,
                x,
                y,
                name: VARIABLE_NAMES[count] ?? `v${count + 1}`,
                value: '0',
            }
        case 'TEXT':
            return { id: nextId(elements, 'note'), type, x, y, text: 'Note' }
        default:
            throw new Error(`Unknown element type: ${type}`)
    }
}

/** Word-wraps note text into at most 8 lines */
export function wrapLines(text, maxChars = NOTE_CHARS_PER_LINE) {
    const lines = []
    for (const paragraph of String(text ?? '').split('\n')) {
        let line = ''
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            let rest = word
            while (rest.length > maxChars) {
                if (line) {
                    lines.push(line)
                    line = ''
                }
                lines.push(rest.slice(0, maxChars))
                rest = rest.slice(maxChars)
            }
            if (!line) {
                line = rest
            } else if (line.length + 1 + rest.length <= maxChars) {
                line += ` ${rest}`
            } else {
                lines.push(line)
                line = rest
            }
        }
        lines.push(line)
    }
    if (lines.length > NOTE_MAX_LINES) {
        const cut = lines.slice(0, NOTE_MAX_LINES)
        cut[NOTE_MAX_LINES - 1] = `${cut[NOTE_MAX_LINES - 1].slice(0, maxChars - 1)}…`
        return cut
    }
    return lines
}

/**
 * Turns the stored elements into drawable boxes: Map(id -> { x, y, w, h, ... }).
 * A pointer that is bound to a valid array cell gets its position from that cell
 * (bound: true); otherwise it uses its own x and y.
 */
export function computeLayout(elements) {
    const byId = new Map(elements.map((e) => [e.id, e]))
    const boxes = new Map()

    for (const e of elements) {
        if (e.type === 'ARRAY') {
            boxes.set(e.id, { x: e.x, y: e.y, w: Math.max(1, (e.values ?? []).length) * CELL_W, h: CELL_H })
        } else if (e.type === 'VARIABLE') {
            boxes.set(e.id, { x: e.x, y: e.y, w: VAR_W, h: VAR_H })
        } else if (e.type === 'TEXT') {
            const lines = wrapLines(e.text)
            boxes.set(e.id, { x: e.x, y: e.y, w: NOTE_W, h: lines.length * NOTE_LINE_H + 16, lines })
        }
    }

    // Pointers come last because they depend on the array boxes
    const stacked = new Map() // "arrayId:index" -> pointers already placed on that cell
    for (const e of elements) {
        if (e.type !== 'POINTER') continue

        const w = Math.max(34, (e.name ?? '').length * 8 + 16)
        const target = e.targetElementId ? byId.get(e.targetElementId) : null
        const values = target && target.type === 'ARRAY' ? (target.values ?? []) : null
        const bound = values !== null && Number.isInteger(e.index) && e.index >= 0 && e.index < values.length

        if (bound) {
            const key = `${target.id}:${e.index}`
            const level = stacked.get(key) ?? 0
            stacked.set(key, level + 1)
            const cellCenter = target.x + e.index * CELL_W + CELL_W / 2
            boxes.set(e.id, {
                x: cellCenter - w / 2,
                y: target.y - 14 - POINTER_H - level * (POINTER_H + 8),
                w,
                h: POINTER_H,
                bound: true,
                tipY: target.y - 2,
            })
        } else {
            boxes.set(e.id, { x: e.x, y: e.y, w, h: POINTER_H, bound: false })
        }
    }

    return boxes
}

function center(box) {
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

/** Where the line from a box's center toward a point leaves the box's edge */
function edgePoint(box, toward) {
    const c = center(box)
    const dx = toward.x - c.x
    const dy = toward.y - c.y
    if (dx === 0 && dy === 0) return c
    const scaleX = dx === 0 ? Infinity : box.w / 2 / Math.abs(dx)
    const scaleY = dy === 0 ? Infinity : box.h / 2 / Math.abs(dy)
    const scale = Math.min(scaleX, scaleY)
    return { x: c.x + dx * scale, y: c.y + dy * scale }
}

/** Start and end of an arrow, or null if either end is missing */
export function arrowEndpoints(arrow, boxes) {
    const from = boxes.get(arrow.fromElementId)
    const to = boxes.get(arrow.toElementId)
    if (!from || !to) return null
    return { from: edgePoint(from, center(to)), to: edgePoint(to, center(from)) }
}