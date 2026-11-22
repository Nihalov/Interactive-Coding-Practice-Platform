import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { progressApi } from '../src/api/progress.js'
import { problemsApi } from '../src/api/problems.js'
import { clearDraft, loadDraft, saveDraft } from '../src/lib/draft.js'

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
let stored
beforeEach(() => {
    stored = new Map()
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) },
    })
})
afterEach(() => {
    mock.restoreAll()
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else delete globalThis.localStorage
})

test('progress markers include older solved problems beyond the first 50 entries', async () => {
    const first = Array.from({ length: 50 }, (_, i) => ({ problemSlug: `problem-${i}`, solved: false, attempts: 1 }))
    const fetchMock = mock.method(globalThis, 'fetch', async (path) => {
        if (path === '/api/users/me/progress?page=0&size=50') return Response.json({ content: first, totalPages: 2 })
        assert.equal(path, '/api/users/me/progress?page=1&size=50')
        return Response.json({ content: [{ problemSlug: 'older-solved-problem', solved: true, attempts: 4 }], totalPages: 2 })
    })
    const map = await progressApi.list()
    assert.equal(map.size, 51)
    assert.equal(map.get('older-solved-problem').solved, true)
    assert.equal(fetchMock.mock.callCount(), 2)
})

test('empty progress completes after one request', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ content: [], totalPages: 0 }))
    assert.equal((await progressApi.list()).size, 0)
    assert.equal(fetchMock.mock.callCount(), 1)
})

test('returning to the library waits for an in-flight problem start before reading progress', async () => {
    let finishStart
    const fetchMock = mock.method(globalThis, 'fetch', async (path, options) => {
        if (path.endsWith('/start')) {
            assert.equal(path, '/api/users/me/progress/a%2B-b/start')
            assert.equal(options.method, 'PUT')
            return new Promise((resolve) => { finishStart = resolve })
        }
        return Response.json({ content: [{ problemSlug: 'a+-b', solved: false, attempts: 0 }], totalPages: 1 })
    })
    const starting = progressApi.start('a+-b')
    const reading = progressApi.list()
    assert.equal(fetchMock.mock.callCount(), 1)
    finishStart(new Response(null, { status: 204 }))
    await starting
    const map = await reading
    assert.equal(map.get('a+-b').attempts, 0)
    assert.equal(map.get('a+-b').solved, false)
    assert.equal(fetchMock.mock.callCount(), 2)
})

test('a failed start is reported and does not block subsequent progress reads', async () => {
    mock.method(globalThis, 'fetch', async (path) => path.endsWith('/start')
        ? new Response(null, { status: 500 })
        : Response.json({ content: [], totalPages: 0 }))
    await assert.rejects(progressApi.start('missing'), (error) => error.status === 500)
    assert.equal((await progressApi.list()).size, 0)
})

test('problem searches preserve pagination and filters and encode literal search characters', async () => {
    mock.method(globalThis, 'fetch', async (path) => {
        const url = new URL(path, 'http://localhost')
        assert.equal(url.pathname, '/api/problems')
        assert.equal(url.searchParams.get('q'), 'Two Sum & 100%_')
        assert.equal(url.searchParams.get('difficulty'), 'EASY')
        assert.equal(url.searchParams.get('page'), '1')
        assert.equal(url.searchParams.get('size'), '25')
        assert.equal(url.searchParams.get('sort'), 'title,asc')
        return Response.json({ content: [], totalPages: 0 })
    })
    await problemsApi.list({ q: '  Two Sum & 100%_  ', difficulty: 'EASY', page: 1, size: 25, sort: 'title,asc' })
})

test('blank searches request the unfiltered library', async () => {
    mock.method(globalThis, 'fetch', async (path) => {
        assert.equal(new URL(path, 'http://localhost').searchParams.has('q'), false)
        return Response.json({ content: [], totalPages: 0 })
    })
    await problemsApi.list({ q: '   ', page: 0, size: 10 })
})

test('a later progress-page failure rejects rather than presenting partial markers as complete', async () => {
    mock.method(globalThis, 'fetch', async (path) => path.includes('page=0')
        ? Response.json({ content: [{ problemSlug: 'recent', solved: true }], totalPages: 2 })
        : new Response(null, { status: 500 }))
    await assert.rejects(progressApi.list(), (error) => error.status === 500)
})

test('local draft status is successful only after saving and clearing the actual stored value', () => {
    assert.equal(loadDraft('a-plus-b'), null)
    assert.equal(saveDraft('a-plus-b', 'class Solution {}'), true)
    assert.equal(loadDraft('a-plus-b'), 'class Solution {}')
    assert.equal(clearDraft('a-plus-b'), true)
    assert.equal(loadDraft('a-plus-b'), null)
})

test('blocked browser storage is reported as a failed save, not a saved draft', () => {
    const fail = () => { throw new Error('Storage blocked') }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: fail, setItem: fail, removeItem: fail } })
    assert.equal(saveDraft('a-plus-b', 'source'), false)
    assert.equal(clearDraft('a-plus-b'), false)
    assert.equal(loadDraft('a-plus-b'), null)
})
