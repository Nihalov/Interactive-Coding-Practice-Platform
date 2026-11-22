import { useState } from 'react'
import { FormError } from './FormError'
import { Icon } from './Icon'
import { ConfirmDialog } from './ConfirmDialog'
import { useDraftGuard } from '../../hooks/useDraftGuard'

export function ProblemForm({ problem, onSave, onSaved }) {
    const [draft, setDraft] = useState(() => ({ title: problem?.title ?? '', description: problem?.description ?? '', difficulty: problem?.difficulty ?? 'EASY' }))
    const [baseline, setBaseline] = useState(draft)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const [saved, setSaved] = useState(false)
    const [issues, setIssues] = useState({})
    const [resetting, setResetting] = useState(false)
    const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)
    const markClean = useDraftGuard(dirty || busy)

    function change(field, value) {
        setDraft((prev) => ({ ...prev, [field]: value }))
        setIssues((prev) => ({ ...prev, [field]: null }))
        setError(null)
        setSaved(false)
    }

    async function submit(event) {
        event.preventDefault()
        if (busy) return
        const invalid = {}
        if (!/[A-Za-z0-9]/.test(draft.title.trim())) invalid.title = 'Add a title containing a letter or number.'
        if (draft.title.length > 150) invalid.title = 'Keep the title within 150 characters.'
        if (!draft.description.trim()) invalid.description = 'Add a problem statement before saving.'
        if (!['EASY', 'MEDIUM', 'HARD'].includes(draft.difficulty)) invalid.difficulty = 'Choose a difficulty.'
        setIssues(invalid)
        if (Object.keys(invalid).length) {
            document.getElementById(`problem-${Object.keys(invalid)[0]}`)?.focus()
            return
        }
        setBusy(true)
        setError(null)
        setSaved(false)
        try {
            const body = { ...draft, title: draft.title.trim() }
            const result = await onSave(body)
            setDraft(body)
            setBaseline(body)
            markClean()
            setSaved(true)
            onSaved?.(result)
        } catch (err) {
            setError(err)
            setIssues(err.fieldErrors ?? {})
            const field = Object.keys(err.fieldErrors ?? {})[0]
            if (field) requestAnimationFrame(() => document.getElementById(`problem-${field}`)?.focus())
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
        <form className="admin-form problem-edit-form" onSubmit={submit} noValidate>
            <fieldset disabled={busy}>
                <div className="admin-fields">
                    <div className="problem-basic-fields">
                    <div className="form-field">
                    <label htmlFor="problem-title">Title <span className="required-mark">*</span></label>
                    <input id="problem-title" aria-label="Title" value={draft.title} onChange={(e) => change('title', e.target.value)}
                        placeholder="e.g. Find the missing number" maxLength={150} required autoComplete="off"
                        aria-invalid={!!issues.title} aria-describedby="title-help title-error" />
                    <div className="field-meta"><span id="title-help">A clear, descriptive name.</span><span>{draft.title.length}/150</span></div>
                    <span id="title-error" className="field-error" role={issues.title ? 'alert' : undefined}>{issues.title}</span>
                    </div>
                    <div className="form-field">
                    <label htmlFor="problem-difficulty">Difficulty <span className="required-mark">*</span></label>
                    <select id="problem-difficulty" aria-label="Difficulty" value={draft.difficulty} onChange={(e) => change('difficulty', e.target.value)} aria-invalid={!!issues.difficulty} aria-describedby="difficulty-error">
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                    </select>
                    <span id="difficulty-error" className="field-error">{issues.difficulty}</span>
                    </div>
                    </div>
                    <div className="form-field">
                    <label htmlFor="problem-description">Problem statement <span className="required-mark">*</span></label>
                    <textarea id="problem-description" aria-label="Problem statement" value={draft.description} onChange={(e) => change('description', e.target.value)}
                        placeholder={'Describe the task…\n\nInput format\nWhat will the program receive?\n\nOutput format\nWhat should it print?\n\nConstraints\nDefine the input limits.'}
                        rows={13} required aria-invalid={!!issues.description} aria-describedby="statement-help description-error" />
                    <span id="description-error" className="field-error" role={issues.description ? 'alert' : undefined}>{issues.description}</span>
                    <p id="statement-help" className="hint">Include the task, input/output format, and constraints. Formatting and line breaks are preserved as plain text.</p>
                    <details className="statement-preview"><summary><Icon name="external" size={16} />Preview statement</summary><div className="statement-text">{draft.description || 'Your problem statement will appear here.'}</div></details>
                    </div>
                </div>
                <FormError error={error} fields={false} />
                <div className="admin-savebar">
                    <span className={`save-indicator ${dirty ? 'dirty' : ''}`} role="status">
                        {busy ? <><span className="spinner" />Saving changes…</> : dirty ? <><span className="status-dot" />Unsaved changes</> : saved ? <><Icon name="check" size={16} />Problem saved.</> : problem ? <><Icon name="check" size={16} />All changes saved</> : 'Start with the problem details'}
                    </span>
                    <div className="admin-actions">
                        {dirty && <button type="button" className="secondary" onClick={() => setResetting(true)}>Reset changes</button>}
                        <button type="submit" disabled={busy || (!!problem && !dirty)}><Icon name="save" size={16} />{busy ? 'Saving…' : problem ? 'Save problem' : 'Create problem'}</button>
                    </div>
                </div>
            </fieldset>
        </form>
        {resetting && <ConfirmDialog title="Reset your changes?" confirmLabel="Reset changes" cancelLabel="Keep editing"
            onCancel={() => setResetting(false)} onConfirm={() => {
                setDraft(baseline); setError(null); setIssues({}); setSaved(false); markClean(); setResetting(false)
            }}><p>This restores the form to its last saved values.</p></ConfirmDialog>}
        </>
    )
}
