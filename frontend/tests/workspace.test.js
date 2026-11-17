import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement, computeLayout } from '../src/workspace/model.js'
import { parseArrayValues, deleteElement, updateElement } from '../src/workspace/editing.js'
import { createHistory, historyReducer } from '../src/workspace/history.js'

const array = { id: 'arr-1', type: 'ARRAY', x: 140, y: 140, name: 'arr', values: [2, 7, 11] }
const pointer = { id: 'ptr-1', type: 'POINTER', x: 0, y: 0, name: 'i', targetElementId: array.id, index: 2 }
const note = { id: 'note-1', type: 'TEXT', x: 500, y: 200, text: 'target = 9' }
const arrow = { id: 'arrow-1', type: 'ARROW', fromElementId: array.id, toElementId: note.id }
const scene = [array, pointer, note, arrow]

test('array editing preserves scalar types, commas in strings, and empty arrays', () => {
    assert.deepEqual(parseArrayValues('[2,"hello, world",false]'), [2, 'hello, world', false])
    assert.deepEqual(parseArrayValues('[]'), [])
})

test('array editing rejects invalid JSON and values the backend cannot save', () => {
    for (const input of ['1,2', '{}', '[null]', '[[1]]', '[{}]', '[1e999]', JSON.stringify(['x'.repeat(101)]), JSON.stringify(Array(101).fill(0))]) {
        assert.throws(() => parseArrayValues(input))
    }
})

test('deleting an array removes its arrows and detaches pointers at their visible positions', () => {
    const box = computeLayout(scene).get(pointer.id)
    const deleted = deleteElement(scene, array.id)
    assert.deepEqual(deleted.map((e) => e.id), [pointer.id, note.id])
    assert.deepEqual(deleted[0], { ...pointer, x: box.x, y: box.y, targetElementId: null, index: null })
    assert.equal(scene[1].targetElementId, array.id)
})

test('deleting an arrow leaves its endpoints unchanged', () => {
    assert.deepEqual(deleteElement(scene, arrow.id), [array, pointer, note])
})

test('shrinking an array clamps its pointers; an empty array detaches them', () => {
    assert.equal(updateElement(scene, { ...array, values: [2] })[1].index, 0)
    assert.equal(updateElement(scene, { ...array, values: [] })[1].targetElementId, null)
    assert.equal(pointer.index, 2)
})

test('unbinding a pointer keeps its current canvas location', () => {
    const box = computeLayout(scene).get(pointer.id)
    const updated = updateElement(scene, { ...pointer, targetElementId: null, index: null })[1]
    assert.equal(updated.x, box.x)
    assert.equal(updated.y, box.y)
})

test('new arrows have distinct, non-arrow endpoints and unique ids', () => {
    const created = createElement('ARROW', scene)
    assert.equal(created.id, 'arrow-2')
    assert.notEqual(created.fromElementId, created.toElementId)
    assert.ok(scene.some((e) => e.id === created.fromElementId && e.type !== 'ARROW'))
    assert.throws(() => createElement('ARROW', [array, arrow]))
})

test('undo restores deleted arrays, pointers, and connecting arrows together', () => {
    const removed = historyReducer(createHistory(scene), { type: 'replace', elements: deleteElement(scene, array.id) })
    const restored = historyReducer(removed, { type: 'undo' })
    assert.deepEqual(restored.present, scene)
    assert.deepEqual(historyReducer(restored, { type: 'redo' }).present, removed.present)
})

test('one drag is one history step regardless of pointermove events', () => {
    let state = historyReducer(createHistory(scene), { type: 'move-start' })
    for (let i = 0; i < 50; i++) {
        state = historyReducer(state, { type: 'move', id: array.id, x: i, y: i })
    }
    state = historyReducer(state, { type: 'move-end' })
    assert.equal(state.past.length, 1)
    assert.equal(state.present[0].x, 49)
    assert.deepEqual(historyReducer(state, { type: 'undo' }).present, scene)
})

test('clicking without dragging creates no history and preserves redo', () => {
    let state = historyReducer(createHistory(scene), { type: 'replace', elements: [array] })
    state = historyReducer(state, { type: 'undo' })
    state = historyReducer(state, { type: 'move-start' })
    state = historyReducer(state, { type: 'move-end' })
    assert.equal(state.past.length, 0)
    assert.equal(state.future.length, 1)
})

test('editing after undo clears the old redo branch, while no-op edits preserve it', () => {
    let state = historyReducer(createHistory(scene), { type: 'replace', elements: [array] })
    state = historyReducer(state, { type: 'undo' })
    state = historyReducer(state, { type: 'replace', elements: [...scene] })
    assert.equal(state.future.length, 1)
    state = historyReducer(state, { type: 'replace', elements: [note] })
    assert.equal(state.future.length, 0)
})

test('history keeps only the latest 100 edits', () => {
    let state = createHistory([note])
    for (let i = 0; i < 120; i++) {
        state = historyReducer(state, { type: 'replace', elements: [{ ...note, text: String(i) }] })
    }
    assert.equal(state.past.length, 100)
})
