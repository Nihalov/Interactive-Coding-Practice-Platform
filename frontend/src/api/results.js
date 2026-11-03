export const ACTIVE_STATUSES = new Set(['QUEUED', 'RUNNING'])

const LABELS = {
    QUEUED: 'Queued',
    RUNNING: 'Running',
    ACCEPTED: 'Accepted',
    WRONG_ANSWER: 'Wrong Answer',
    COMPILATION_ERROR: 'Compilation Error',
    RUNTIME_ERROR: 'Runtime Error',
    TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
    MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
    SYSTEM_ERROR: 'System Error',
}

export function statusLabel(status) {
    return LABELS[status] ?? status
}

/** 'good' | 'pending' | 'bad', used for colors */
export function statusTone(status) {
    if (status === 'ACCEPTED') return 'good'
    if (ACTIVE_STATUSES.has(status)) return 'pending'
    return 'bad'
}

function toCase(c, sample) {
    return {
        index: c.index,
        status: c.status,
        sample,
        timeMs: c.timeMs,
        input: c.input,
        expectedOutput: c.expectedOutput,
        actualOutput: c.actualOutput,
        errorOutput: c.errorOutput,
    }
}

/** POST /api/problems/{slug}/run response -> view model */
export function fromRun(run) {
    return {
        kind: 'run',
        status: run.status,
        message: run.message,
        passed: run.passed,
        total: run.total,
        timeMs: null,
        cases: run.cases.map((c) => toCase(c, true)),
    }
}

/** GET /api/submissions/{id} response -> view model */
export function fromSubmission(s) {
    return {
        kind: 'submission',
        id: s.id,
        status: s.status,
        message: s.message,
        passed: s.passedCount,
        total: s.totalCount,
        timeMs: s.executionTimeMs,
        cases: s.cases.map((c) => toCase(c, c.sample)),
    }
}