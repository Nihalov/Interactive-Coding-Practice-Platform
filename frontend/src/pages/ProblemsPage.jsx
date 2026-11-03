import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { describeError } from '../api/errors'
import { problemsApi } from '../api/problems'
import { progressApi } from '../api/progress'
import { DifficultyBadge } from '../components/DifficultyBadge'
import { Pagination } from '../components/Pagination'

const PAGE_SIZE = 10
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']

export function ProblemsPage() {
    const [params, setParams] = useSearchParams()

    // The URL is the single source of truth for the filter and the page
    const rawDifficulty = params.get('difficulty')
    const difficulty = DIFFICULTIES.includes(rawDifficulty) ? rawDifficulty : ''
    const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
    const requestKey = `${difficulty}:${page}`

    // Each response is tagged with the request it answers, so stale responses are ignored
    const [state, setState] = useState({ key: null, data: null, error: null })
    const [progress, setProgress] = useState(null)

    useEffect(() => {
        let cancelled = false
        problemsApi
            .list({ difficulty, page, size: PAGE_SIZE })
            .then((data) => {
                if (!cancelled) setState({ key: requestKey, data, error: null })
            })
            .catch((err) => {
                if (!cancelled) setState({ key: requestKey, data: null, error: describeError(err) })
            })
        return () => {
            cancelled = true
        }
    }, [difficulty, page, requestKey])

    useEffect(() => {
        let cancelled = false
        progressApi
            .list()
            .then((map) => {
                if (!cancelled) setProgress(map)
            })
            .catch(() => {
                // progress marks are a bonus: the list works without them
            })
        return () => {
            cancelled = true
        }
    }, [])

    function selectDifficulty(value) {
        const next = new URLSearchParams()
        if (value) {
            next.set('difficulty', value)
        }
        setParams(next)
    }

    function goToPage(target) {
        const next = new URLSearchParams(params)
        next.set('page', String(target))
        setParams(next)
    }

    const loading = state.key !== requestKey

    return (
        <div className="narrow">
            <h1>Problems</h1>

            <div className="filter-bar">
                {['', ...DIFFICULTIES].map((value) => (
                    <button
                        key={value || 'all'}
                        className={difficulty === value ? 'active' : ''}
                        onClick={() => selectDifficulty(value)}
                    >
                        {value === '' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {loading && <p className="muted">Loading…</p>}
            {!loading && state.error && <p className="error">{state.error}</p>}

            {!loading && state.data && state.data.content.length === 0 && (
                <p className="muted">
                    No problems here. {page > 0 && <button className="link-button" onClick={() => goToPage(0)}>Back to page 1</button>}
                </p>
            )}

            {!loading && state.data && state.data.content.length > 0 && (
                <>
                    <table className="table">
                        <thead>
                        <tr>
                            <th className="status-cell" aria-label="Status" />
                            <th>Title</th>
                            <th>Difficulty</th>
                        </tr>
                        </thead>
                        <tbody>
                        {state.data.content.map((p) => {
                            const entry = progress?.get(p.slug)
                            return (
                                <tr key={p.id}>
                                    <td className="status-cell">
                                        {entry?.solved && (
                                            <span className="solved" title="Solved" aria-label="Solved">
                          ✓
                        </span>
                                        )}
                                        {entry && !entry.solved && (
                                            <span className="attempted" title="Attempted" aria-label="Attempted">
                          ●
                        </span>
                                        )}
                                    </td>
                                    <td>
                                        <Link to={`/problems/${p.slug}`}>{p.title}</Link>
                                    </td>
                                    <td>
                                        <DifficultyBadge value={p.difficulty} />
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                    <Pagination page={state.data.page} totalPages={state.data.totalPages} onChange={goToPage} />
                </>
            )}
        </div>
    )
}