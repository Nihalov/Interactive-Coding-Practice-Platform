import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../api/admin'
import { problemsApi } from '../api/problems'
import { FormError } from '../components/admin/FormError'
import { ProblemForm } from '../components/admin/ProblemForm'
import { TestCaseManager } from '../components/admin/TestCaseManager'
import { DifficultyBadge } from '../components/DifficultyBadge'
import { Icon } from '../components/admin/Icon'
import { ConfirmDialog } from '../components/admin/ConfirmDialog'
import { useDraftActions } from '../hooks/useDraftGuard'

export function AdminNewProblemPage() {
    const navigate = useNavigate()
    return (
        <div className="admin-page">
            <nav className="admin-breadcrumb" aria-label="Breadcrumb"><Link to="/admin">Problem library</Link><span aria-hidden="true">/</span><span>New problem</span></nav>
            <div className="admin-page-heading"><p className="admin-eyebrow">Grow your library</p><h1>Create problem</h1><p className="muted">Turn a good idea into your learners’ next challenge.</p></div>
            <div className="admin-editor-layout">
            <section className="panel admin-section">
                <div className="editor-section-heading"><span className="section-number">01</span><div><h2>Problem details</h2><p className="muted">Write a statement that’s clear and easy to follow.</p></div></div>
                <ProblemForm onSave={adminApi.createProblem} onSaved={(saved) => navigate(`/admin/problems/${saved.slug}/edit`, { replace: true })} />
            </section>
            <aside className="editor-guide"><p className="admin-eyebrow">Your next steps</p><div className="guide-step"><span>1</span><div><strong>Write the problem</strong><p>Give it a name, set the difficulty, and explain the task.</p></div></div><div className="guide-step pending"><span>2</span><div><strong>Add test cases</strong><p>After creating the problem, add examples and hidden cases.</p></div></div><div className="guide-tip"><Icon name="book" /><p>Every solution reads standard input and writes standard output. Include both formats in your statement.</p></div></aside>
            </div>
        </div>
    )
}

function ExistingProblem({ slug }) {
    const navigate = useNavigate()
    const [refresh, setRefresh] = useState(0)
    const [loaded, setLoaded] = useState({ key: null, problem: null, error: null })
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const { clearDrafts } = useDraftActions()

    useEffect(() => {
        let cancelled = false
        problemsApi.get(slug)
            .then((problem) => { if (!cancelled) setLoaded({ key: refresh, problem, error: null }) })
            .catch((error) => { if (!cancelled) setLoaded({ key: refresh, problem: null, error }) })
        return () => { cancelled = true }
    }, [slug, refresh])

    if (loaded.key !== refresh) return <p className="muted" role="status">Loading problem…</p>
    if (loaded.error) return (
        <div className="admin-page"><Link to="/admin">← Admin dashboard</Link><FormError error={loaded.error} />
            <button className="secondary" onClick={() => setRefresh((n) => n + 1)}>Retry problem</button></div>
    )
    const problem = loaded.problem

    async function remove() {
        if (deleting) return
        setDeleting(true)
        setDeleteError(null)
        try {
            await adminApi.deleteProblem(problem.id)
            clearDrafts()
            navigate('/admin', { replace: true })
        } catch (error) {
            setDeleteError(error)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="admin-page">
            <nav className="admin-breadcrumb" aria-label="Breadcrumb"><Link to="/admin">Problem library</Link><span aria-hidden="true">/</span><span>{problem.title}</span></nav>
            <div className="admin-heading admin-page-heading">
                <div><p className="admin-eyebrow">Problem editor</p><h1>{problem.title}</h1><div className="editor-meta"><DifficultyBadge value={problem.difficulty} /><span>/{problem.slug}</span></div></div>
            </div>
            <div className="admin-editor-layout">
            <div className="admin-editor-main">
            <section className="panel admin-section" id="problem-details" aria-labelledby="problem-details-heading">
                <div className="editor-section-heading"><span className="section-number">01</span><div><h2 id="problem-details-heading">Problem details</h2><p className="muted">The URL stays the same when you change the title.</p></div></div>
                <ProblemForm problem={problem} onSave={async (body) => {
                    const saved = await adminApi.updateProblem(problem.id, body)
                    setLoaded((prev) => ({ ...prev, problem: saved }))
                    return saved
                }} />
            </section>
            <TestCaseManager key={problem.id} problemId={problem.id} />
            <details className="panel admin-section admin-delete-section" id="danger-zone">
                <summary><Icon name="trash" size={17} />Danger zone<span>Permanent changes</span></summary>
                <section aria-labelledby="delete-problem-heading">
                <div className="admin-heading">
                    <div><h2 id="delete-problem-heading">Delete problem</h2><p className="muted">Removes this problem and its test cases. Problems with submissions cannot be deleted.</p></div>
                    <button className="secondary danger" disabled={deleting} onClick={() => { setConfirmDelete(true); setDeleteError(null) }}><Icon name="trash" size={16} />Delete problem</button>
                </div>
                </section>
            </details>
            </div>
            <aside className="editor-guide"><p className="admin-eyebrow">On this page</p><nav aria-label="Editor sections"><a href="#problem-details"><Icon name="edit" size={16} />Problem details</a><a href="#test-cases"><Icon name="shield" size={16} />Test cases</a><a href="#danger-zone"><Icon name="trash" size={16} />Danger zone</a></nav><div className="guide-tip"><Icon name="shield" /><p>Use samples to teach. Use hidden cases to check edge cases, limits, and correctness.</p></div></aside>
            </div>
            {confirmDelete && <ConfirmDialog title="Delete this problem?" danger confirmLabel="Delete problem" busy={deleting} error={deleteError}
                onCancel={() => { setConfirmDelete(false); setDeleteError(null) }} onConfirm={remove}>
                <p><strong>{problem.title}</strong> and all of its test cases will be permanently removed. Problems with submissions can’t be deleted.</p>
            </ConfirmDialog>}
        </div>
    )
}

export function AdminProblemPage() {
    const { slug } = useParams()
    return <ExistingProblem key={slug} slug={slug} />
}
