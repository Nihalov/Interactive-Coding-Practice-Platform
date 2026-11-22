import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { adminApi } from '../src/api/admin.js'
import { ApiError } from '../src/api/client.js'

const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => 'admin-test-token' },
    })
})

afterEach(() => {
    mock.restoreAll()
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
    else delete globalThis.localStorage
})

const problem = { title: 'A Plus B', description: 'Read two numbers.', difficulty: 'EASY' }
const hiddenCase = { input: '  1 2\n', expectedOutput: '3\n', sample: false }

for (const [name, method, path, body, request] of [
    ['create problem', 'POST', '/api/problems', problem, () => adminApi.createProblem(problem)],
    ['update problem', 'PUT', '/api/problems/5', problem, () => adminApi.updateProblem(5, problem)],
    ['delete problem', 'DELETE', '/api/problems/5', undefined, () => adminApi.deleteProblem(5)],
    ['list all test cases', 'GET', '/api/problems/5/test-cases', undefined, () => adminApi.testCases(5)],
    ['create hidden test case', 'POST', '/api/problems/5/test-cases', hiddenCase, () => adminApi.createTestCase(5, hiddenCase)],
    ['update test case', 'PUT', '/api/problems/5/test-cases/9', hiddenCase, () => adminApi.updateTestCase(5, 9, hiddenCase)],
    ['delete test case', 'DELETE', '/api/problems/5/test-cases/9', undefined, () => adminApi.deleteTestCase(5, 9)],
]) {
    test(`admin API: ${name} uses the authenticated backend contract`, async () => {
        const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
            assert.equal(url, path)
            assert.equal(options.method, method)
            assert.equal(options.headers.Authorization, 'Bearer admin-test-token')
            assert.equal(options.body, body === undefined ? undefined : JSON.stringify(body))
            return method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ id: 9 })
        })
        const response = await request()
        assert.equal(fetchMock.mock.callCount(), 1)
        if (method === 'DELETE') assert.equal(response, undefined)
        else assert.deepEqual(response, { id: 9 })
    })
}

test('admin API preserves empty stdin/stdout and explicitly selected sample visibility', async () => {
    mock.method(globalThis, 'fetch', async (_url, options) => {
        assert.deepEqual(JSON.parse(options.body), { input: '', expectedOutput: '', sample: true })
        return Response.json({ id: 1, input: '', expectedOutput: '', sample: true })
    })
    await adminApi.createTestCase(5, { input: '', expectedOutput: '', sample: true })
})

test('admin API preserves backend permission failures instead of reporting success', async () => {
    mock.method(globalThis, 'fetch', async () => new Response(null, { status: 403 }))
    await assert.rejects(adminApi.testCases(5), (error) => error instanceof ApiError && error.status === 403)
})

test('admin API preserves delete conflicts so the editor can explain retained submission history', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Cannot delete a problem that already has submissions' }, { status: 409 }))
    await assert.rejects(adminApi.deleteProblem(5), (error) => error.status === 409 && error.message.includes('submissions'))
})

test('admin API preserves field validation errors for forms', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({
        message: 'Validation failed', fieldErrors: { title: 'must not be blank' },
    }, { status: 400 }))
    await assert.rejects(adminApi.createProblem(problem), (error) => {
        assert.equal(error.status, 400)
        assert.deepEqual(error.fieldErrors, { title: 'must not be blank' })
        return true
    })
})
