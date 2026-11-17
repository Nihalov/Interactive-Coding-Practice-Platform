import { computeLayout } from './model.js'

export function parseArrayValues(text) {
    let values
    try {
        values = JSON.parse(text)
    } catch {
        throw new Error('Enter a JSON array, for example [2, 7, "hello", true].')
    }
    if (!Array.isArray(values) || values.length > 100) {
        throw new Error('Use an array containing at most 100 values.')
    }
    if (values.some((v) => !(typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) ||
        (typeof v === 'string' && v.length <= 100)))) {
        throw new Error('Values must be numbers, booleans, or strings up to 100 characters. Null and nested arrays are not supported.')
    }
    return values
}

/** Keep a detached pointer near its last visible position. */
function detach(pointer, boxes) {
    const box = boxes.get(pointer.id)
    return { ...pointer, x: box?.x ?? pointer.x, y: box?.y ?? pointer.y, targetElementId: null, index: null }
}

export function updateElement(elements, updated) {
    const boxes = computeLayout(elements)
    return elements.map((e) => {
        if (e.id === updated.id) {
            return e.type === 'POINTER' && e.targetElementId && !updated.targetElementId
                ? { ...updated, x: boxes.get(e.id)?.x ?? updated.x, y: boxes.get(e.id)?.y ?? updated.y }
                : updated
        }
        if (updated.type === 'ARRAY' && e.type === 'POINTER' && e.targetElementId === updated.id &&
            e.index >= updated.values.length) {
            return updated.values.length === 0
                ? detach(e, boxes)
                : { ...e, index: updated.values.length - 1 }
        }
        return e
    })
}

export function deleteElement(elements, id) {
    const boxes = computeLayout(elements)
    return elements
        .filter((e) => e.id !== id && !(e.type === 'ARROW' && (e.fromElementId === id || e.toElementId === id)))
        .map((e) => e.type === 'POINTER' && e.targetElementId === id ? detach(e, boxes) : e)
}
