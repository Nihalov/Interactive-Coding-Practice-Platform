import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { describeError } from '../api/errors'
import { ACTIVE_STATUSES } from '../api/results'
import { submissionsApi } from '../api/submissions'
import { Pagination } from '../components/Pagination'
import { StatusChip } from '../components/StatusChip'
import { formatDateTime, formatDuration } from '../lib/format'
import { Icon } from '../components/admin/Icon'
import { EmptyState, ErrorState, LoadingState, PageHeading } from '../components/practice/PracticeUI'

const PAGE_SIZE = 15

export function SubmissionsPage() {
    const [params, setParams] = useSearchParams()
    const problem = params.get('problem') ?? ''
    const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
    const [refresh, setRefresh] = useState(0)
    const requestKey = `${problem}:${page}:${refresh}`
    const [state, setState] = useState({ key: null, data: null, error: null })

    useEffect(() => {
        let cancelled = false
        submissionsApi.history({ problem, page, size: PAGE_SIZE })
            .then((data) => { if (!cancelled) setState({ key: requestKey, data, error: null }) })
            .catch((err) => { if (!cancelled) setState({ key: requestKey, data: null, error: describeError(err) }) })
        return () => { cancelled = true }
    }, [problem, page, requestKey])

    function goToPage(target) {
        const next = new URLSearchParams(params)
        next.set('page', String(target))
        setParams(next)
    }
    const loading = state.key !== requestKey
    return (
        <div className="practice-page">
            <PageHeading eyebrow="Every attempt counts" title="My submissions" description="Review your results, learn from a missed case, and come back stronger.">
                <Link className="button-link" to="/problems"><Icon name="code" size={16} />Keep practicing</Link>
            </PageHeading>
            <section className="practice-panel submission-library">
                <div className="practice-section-heading"><div><h2>Submission history</h2><p>Your solutions, newest first.</p></div><button className="secondary" disabled={loading} onClick={() => setRefresh((n) => n + 1)}><Icon name="refresh" size={15} />Refresh</button></div>
                {problem && <div className="submission-filter"><span>Problem: <code>{problem}</code></span><button className="link-button" onClick={() => setParams(new URLSearchParams())}>Show all<Icon name="close" size={14} /></button></div>}
                {loading ? <LoadingState label="Loading submissions…" /> : state.error ? <ErrorState message={state.error} onRetry={() => setRefresh((n) => n + 1)} /> : state.data.content.length === 0 ? (
                    <EmptyState icon="terminal" title={page ? 'No submissions on this page' : 'Your next attempt starts here'} description={page ? 'Return to the first page to see your saved submissions.' : 'Run a few sample tests, then submit your solution. Your results and code will be saved here.'} to={!page ? problem ? `/problems/${problem}` : '/problems' : undefined} action={problem ? 'Open problem' : 'Explore problems'}>
                        {page > 0 && <button className="secondary" onClick={() => goToPage(0)}>Back to page 1</button>}
                    </EmptyState>
                ) : (
                    <>
                        <div className="practice-table-scroll"><table className="table practice-table submissions-table">
                            <caption className="sr-only">Your saved submissions and judging results</caption>
                            <thead><tr><th scope="col">Problem</th><th scope="col">Result</th><th scope="col">Tests passed</th><th scope="col">Runtime</th><th scope="col">Submitted</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead>
                            <tbody>{state.data.content.map((s) => (
                                <tr key={s.id}>
                                    <td><Link className="practice-problem-title" to={`/problems/${s.problemSlug}`}>{s.problemTitle}</Link><span className="submission-number">Submission #{s.id}</span></td>
                                    <td data-label="Result"><StatusChip status={s.status} /></td>
                                    <td data-label="Tests passed"><span className={s.status === 'ACCEPTED' ? 'solved' : ''}>{ACTIVE_STATUSES.has(s.status) ? '—' : `${s.passedCount} / ${s.totalCount}`}</span></td>
                                    <td data-label="Runtime">{formatDuration(s.executionTimeMs)}</td>
                                    <td data-label="Submitted"><span className="submission-date">{formatDateTime(s.submittedAt)}</span></td>
                                    <td><Link className="practice-row-action" to={`/submissions/${s.id}`}>Details<Icon name="arrow" size={15} /><span className="sr-only"> for submission {s.id}</span></Link></td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                        <div className="practice-pagination"><p>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, state.data.totalElements)} of {state.data.totalElements} submissions</p><Pagination page={state.data.page} totalPages={state.data.totalPages} onChange={goToPage} /></div>
                    </>
                )}
            </section>
        </div>
    )
}
