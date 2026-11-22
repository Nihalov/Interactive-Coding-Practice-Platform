import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { describeError } from '../api/errors'
import { problemsApi } from '../api/problems'
import { progressApi } from '../api/progress'
import { Pagination } from '../components/Pagination'
import { Icon } from '../components/admin/Icon'
import { DifficultyTag, EmptyState, ErrorState, LoadingState, PageHeading } from '../components/practice/PracticeUI'

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']
const SORTS = [['id,asc', 'Original order'], ['id,desc', 'Newest first'], ['title,asc', 'Title: A–Z'], ['title,desc', 'Title: Z–A']]

export function ProblemsPage() {
    const [params, setParams] = useSearchParams()
    const difficulty = DIFFICULTIES.includes(params.get('difficulty')) ? params.get('difficulty') : ''
    const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
    const size = [10, 25, 50].includes(Number(params.get('size'))) ? Number(params.get('size')) : 10
    const sort = SORTS.some(([value]) => value === params.get('sort')) ? params.get('sort') : 'id,asc'
    const [refresh, setRefresh] = useState(0)
    const requestKey = `${difficulty}:${page}:${size}:${sort}:${refresh}`
    const [state, setState] = useState({ key: null, data: null, error: null })
    const [progress, setProgress] = useState({ map: null, error: false })
    const [progressRefresh, setProgressRefresh] = useState(0)

    useEffect(() => {
        let cancelled = false
        problemsApi.list({ difficulty, page, size, sort })
            .then((data) => { if (!cancelled) setState({ key: requestKey, data, error: null }) })
            .catch((err) => { if (!cancelled) setState({ key: requestKey, data: null, error: describeError(err) }) })
        return () => { cancelled = true }
    }, [difficulty, page, size, sort, requestKey])
    useEffect(() => {
        let cancelled = false
        progressApi.list()
            .then((map) => { if (!cancelled) setProgress({ map, error: false }) })
            .catch(() => { if (!cancelled) setProgress({ map: null, error: true }) })
        return () => { cancelled = true }
    }, [progressRefresh])

    function option(name, value) {
        const next = new URLSearchParams(params)
        if (value) next.set(name, value)
        else next.delete(name)
        if (name !== 'page') next.delete('page')
        setParams(next)
    }
    const loading = state.key !== requestKey

    return (
        <div className="practice-page">
            <PageHeading eyebrow="Build your problem-solving skills" title="Problem library" description="Find your next challenge. Start small, think it through, and keep going.">
                <Link className="button-link secondary" to="/submissions"><Icon name="activity" size={16} />My submissions</Link>
            </PageHeading>
            <div className="library-tip"><span className="library-tip-icon"><Icon name="layers" size={20} /></span><div><strong>Think before you type.</strong><span>Each problem includes a dry-run workspace for arrays, pointers, and notes.</span></div><Icon name="code" size={24} /></div>
            <section className="practice-panel library-panel" aria-label="Problem library">
                <div className="practice-toolbar">
                    <div className="practice-segments" role="group" aria-label="Filter problems by difficulty">{['', ...DIFFICULTIES].map((value) => (
                        <button key={value || 'all'} aria-pressed={difficulty === value} className={difficulty === value ? 'active' : ''} onClick={() => option('difficulty', value)}>{value ? value.charAt(0) + value.slice(1).toLowerCase() : 'All problems'}</button>
                    ))}</div>
                    <label className="practice-select">Sort by<select aria-label="Sort problems" value={sort} onChange={(e) => option('sort', e.target.value)}>{SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                </div>
                {progress.error && <div className="progress-unavailable">Progress markers are unavailable.<button className="link-button" onClick={() => setProgressRefresh((n) => n + 1)}>Retry progress</button></div>}
                {loading ? <LoadingState label="Loading problems…" /> : state.error ? <ErrorState message={state.error} onRetry={() => setRefresh((n) => n + 1)} /> : state.data.content.length === 0 ? (
                    <EmptyState title={page ? 'No problems on this page' : 'No problems here yet'} description={page ? 'Head back to the first page to see available problems.' : difficulty ? 'Try another difficulty to find a challenge.' : 'New challenges will appear here when they are added.'}>
                        {(page > 0 || difficulty) && <button className="secondary" onClick={() => option(page ? 'page' : 'difficulty', page ? '0' : '')}>{page ? 'Back to page 1' : 'Clear filter'}</button>}
                    </EmptyState>
                ) : (
                    <>
                        <div className="practice-table-scroll"><table className="table practice-table problem-library-table">
                            <caption className="sr-only">Problems and your solving progress</caption>
                            <thead><tr><th scope="col">Status</th><th scope="col">Problem</th><th scope="col">Difficulty</th><th scope="col"><span className="sr-only">Practice</span></th></tr></thead>
                            <tbody>{state.data.content.map((p) => {
                                const entry = progress.map?.get(p.slug)
                                const status = !progress.map ? 'unknown' : entry?.solved ? 'solved' : entry ? 'attempted' : 'new'
                                return <tr key={p.id}>
                                    <td data-label="Status"><span className={`practice-status ${status}`}>{status === 'solved' && <Icon name="check" size={14} />}{status === 'attempted' && <Icon name="clock" size={14} />}{status === 'solved' ? 'Solved' : status === 'attempted' ? 'In progress' : status === 'new' ? 'Not started' : '—'}</span></td>
                                    <td><div className="problem-library-name"><span className="library-problem-number">{p.id.toString().padStart(2, '0')}</span><div><Link className="practice-problem-title" to={`/problems/${p.slug}`}>{p.title}</Link>{entry && <span className="problem-attempts">{entry.attempts} {entry.attempts === 1 ? 'attempt' : 'attempts'}</span>}</div></div></td>
                                    <td data-label="Difficulty"><DifficultyTag value={p.difficulty} /></td>
                                    <td><Link className="practice-row-action" to={`/problems/${p.slug}`}>{entry?.solved ? 'Review' : entry ? 'Continue' : 'Solve'}<Icon name="arrow" size={15} /><span className="sr-only"> {p.title}</span></Link></td>
                                </tr>
                            })}</tbody>
                        </table></div>
                        <div className="practice-pagination"><p>Showing {page * size + 1}–{Math.min((page + 1) * size, state.data.totalElements)} of {state.data.totalElements} problems</p><label className="practice-select">Rows<select aria-label="Problems per page" value={size} onChange={(e) => option('size', e.target.value)}>{[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}</select></label><Pagination page={state.data.page} totalPages={state.data.totalPages} onChange={(n) => option('page', String(n))} /></div>
                    </>
                )}
            </section>
        </div>
    )
}
