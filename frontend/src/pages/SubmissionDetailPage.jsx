import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { describeError } from '../api/errors'
import { ACTIVE_STATUSES, fromSubmission, statusLabel } from '../api/results'
import { submissionsApi, waitForSubmission } from '../api/submissions'
import { ResultPanel } from '../components/ResultPanel'
import { usePrefersDark } from '../hooks/usePrefersDark'
import { loadDraft, saveDraft } from '../lib/draft'
import { formatDateTime } from '../lib/format'
import { CodeEditor } from '../components/practice/CodeEditor'
import { Icon } from '../components/admin/Icon'
import { ConfirmDialog } from '../components/admin/ConfirmDialog'
import { LoadingState } from '../components/practice/PracticeUI'

function SubmissionView({ id }) {
    const dark = usePrefersDark()
    const navigate = useNavigate()
    const [state, setState] = useState({ submission: null, error: null })
    const [replaceDraft, setReplaceDraft] = useState(false)
    const [reuseError, setReuseError] = useState(null)

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
            <div className="practice-page">
                <p className="error">{notFound ? 'Submission not found.' : describeError(state.error)}</p>
                <Link to="/submissions">Back to submissions</Link>
            </div>
        )
    }
    if (!state.submission) {
        return <LoadingState label="Loading submission…" />
    }

    const { submission } = state

    function handleReuse() {
        const existing = loadDraft(submission.problemSlug)
        if (existing !== null && existing !== submission.sourceCode) setReplaceDraft(true)
        else reuse()
    }
    function reuse() {
        if (saveDraft(submission.problemSlug, submission.sourceCode)) navigate(`/problems/${submission.problemSlug}`)
        else { setReuseError('Your browser could not save this draft. Copy the code to keep it.'); setReplaceDraft(false) }
    }

    return (
        <div className="practice-page submission-detail">
            <nav className="practice-breadcrumb" aria-label="Breadcrumb"><Link to="/submissions">My submissions</Link><span>/</span><span>#{submission.id}</span></nav>
            <header className="practice-heading"><div><p className="practice-eyebrow">Submission #{submission.id}</p><h1><Link to={`/problems/${submission.problemSlug}`}>{submission.problemTitle}</Link></h1><p className="muted">{formatDateTime(submission.submittedAt)} · Java</p></div><button className="secondary" onClick={handleReuse}><Icon name="edit" size={16} />Use this code in the editor</button></header>

            {ACTIVE_STATUSES.has(submission.status) && (
                <p className="muted">
                    <span className="spinner" />
                    {statusLabel(submission.status)}…
                </p>
            )}

            <div className="practice-panel"><ResultPanel result={fromSubmission(submission)} /></div>

            <section className="practice-panel submitted-code"><div className="study-panel-heading"><span><Icon name="code" size={17} />Submitted code</span><span className="language-pill">Java · Read only</span></div>
                <CodeEditor
                    height="360px"
                    dark={dark}
                    value={submission.sourceCode}
                    readOnly
                />
            </section>
            {reuseError && <p className="practice-error" role="alert">{reuseError}</p>}
            {replaceDraft && <ConfirmDialog title="Replace your current draft?" confirmLabel="Use submitted code" cancelLabel="Keep my draft" onCancel={() => setReplaceDraft(false)} onConfirm={reuse}><p>You already have a different draft for this problem on this device. Using this submission replaces that draft.</p></ConfirmDialog>}
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
