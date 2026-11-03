import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { describeError } from '../api/errors'

export function ProblemsPage() {
    const [problems, setProblems] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false
        api('/api/problems?size=20')
            .then((page) => {
                if (!cancelled) setProblems(page.content)
            })
            .catch((err) => {
                if (!cancelled) setError(describeError(err))
            })
        return () => {
            cancelled = true
        }
    }, [])

    if (error) return <p className="error">{error}</p>
    if (problems === null) return <p className="muted">Loading…</p>
    if (problems.length === 0) return <p className="muted">No problems yet.</p>

    return (
        <>
            <h1>Problems</h1>
            <ul className="plain-list">
                {problems.map((p) => (
                    <li key={p.id}>
                        <span>{p.title}</span>
                        <span className={`difficulty ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                    </li>
                ))}
            </ul>
        </>
    )
}