import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { describeError } from '../api/errors'
import { problemsApi } from '../api/problems'
import { fromRun, fromSubmission, statusLabel } from '../api/results'
import { submissionsApi, waitForSubmission } from '../api/submissions'
import { ResultPanel } from '../components/ResultPanel'
import { usePrefersDark } from '../hooks/usePrefersDark'
import { useDraftGuard } from '../hooks/useDraftGuard'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { STARTER_CODE } from '../lib/starterCode'
import { CodeEditor } from '../components/practice/CodeEditor'
import { Icon } from '../components/admin/Icon'
import { ConfirmDialog } from '../components/admin/ConfirmDialog'
import { DifficultyTag, ErrorState, LoadingState } from '../components/practice/PracticeUI'
import { ProblemStartNotice } from '../components/practice/ProblemStartNotice'

function actionMessage(err) {
    if (err instanceof ApiError && err.fieldErrors.sourceCode) return `Code ${err.fieldErrors.sourceCode}`
    return describeError(err)
}

function ProblemWorkspace({ slug }) {
    const dark = usePrefersDark()
    const [refresh, setRefresh] = useState(0)
    const [loaded, setLoaded] = useState({ key: null, problem: null, samples: [], error: null })
    const [initialDraft] = useState(() => loadDraft(slug))
    const [code, setCode] = useState(initialDraft ?? STARTER_CODE)
    const [draftState, setDraftState] = useState(initialDraft === null ? 'idle' : 'restored')
    const [busy, setBusy] = useState(null)
    const [liveStatus, setLiveStatus] = useState(null)
    const [submissionId, setSubmissionId] = useState(null)
    const [result, setResult] = useState(null)
    const [actionError, setActionError] = useState(null)
    const [resetting, setResetting] = useState(false)
    const [fontSize, setFontSize] = useState(14)
    const [focused, setFocused] = useState(false)
    const [mobileView, setMobileView] = useState('problem')
    const [copied, setCopied] = useState(null)
    const pollAbort = useRef(null)
    const resultRef = useRef(null)
    useDraftGuard(draftState === 'failed')

    useEffect(() => {
        let cancelled = false
        Promise.all([problemsApi.get(slug), problemsApi.samples(slug)])
            .then(([problem, samples]) => { if (!cancelled) setLoaded({ key: refresh, problem, samples, error: null }) })
            .catch((error) => { if (!cancelled) setLoaded({ key: refresh, problem: null, samples: [], error }) })
        return () => { cancelled = true }
    }, [slug, refresh])
    useEffect(() => () => pollAbort.current?.abort(), [])
    useEffect(() => {
        if (result || actionError) resultRef.current?.scrollIntoView({ block: 'nearest' })
    }, [result, actionError])

    function handleCodeChange(value) {
        const next = value ?? ''
        setCode(next)
        setCopied(null)
        setDraftState(saveDraft(slug, next) ? 'saved' : 'failed')
    }
    async function handleCopy() {
        try { await navigator.clipboard.writeText(code); setCopied('Copied') }
        catch { setCopied('Copy unavailable') }
    }
    function handleReset() {
        setCode(STARTER_CODE)
        setDraftState(clearDraft(slug) ? 'idle' : 'failed')
        setResetting(false)
        setCopied(null)
    }
    async function handleRun() {
        if (busy || !loaded.samples.length) return
        setMobileView('code')
        if (!code.trim()) { setActionError('Write some code first.'); return }
        setBusy('run'); setActionError(null); setResult(null); setSubmissionId(null)
        try { setResult(fromRun(await problemsApi.run(slug, code))) }
        catch (err) { setActionError(actionMessage(err)) }
        finally { setBusy(null) }
    }
    async function handleSubmit() {
        if (busy) return
        setMobileView('code')
        if (!code.trim()) { setActionError('Write some code first.'); return }
        const controller = new AbortController()
        pollAbort.current = controller
        setBusy('submit'); setActionError(null); setResult(null); setLiveStatus('QUEUED'); setSubmissionId(null)
        try {
            const created = await submissionsApi.submit(slug, code)
            setSubmissionId(created.id); setLiveStatus(created.status)
            const final = await waitForSubmission(created.id, { signal: controller.signal, onUpdate: (s) => setLiveStatus(s.status) })
            setResult(fromSubmission(final))
        } catch (err) {
            if (err?.name !== 'AbortError') setActionError(actionMessage(err))
        } finally {
            if (pollAbort.current === controller) setBusy(null)
        }
    }

    if (loaded.key !== refresh) return <LoadingState label="Preparing your coding workspace…" />
    if (loaded.error) return <div className="practice-page"><Link className="text-action" to="/problems">← Problem library</Link><ErrorState message={loaded.error instanceof ApiError && loaded.error.status === 404 ? 'Problem not found.' : describeError(loaded.error)} onRetry={() => setRefresh((n) => n + 1)} /></div>
    const { problem, samples } = loaded

    return (
        <div className={`coding-page ${focused ? 'coding-focus' : ''}`}>
            <nav className="practice-breadcrumb" aria-label="Breadcrumb"><Link to="/problems">Problem library</Link><span>/</span><span>{problem.title}</span></nav>
            <ProblemStartNotice slug={slug} />
            <header className="coding-heading"><div><h1>{problem.title}</h1><DifficultyTag value={problem.difficulty} /></div><div className="coding-links"><Link to={`/submissions?problem=${slug}`}><Icon name="activity" size={16} />My submissions</Link><Link to={`/problems/${slug}/workspace`}><Icon name="layers" size={16} />Dry-run workspace</Link></div></header>
            <div className="mobile-study-tabs" role="group" aria-label="Coding workspace view"><button aria-pressed={mobileView === 'problem'} onClick={() => setMobileView('problem')}>Problem</button><button aria-pressed={mobileView === 'code'} onClick={() => setMobileView('code')}>Code & results</button></div>
            <div className="coding-grid">
                <section className={`practice-panel problem-statement ${mobileView === 'problem' ? 'mobile-active' : ''}`} aria-label="Problem description">
                    <div className="study-panel-heading"><span><Icon name="book" size={17} />Description</span><span className="muted">#{problem.id}</span></div>
                    <div className="statement-content"><div className="statement-text">{problem.description}</div><h2>Examples</h2>
                        {samples.length === 0 && <p className="muted">No sample cases are available yet. You can still submit against the judge's tests.</p>}
                        {samples.map((s, i) => <div className="sample-example" key={i}><h3>Example {i + 1}</h3><div><span>Input</span><pre>{s.input === '' ? '(empty)' : s.input}</pre></div><div><span>Expected output</span><pre>{s.expectedOutput === '' ? '(empty)' : s.expectedOutput}</pre></div></div>)}
                        <div className="statement-workspace-tip"><Icon name="layers" size={20} /><div><strong>Need to work it out?</strong><p>Trace arrays, pointers, and variables before writing your solution.</p><Link to={`/problems/${slug}/workspace`}>Open dry-run workspace<Icon name="arrow" size={14} /></Link></div></div>
                    </div>
                </section>
                <section className={`practice-panel solution-panel ${mobileView === 'code' ? 'mobile-active' : ''}`} aria-label="Solution editor">
                    <div className="study-panel-heading"><span><Icon name="code" size={17} />Solution <span className="language-pill">Java</span></span><div className="code-tools"><label><span className="sr-only">Editor font size</span><select aria-label="Editor font size" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>{[14, 16, 18].map((n) => <option key={n} value={n}>{n}px</option>)}</select></label><button className="icon-button secondary" onClick={handleCopy} title={copied ?? 'Copy code'} aria-label="Copy code"><Icon name="copy" size={16} /></button><button className="icon-button secondary" disabled={!!busy} onClick={() => setResetting(true)} title="Reset code" aria-label="Reset code"><Icon name="refresh" size={16} /></button><button className="icon-button secondary focus-toggle" onClick={() => setFocused((v) => !v)} aria-label={focused ? 'Show problem description' : 'Focus editor'} aria-pressed={focused}><Icon name="expand" size={16} /></button></div></div>
                    <div className="coding-editor"><CodeEditor height="min(52vh, 530px)" value={code} onChange={handleCodeChange} dark={dark} fontSize={fontSize} onRun={handleRun} onSubmit={handleSubmit} /></div>
                    <div className="code-draft-status"><span className={draftState === 'failed' ? 'error' : ''} role="status">{draftState === 'saved' ? 'Saved on this device' : draftState === 'restored' ? 'Draft restored on this device' : draftState === 'failed' ? 'Draft could not be saved. Copy your code before leaving.' : 'Your draft stays on this device'}</span>{copied && <span role="status">{copied}</span>}</div>
                    <div className="coding-actionbar"><span className="coding-shortcut">Ctrl/Cmd + Enter to run</span><div><button className="secondary" onClick={handleRun} disabled={!!busy || samples.length === 0} title={samples.length ? 'Run sample cases' : 'No sample cases available'}><Icon name="play" size={16} />{busy === 'run' ? 'Running…' : 'Run samples'}</button><button onClick={handleSubmit} disabled={!!busy}><Icon name="arrow" size={16} />{busy === 'submit' ? 'Submitting…' : 'Submit solution'}</button></div></div>
                    <p className="coding-contract">Use class <code>Solution</code>. Read standard input and print standard output.</p>
                    <div ref={resultRef} className="coding-results">
                        <div className="study-panel-heading"><span><Icon name="terminal" size={16} />Results</span>{submissionId && <Link className="text-action" to={`/submissions/${submissionId}`}>Submission #{submissionId}<Icon name="external" size={14} /></Link>}</div>
                        {busy ? <div className="judging-state" role="status"><span className="spinner" /><div><strong>{busy === 'run' ? 'Running sample tests' : statusLabel(liveStatus)}</strong><p>{busy === 'run' ? 'Checking your solution against the examples.' : 'Your submission is saved. You can also follow it from your history.'}</p></div></div> : actionError ? <ErrorState message={actionError} /> : result ? <ResultPanel result={result} /> : <div className="results-placeholder"><Icon name="terminal" size={24} /><p>Ready when you are.</p><span>Run the examples to check your approach, or submit to test the full solution.</span></div>}
                    </div>
                </section>
            </div>
            {resetting && <ConfirmDialog title="Reset your code?" confirmLabel="Reset code" cancelLabel="Keep my code" onCancel={() => setResetting(false)} onConfirm={handleReset}><p>This replaces your current draft with the starter template. Copy any code you want to keep first.</p></ConfirmDialog>}
        </div>
    )
}

export function ProblemDetailPage() {
    const { slug } = useParams()
    return <ProblemWorkspace key={slug} slug={slug} />
}
