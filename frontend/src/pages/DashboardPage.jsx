import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { describeError } from '../api/errors'
import { progressApi } from '../api/progress'
import { useAuth } from '../auth/useAuth'
import { formatDateTime, formatDuration } from '../lib/format'
import { Icon } from '../components/admin/Icon'
import { DifficultyTag, EmptyState, ErrorState, LoadingState, PageHeading } from '../components/practice/PracticeUI'

export function DashboardPage() {
    const { user } = useAuth()
    const [refresh, setRefresh] = useState(0)
    const [state, setState] = useState({ key: null, stats: null, recent: [], error: null })
    useEffect(() => {
        let cancelled = false
        Promise.all([progressApi.stats(), progressApi.page({ page: 0, size: 5 })])
            .then(([stats, recent]) => { if (!cancelled) setState({ key: refresh, stats, recent: recent.content, error: null }) })
            .catch((error) => { if (!cancelled) setState({ key: refresh, stats: null, recent: [], error: describeError(error) }) })
        return () => { cancelled = true }
    }, [refresh])

    const stats = state.stats
    const next = state.recent.find((p) => !p.solved)
    const percent = stats?.totalProblems ? Math.min(100, Math.round(stats.solvedCount / stats.totalProblems * 100)) : 0

    return (
        <div className="practice-page dashboard-page">
            <PageHeading eyebrow="Your practice space" title={`Welcome back, ${user.username}`} description="A little practice, a little progress. Make the next problem yours.">
                <Link className="button-link" to="/problems"><Icon name="code" size={17} />Explore problems</Link>
            </PageHeading>
            {state.key !== refresh ? <LoadingState label="Loading your progress…" /> : state.error ? <ErrorState message={state.error} onRetry={() => setRefresh((n) => n + 1)} /> : (
                <>
                    <div className="learner-stats">
                        {[['check', 'Problems solved', stats.solvedCount, `of ${stats.totalProblems} in the library`], ['activity', 'Acceptance rate', stats.acceptanceRate === null ? '—' : `${stats.acceptanceRate}%`, `${stats.acceptedSubmissions} accepted submissions`], ['terminal', 'Submissions judged', stats.judgedSubmissions, 'Every attempt is a step forward'], ['book', 'Problems attempted', stats.attemptedCount, 'Keep working at your own pace']].map(([icon, label, value, note]) => (
                            <div className="learner-stat" key={label}><span className="learner-stat-icon"><Icon name={icon} size={18} /></span><span className="learner-stat-label">{label}</span><strong>{value}</strong><span className="learner-stat-note">{note}</span></div>
                        ))}
                    </div>
                    <div className="dashboard-columns">
                        <section className="practice-panel progress-overview">
                            <div className="practice-section-heading"><div><p className="practice-eyebrow">The bigger picture</p><h2>Your progress</h2></div><Icon name="trophy" size={20} /></div>
                            <div className="progress-ring" style={{ '--progress': `${percent}%` }} role="img" aria-label={`${stats.solvedCount} of ${stats.totalProblems} problems solved`}>
                                <div><strong>{stats.solvedCount}<span> / {stats.totalProblems}</span></strong><span>problems solved</span></div>
                            </div>
                            <div className="difficulty-progress">{stats.byDifficulty.map((row) => (
                                <div className="difficulty-progress-row" key={row.difficulty}>
                                    <div><DifficultyTag value={row.difficulty} /><span>{row.solved}<span className="muted"> / {row.total}</span></span></div>
                                    <div className={`difficulty-meter ${row.difficulty.toLowerCase()}`} role="progressbar" aria-label={`${row.difficulty.toLowerCase()} problems solved`} aria-valuemin={0} aria-valuemax={Math.max(1, row.total)} aria-valuenow={row.solved} aria-valuetext={`${row.solved} of ${row.total}`}><span style={{ width: `${row.total ? row.solved / row.total * 100 : 0}%` }} /></div>
                                </div>
                            ))}</div>
                        </section>
                        <div className="dashboard-main">
                            <section className="continue-card">
                                <span className="continue-icon"><Icon name={next ? 'play' : 'code'} size={22} /></span>
                                <div><p className="practice-eyebrow">{next ? 'Pick up where you left off' : 'Your next challenge'}</p><h2>{next ? next.problemTitle : 'One problem closer.'}</h2><p>{next ? next.attempts > 0 ? `${next.attempts} attempts so far. Try a different angle, or trace it in the workspace.` : 'You’ve started this problem. Pick up your approach in the editor or workspace.' : 'Choose a problem, sketch your approach, and turn your idea into working code.'}</p><Link className="button-link" to={next ? `/problems/${next.problemSlug}` : '/problems'}>{next ? 'Continue practicing' : 'Find a problem'}<Icon name="arrow" size={16} /></Link></div>
                            </section>
                            <section className="practice-panel">
                                <div className="practice-section-heading"><div><h2>Recent practice</h2><p>Your latest problem-solving activity.</p></div><Link className="text-action" to="/submissions">View submissions<Icon name="arrow" size={15} /></Link></div>
                                {state.recent.length === 0 ? <EmptyState icon="code" title="Your first solution starts here" description="Pick a problem and submit your first solution. Your progress will appear here." to="/problems" action="Browse problems" /> : (
                                    <div className="recent-practice-list">{state.recent.map((p) => (
                                        <article className="recent-practice-item" key={p.problemSlug}>
                                            <span className={`practice-status-icon ${p.solved ? 'solved' : 'attempted'}`}><Icon name={p.solved ? 'check' : 'clock'} size={17} /></span>
                                            <div className="recent-practice-info"><Link to={`/problems/${p.problemSlug}`}>{p.problemTitle}</Link><div><DifficultyTag value={p.difficulty} /><span>{p.attempts > 0 ? `${p.attempts} ${p.attempts === 1 ? 'attempt' : 'attempts'}` : 'Not submitted yet'}</span><span>{formatDateTime(p.lastAttemptAt)}</span></div></div>
                                            <div className="recent-practice-end"><span className={`practice-status ${p.solved ? 'solved' : 'attempted'}`}>{p.solved ? 'Solved' : 'In progress'}</span>{p.bestSubmissionId && <Link to={`/submissions/${p.bestSubmissionId}`}>{formatDuration(p.bestTimeMs)} best</Link>}</div>
                                        </article>
                                    ))}</div>
                                )}
                            </section>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
