import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { problemsApi } from '../api/problems'
import { FormError } from '../components/admin/FormError'
import { DifficultyBadge } from '../components/DifficultyBadge'
import { Pagination } from '../components/Pagination'
import { Icon } from '../components/admin/Icon'

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']
const SORT_OPTIONS = [{ value: 'id,desc', label: 'Newest first' }, { value: 'id,asc', label: 'Oldest first' }, { value: 'title,asc', label: 'Title: A–Z' }, { value: 'title,desc', label: 'Title: Z–A' }]

export function AdminDashboardPage() {
    const [params, setParams] = useSearchParams()
    const [refresh, setRefresh] = useState(0)
    const [loaded, setLoaded] = useState({ key: null, data: null, error: null })
    const [counts, setCounts] = useState({ key: null, values: null, error: null })
    const difficulty = DIFFICULTIES.includes(params.get('difficulty')) ? params.get('difficulty') : ''
    const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
    const sort = SORT_OPTIONS.some((item) => item.value === params.get('sort')) ? params.get('sort') : 'id,desc'
    const size = [10, 25, 50].includes(Number(params.get('size'))) ? Number(params.get('size')) : 10
    const requestKey = `${difficulty}:${page}:${size}:${sort}:${refresh}`

    useEffect(() => {
        let cancelled = false
        problemsApi.list({ difficulty, page, size, sort })
            .then((data) => { if (!cancelled) setLoaded({ key: requestKey, data, error: null }) })
            .catch((error) => { if (!cancelled) setLoaded({ key: requestKey, data: null, error }) })
        return () => { cancelled = true }
    }, [difficulty, page, size, sort, requestKey])

    useEffect(() => {
        let cancelled = false
        // Use real catalog totals; these counts are not limited to the visible page.
        Promise.all(DIFFICULTIES.map((difficulty) => problemsApi.list({ difficulty, page: 0, size: 1 })))
            .then((pages) => {
                if (!cancelled) setCounts({ key: refresh, values: pages.map((p) => p.totalElements), error: null })
            })
            .catch((error) => { if (!cancelled) setCounts({ key: refresh, values: null, error }) })
        return () => { cancelled = true }
    }, [refresh])

    function filter(value) {
        const next = new URLSearchParams(params)
        next.delete('page')
        if (value) next.set('difficulty', value)
        else next.delete('difficulty')
        setParams(next)
    }

    function option(name, value) {
        const next = new URLSearchParams(params)
        next.set(name, value)
        next.delete('page')
        setParams(next)
    }

    function changePage(nextPage) {
        const next = new URLSearchParams(params)
        next.set('page', String(nextPage))
        setParams(next)
    }

    const loading = loaded.key !== requestKey
    const values = counts.key === refresh ? counts.values : null
    const total = values ? values.reduce((sum, value) => sum + value, 0) : '—'

    return (
        <div className="admin-page">
            <div className="admin-heading admin-page-heading">
                <div>
                    <p className="admin-eyebrow">Content / Overview</p>
                    <h1>Admin dashboard</h1>
                    <p className="muted">A home for great problems. Build, refine, and keep your library growing.</p>
                </div>
                <Link className="button-link" to="/admin/problems/new"><Icon name="plus" />Create problem</Link>
            </div>

            <div className="cards admin-stats" aria-label="Problem catalog statistics">
                <button className={`card catalog-stat ${!difficulty ? 'selected' : ''}`} onClick={() => filter('')} aria-label="Show all problems" aria-pressed={!difficulty}>
                    <span className="stat-top"><span className="card-label">Total problems</span><span className="stat-icon"><Icon name="layers" /></span></span>
                    <span className="card-value">{total}</span><span className="stat-caption">Across your library <Icon name="arrow" size={14} /></span>
                </button>
                {DIFFICULTIES.map((value, index) => (
                    <button className={`card catalog-stat ${value.toLowerCase()} ${difficulty === value ? 'selected' : ''}`} key={value} onClick={() => filter(value)} aria-label={`Show ${value.toLowerCase()} problems`} aria-pressed={difficulty === value}>
                        <span className="stat-top"><DifficultyBadge value={value} /><span className="stat-dot" /></span>
                        <span className="card-value">{values?.[index] ?? '—'}</span>
                        <span className="stat-caption">{values ? `${total ? Math.round(values[index] / total * 100) : 0}% of library` : 'Loading…'}<Icon name="arrow" size={14} /></span>
                        <span className="stat-meter" aria-hidden="true"><span style={{ width: values && total ? `${values[index] / total * 100}%` : '0%' }} /></span>
                    </button>
                ))}
            </div>
            {counts.key === refresh && counts.error && <FormError error={counts.error} />}

            <section className="panel admin-section" aria-labelledby="catalog-heading">
                <div className="admin-heading">
                    <div><h2 id="catalog-heading">Problem library</h2><p className="muted">Everything your learners will practice, all in one place.</p></div>
                    <button className="secondary compact-button" onClick={() => setRefresh((n) => n + 1)} disabled={loading}><Icon name="refresh" size={16} />Refresh catalog</button>
                </div>
                <div className="catalog-toolbar">
                <div className="filter-bar admin-filters" role="group" aria-label="Filter problems by difficulty">
                    {['', ...DIFFICULTIES].map((value) => (
                        <button key={value || 'all'} className={value === difficulty ? 'active' : ''}
                            aria-label={value ? value.charAt(0) + value.slice(1).toLowerCase() : 'All'} aria-pressed={value === difficulty} onClick={() => filter(value)}>
                            {value ? value.charAt(0) + value.slice(1).toLowerCase() : 'All'}
                            <span className="filter-count">{value ? values?.[DIFFICULTIES.indexOf(value)] ?? '—' : total}</span>
                        </button>
                    ))}
                </div>
                <label className="catalog-sort">Sort by
                    <select aria-label="Sort problems" value={sort} onChange={(e) => option('sort', e.target.value)}>
                        {SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
                </div>
                {loading ? <div role="status"><span className="sr-only">Loading problems…</span><div className="catalog-skeleton" aria-hidden="true">{[0, 1, 2, 3, 4].map((id) => <div key={id}><span /><span /><span /></div>)}</div></div> : loaded.error ? (
                    <><FormError error={loaded.error} /><button className="secondary" onClick={() => setRefresh((n) => n + 1)}>Retry problems</button></>
                ) : loaded.data.content.length === 0 ? (
                    <div className="admin-empty">
                        <div className="empty-icon"><Icon name="book" size={30} /></div>
                        <h3>{page > 0 ? 'No problems on this page' : difficulty ? 'No problems at this difficulty' : 'Your catalog is empty'}</h3>
                        <p className="muted">{page > 0 ? 'Return to the first page to see available problems.' : 'Create a problem, write its statement, and add test cases to get started.'}</p>
                        {page > 0 ? <button className="secondary" onClick={() => changePage(0)}>Back to page 1</button>
                            : difficulty ? <button className="secondary" onClick={() => filter('')}>Clear filter</button>
                            : <Link className="button-link" to="/admin/problems/new"><Icon name="plus" />Create a problem</Link>}
                    </div>
                ) : (
                    <>
                        <div className="admin-table-scroll">
                            <table className="table admin-catalog">
                                <caption className="sr-only">Problems available for administration</caption>
                                <thead><tr><th scope="col">Problem</th><th scope="col">Difficulty</th><th scope="col">Actions</th></tr></thead>
                                <tbody>{loaded.data.content.map((problem) => (
                                    <tr key={problem.id}>
                                        <td><div className="catalog-problem-cell"><span className="problem-glyph"><Icon name="book" /></span><div><Link className="admin-problem-title" to={`/admin/problems/${problem.slug}/edit`}>{problem.title}</Link><span className="admin-slug">/{problem.slug}</span></div></div></td>
                                        <td><span className={`difficulty-pill ${problem.difficulty.toLowerCase()}`}><span /><DifficultyBadge value={problem.difficulty} /></span></td>
                                        <td><div className="admin-actions">
                                            <Link className="manage-link" to={`/admin/problems/${problem.slug}/edit`}>Manage<Icon name="arrow" size={15} /></Link>
                                            <Link className="icon-link" to={`/problems/${problem.slug}`} aria-label={`View ${problem.title}`} title="View problem"><Icon name="external" size={16} /></Link>
                                        </div></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <div className="catalog-footer">
                            <p>Showing {page * size + 1}–{Math.min((page + 1) * size, loaded.data.totalElements)} of {loaded.data.totalElements}</p>
                            <label className="catalog-page-size">Rows per page<select aria-label="Rows per page" value={size} onChange={(e) => option('size', e.target.value)}>{[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
                            <Pagination page={loaded.data.page} totalPages={loaded.data.totalPages} onChange={changePage} />
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}
