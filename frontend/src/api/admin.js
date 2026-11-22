import { api } from './client.js'

export const adminApi = {
    createProblem: (body) => api('/api/problems', { method: 'POST', body }),
    updateProblem: (id, body) => api(`/api/problems/${id}`, { method: 'PUT', body }),
    deleteProblem: (id) => api(`/api/problems/${id}`, { method: 'DELETE' }),
    testCases: (problemId) => api(`/api/problems/${problemId}/test-cases`),
    createTestCase: (problemId, body) => api(`/api/problems/${problemId}/test-cases`, { method: 'POST', body }),
    updateTestCase: (problemId, id, body) => api(`/api/problems/${problemId}/test-cases/${id}`, { method: 'PUT', body }),
    deleteTestCase: (problemId, id) => api(`/api/problems/${problemId}/test-cases/${id}`, { method: 'DELETE' }),
}
