import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { describeError } from '../api/errors'
import { progressApi } from '../api/progress'
import { useAuth } from '../auth/useAuth'
import { DifficultyBadge } from '../components/DifficultyBadge'
import { formatDateTime, formatDuration } from '../lib/format'

function StatCard({ label, value, note }) {
    return (
        <div className="card">
            <span className="card-label">{label}</span>
            <span className="card-value">{value}</span>
            {note && <span className="muted">{note}</span>}
        </div>
    )
}

function DifficultyRow({ row }) {
    const percent = row.total > 0 ? Math.round((row.solved / row.total) * 100) : 0
    return (
        <div className="bar-row">
            <DifficultyBadge value={row.difficulty} />
            <div
                className="bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={row.total}
                aria-valuenow={row.solved}
            >
                <div className={`bar-fill ${row.difficulty.toLowerCase()}`} style={{ width: `${percent}%` }} />
            </div>
            <span className="muted">
        {row.solved} / {row.total}
      </span>
        </div>
    )
}

export function DashboardPage() {
    const { user } = useAuth()
    const [state, setState] = useState({ stats: null, recent: null, error: null })

    useEffect(() => {
        let cancelled = false
        Promise.all([progressApi.stats(), progressApi.page({ page: 0, size: 10 })])
            .then(([stats, recent]) => {
                if (!cancelled) setState({ stats, recent: recent.content, error: null })
            })
            .catch((err) => {
                if (!cancelled) setState({ stats: null, recent: null, error: describeError(err) })
            })
        return () => {
            cancelled = true
        }
    }, [])

    if (state.error) return <p className="error">{state.error}</p>
    if (!state.stats) return <p className="muted">Loading…</p>

    const { stats, recent } = state
    const rate = stats.acceptanceRate === null ? '—' : `${stats.acceptanceRate}%`

    return (
        <div className="narrow">
            <h1>Welcome back, {user.username}</h1>

            <div className="cards">
                <StatCard label="Solved" value={`${stats.solvedCount} / ${stats.totalProblems}`} />
                <StatCard label="Acceptance rate" value={rate} note={`${stats.acceptedSubmissions} accepted`} />
                <StatCard label="Submissions judged" value={stats.judgedSubmissions} />
                <StatCard label="Problems attempted" value={stats.attemptedCount} />
            </div>

            <h2>By difficulty</h2>
            <div className="panel">
                {stats.byDifficulty.map((row) => (
                    <DifficultyRow key={row.difficulty} row={row} />
                ))}
            </div>

            <h2>Recent activity</h2>
            {recent.length === 0 ? (
                <p className="muted">
                    Nothing yet. <Link to="/problems">Pick a problem</Link> and submit your first solution.
                </p>
            ) : (
                <table className="table">
                    <thead>
                    <tr>
                        <th>Problem</th>
                        <th>Difficulty</th>
                        <th>Status</th>
                        <th>Attempts</th>
                        <th>Best time</th>
                        <th>Last attempt</th>
                    </tr>
                    </thead>
                    <tbody>
                    {recent.map((p) => (
                        <tr key={p.problemSlug}>
                            <td>
                                <Link to={`/problems/${p.problemSlug}`}>{p.problemTitle}</Link>
                            </td>
                            <td>
                                <DifficultyBadge value={p.difficulty} />
                            </td>
                            <td>
                                {p.solved ? (
                                    <span className="chip good">Solved</span>
                                ) : (
                                    <span className="chip pending">Attempted</span>
                                )}
                            </td>
                            <td>{p.attempts}</td>
                            <td>
                                {p.bestSubmissionId ? (
                                    <Link to={`/submissions/${p.bestSubmissionId}`}>{formatDuration(p.bestTimeMs)}</Link>
                                ) : (
                                    '—'
                                )}
                            </td>
                            <td>{formatDateTime(p.lastAttemptAt)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}