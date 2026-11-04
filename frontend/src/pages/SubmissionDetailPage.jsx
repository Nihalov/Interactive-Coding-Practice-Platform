import Editor from '@monaco-editor/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { describeError } from '../api/errors'
import { ACTIVE_STATUSES, fromSubmission, statusLabel } from '../api/results'
import { submissionsApi, waitForSubmission } from '../api/submissions'
import { ResultPanel } from '../components/ResultPanel'
import { usePrefersDark } from '../hooks/usePrefersDark'
import { saveDraft } from '../lib/draft'
import { formatDateTime } from '../lib/format'

function SubmissionView({ id }) {
    const dark = usePrefersDark()
    const navigate = useNavigate()
    const [state, setState] = useState({ submission: null, error: null })

    useEffect(() => {
        const controller = new AbortController()

        submissionsApi
            .get(id)
            .then(async (first) => {
                setState({ submission: first, error: null })
                // Still being judged: keep refreshing until it is final
                if (ACTIVE_STATUSES.has(first.status)) {
                    const final = await waitForSubmission(id, {
                        signal: controller.signal,
                        onUpdate: (update) => setState({ submission: update, error: null }),
                    })
                    setState({ submission: final, error: null })
                }
            })
            .catch((err) => {
                if (err?.name !== 'AbortError') {
                    setState({ submission: null, error: err })
                }
            })

        return () => controller.abort()
    }, [id])

    if (state.error) {
        const notFound = state.error instanceof ApiError && state.error.status === 404
        return (
            <div className="narrow">
                <p className="error">{notFound ? 'Submission not found.' : describeError(state.error)}</p>
                <Link to="/submissions">Back to submissions</Link>
            </div>
        )
    }
    if (!state.submission) {
        return <p className="muted">Loading…</p>
    }

    const { submission } = state

    function handleReuse() {
        // The problem page loads a saved draft when it opens
        saveDraft(submission.problemSlug, submission.sourceCode)
        navigate(`/problems/${submission.problemSlug}`)
    }

    return (
        <div className="narrow">
            <p className="muted">
                <Link to="/submissions">← All submissions</Link>
            </p>
            <h1>
                <Link to={`/problems/${submission.problemSlug}`}>{submission.problemTitle}</Link>
            </h1>
            <p className="muted">
                Submission #{submission.id} · {formatDateTime(submission.submittedAt)}
            </p>

            {ACTIVE_STATUSES.has(submission.status) && (
                <p className="muted">
                    <span className="spinner" />
                    {statusLabel(submission.status)}…
                </p>
            )}

            <ResultPanel result={fromSubmission(submission)} />

            <h2>Your code</h2>
            <div className="editor-box">
                <Editor
                    height="360px"
                    language="java"
                    theme={dark ? 'vs-dark' : 'light'}
                    value={submission.sourceCode}
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                    }}
                />
            </div>
            <div className="actions">
                <button className="secondary" onClick={handleReuse}>
                    Use this code in the editor
                </button>
            </div>
        </div>
    )
}

export function SubmissionDetailPage() {
    const { id } = useParams()

    if (!/^\d+$/.test(id)) {
        return (
            <div className="narrow">
                <p className="error">Submission not found.</p>
                <Link to="/submissions">Back to submissions</Link>
            </div>
        )
    }
    // key={id}: moving between submissions remounts the view with fresh state
    return <SubmissionView key={id} id={id} />
}