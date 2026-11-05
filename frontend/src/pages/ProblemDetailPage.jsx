import Editor from '@monaco-editor/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { describeError } from '../api/errors'
import { problemsApi } from '../api/problems'
import { fromRun, fromSubmission, statusLabel } from '../api/results'
import { submissionsApi, waitForSubmission } from '../api/submissions'
import { DifficultyBadge } from '../components/DifficultyBadge'
import { ResultPanel } from '../components/ResultPanel'
import { usePrefersDark } from '../hooks/usePrefersDark'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { STARTER_CODE } from '../lib/starterCode'

function actionMessage(err) {
    if (err instanceof ApiError && err.fieldErrors.sourceCode) {
        return `Code ${err.fieldErrors.sourceCode}`
    }
    return describeError(err)
}

function ProblemWorkspace({ slug }) {
    const dark = usePrefersDark()

    const [loaded, setLoaded] = useState({ problem: null, samples: null, error: null })
    const [code, setCode] = useState(() => loadDraft(slug) ?? STARTER_CODE)
    const [busy, setBusy] = useState(null) // null | 'run' | 'submit'
    const [liveStatus, setLiveStatus] = useState(null)
    const [result, setResult] = useState(null)
    const [actionError, setActionError] = useState(null)
    const pollAbort = useRef(null)

    useEffect(() => {
        let cancelled = false
        Promise.all([problemsApi.get(slug), problemsApi.samples(slug)])
            .then(([problem, samples]) => {
                if (!cancelled) setLoaded({ problem, samples, error: null })
            })
            .catch((err) => {
                if (!cancelled) setLoaded({ problem: null, samples: null, error: err })
            })
        return () => {
            cancelled = true
        }
    }, [slug])

    // Leaving the page stops any polling that is still running
    useEffect(() => () => pollAbort.current?.abort(), [])

    function handleCodeChange(value) {
        const next = value ?? ''
        setCode(next)
        saveDraft(slug, next)
    }

    function handleReset() {
        if (!window.confirm('Replace your code with the starter template?')) {
            return
        }
        setCode(STARTER_CODE)
        clearDraft(slug)
    }

    async function handleRun() {
        if (!code.trim()) {
            setActionError('Write some code first.')
            return
        }
        setBusy('run')
        setActionError(null)
        setResult(null)
        try {
            setResult(fromRun(await problemsApi.run(slug, code)))
        } catch (err) {
            setActionError(actionMessage(err))
        } finally {
            setBusy(null)
        }
    }

    async function handleSubmit() {
        if (!code.trim()) {
            setActionError('Write some code first.')
            return
        }
        const controller = new AbortController()
        pollAbort.current = controller

        setBusy('submit')
        setActionError(null)
        setResult(null)
        setLiveStatus('QUEUED')
        try {
            const created = await submissionsApi.submit(slug, code)
            setLiveStatus(created.status)
            const final = await waitForSubmission(created.id, {
                signal: controller.signal,
                onUpdate: (s) => setLiveStatus(s.status),
            })
            setResult(fromSubmission(final))
        } catch (err) {
            if (err?.name === 'AbortError') {
                return
            }
            setActionError(actionMessage(err))
        } finally {
            if (pollAbort.current === controller) {
                setBusy(null)
            }
        }
    }

    if (loaded.error) {
        const notFound = loaded.error instanceof ApiError && loaded.error.status === 404
        return (
            <div className="narrow">
                <p className="error">{notFound ? 'Problem not found.' : describeError(loaded.error)}</p>
                <Link to="/problems">Back to problems</Link>
            </div>
        )
    }
    if (!loaded.problem) {
        return <p className="muted">Loading…</p>
    }

    const { problem, samples } = loaded

    return (
        <div className="split">
            <section className="panel">
                <p className="muted">
                    <Link to="/problems">← All problems</Link> ·{' '}
                    <Link to={`/submissions?problem=${slug}`}>My submissions</Link> ·{' '}
                    <Link to={`/problems/${slug}/workspace`}>Dry-run workspace</Link>
                </p>
                <h1>{problem.title}</h1>
                <DifficultyBadge value={problem.difficulty} />
                {/* Rendered as plain text: React escapes it, so descriptions can never inject HTML */}
                <div className="statement-text">{problem.description}</div>

                <h2>Examples</h2>
                {samples.length === 0 && <p className="muted">No examples yet.</p>}
                {samples.map((s, i) => (
                    <div className="case" key={i}>
                        <strong>Example {i + 1}</strong>
                        <div className="block">
                            <span className="block-label">Input</span>
                            <pre className="output">{s.input === '' ? '(empty)' : s.input}</pre>
                        </div>
                        <div className="block">
                            <span className="block-label">Output</span>
                            <pre className="output">{s.expectedOutput === '' ? '(empty)' : s.expectedOutput}</pre>
                        </div>
                    </div>
                ))}
            </section>

            <section className="panel">
                <p className="hint">
                    Your class must be named <code>Solution</code> and read from standard input.
                </p>
                <div className="editor-box">
                    <Editor
                        height="420px"
                        language="java"
                        theme={dark ? 'vs-dark' : 'light'}
                        value={code}
                        onChange={handleCodeChange}
                        loading={<p className="muted center-note">Loading editor…</p>}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            tabSize: 4,
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                        }}
                    />
                </div>

                <div className="actions">
                    <button className="secondary" onClick={handleRun} disabled={busy !== null}>
                        {busy === 'run' ? 'Running…' : 'Run samples'}
                    </button>
                    <button onClick={handleSubmit} disabled={busy !== null}>
                        {busy === 'submit' ? 'Submitting…' : 'Submit'}
                    </button>
                    <button className="link-button" onClick={handleReset} disabled={busy !== null}>
                        Reset code
                    </button>
                    {busy === 'submit' && liveStatus && (
                        <span className="muted">
              <span className="spinner" />
                            {statusLabel(liveStatus)}…
            </span>
                    )}
                </div>

                {actionError && <p className="error">{actionError}</p>}
                {result && <ResultPanel result={result} />}
            </section>
        </div>
    )
}

export function ProblemDetailPage() {
    const { slug } = useParams()
    // key={slug}: moving to another problem remounts the workspace, which resets all its state
    return <ProblemWorkspace key={slug} slug={slug} />
}