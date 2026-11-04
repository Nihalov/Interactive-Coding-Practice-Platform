import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { describeError } from '../api/errors'
import { submissionsApi } from '../api/submissions'
import { Pagination } from '../components/Pagination'
import { StatusChip } from '../components/StatusChip'
import { formatDateTime, formatDuration } from '../lib/format'

const PAGE_SIZE = 15

export function SubmissionsPage() {
    const [params, setParams] = useSearchParams()

    // The URL is the source of truth, so a link like /submissions?problem=a-plus-b works
    const problem = params.get('problem') ?? ''
    const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
    const requestKey = `${problem}:${page}`

    const [state, setState] = useState({ key: null, data: null, error: null })

    useEffect(() => {
        let cancelled = false
        submissionsApi
            .history({ problem, page, size: PAGE_SIZE })
            .then((data) => {
                if (!cancelled) setState({ key: requestKey, data, error: null })
            })
            .catch((err) => {
                if (!cancelled) setState({ key: requestKey, data: null, error: describeError(err) })
            })
        return () => {
            cancelled = true
        }
    }, [problem, page, requestKey])

    function goToPage(target) {
        const next = new URLSearchParams(params)
        next.set('page', String(target))
        setParams(next)
    }

    const loading = state.key !== requestKey

    return (
        <div className="narrow">
            <h1>My submissions</h1>

            {problem && (
                <p className="muted">
                    Showing submissions for <code>{problem}</code> ·{' '}
                    <button className="link-button" onClick={() => setParams(new URLSearchParams())}>
                        Show all
                    </button>
                </p>
            )}

            {loading && <p className="muted">Loading…</p>}
            {!loading && state.error && <p className="error">{state.error}</p>}

            {!loading && state.data && state.data.content.length === 0 && (
                <p className="muted">
                    No submissions here yet. <Link to="/problems">Go solve something.</Link>
                </p>
            )}

            {!loading && state.data && state.data.content.length > 0 && (
                <>
                    <table className="table">
                        <thead>
                        <tr>
                            <th>When</th>
                            <th>Problem</th>
                            <th>Result</th>
                            <th>Tests</th>
                            <th>Time</th>
                            <th aria-label="Details" />
                        </tr>
                        </thead>
                        <tbody>
                        {state.data.content.map((s) => (
                            <tr key={s.id}>
                                <td>{formatDateTime(s.submittedAt)}</td>
                                <td>
                                    <Link to={`/problems/${s.problemSlug}`}>{s.problemTitle}</Link>
                                </td>
                                <td>
                                    <StatusChip status={s.status} />
                                </td>
                                <td>
                                    {s.passedCount} / {s.totalCount}
                                </td>
                                <td>{formatDuration(s.executionTimeMs)}</td>
                                <td>
                                    <Link to={`/submissions/${s.id}`}>#{s.id}</Link>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <Pagination page={state.data.page} totalPages={state.data.totalPages} onChange={goToPage} />
                </>
            )}
        </div>
    )
}