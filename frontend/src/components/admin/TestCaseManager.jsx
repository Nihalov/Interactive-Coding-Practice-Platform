import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { adminApi } from '../../api/admin'
import { FormError } from './FormError'
import { ConfirmDialog } from './ConfirmDialog'
import { Icon } from './Icon'
import { useDraftGuard } from '../../hooks/useDraftGuard'

function CaseForm({ testCase, busy, onSave, onCancel, editorRef }) {
    const [input, setInput] = useState(testCase?.input ?? '')
    const [expectedOutput, setExpectedOutput] = useState(testCase?.expectedOutput ?? '')
    const [sample, setSample] = useState(testCase?.sample ?? false)
    const [error, setError] = useState(null)
    const headingRef = useRef(null)
    const dirty = input !== (testCase?.input ?? '') || expectedOutput !== (testCase?.expectedOutput ?? '') || sample !== (testCase?.sample ?? false)
    const markClean = useDraftGuard(dirty || busy)
    useImperativeHandle(editorRef, () => ({ isDirty: () => dirty }), [dirty])
    useEffect(() => { headingRef.current?.focus() }, [])

    async function submit(event) {
        event.preventDefault()
        if (busy) return
        setError(null)
        try {
            // Preserve whitespace and empty strings: these are part of a program's input/output.
            await onSave({ input, expectedOutput, sample })
            markClean()
        } catch (err) {
            setError(err)
        }
    }

    return (
        <form className="admin-form admin-case-form" onSubmit={submit}>
            <div className="case-form-heading"><h3 ref={headingRef} tabIndex={-1}>{testCase ? `Edit test case ${testCase.orderIndex}` : 'New test case'}</h3><button type="button" className="icon-button secondary" aria-label="Close test case editor" disabled={busy} onClick={onCancel}><Icon name="close" /></button></div>
            <fieldset disabled={busy}>
                <label htmlFor="case-visibility">Visibility</label>
                <select id="case-visibility" value={sample ? 'sample' : 'hidden'} onChange={(e) => setSample(e.target.value === 'sample')}>
                    <option value="hidden">Hidden — judge only</option>
                    <option value="sample">Sample — visible to learners</option>
                </select>
                <p className="hint">Sample inputs and expected outputs appear on the problem page. Hidden cases stay private.</p>
                {testCase && !testCase.sample && sample && <p className="banner warn"><Icon name="external" size={16} />Saving as a sample makes this input and expected output visible to learners.</p>}
                <div className="admin-case-fields">
                    <div>
                        <label htmlFor="case-input">Input</label>
                        <textarea id="case-input" value={input} onChange={(e) => setInput(e.target.value)} rows={7}
                            maxLength={100000} spellCheck={false} />
                        <span className="field-meta">{input.length.toLocaleString()} / 100,000 characters</span>
                    </div>
                    <div>
                        <label htmlFor="case-output">Expected output</label>
                        <textarea id="case-output" value={expectedOutput} onChange={(e) => setExpectedOutput(e.target.value)} rows={7}
                            maxLength={100000} spellCheck={false} />
                        <span className="field-meta">{expectedOutput.length.toLocaleString()} / 100,000 characters</span>
                    </div>
                </div>
                <p className="hint">Empty input/output is allowed. Whitespace is preserved. Maximum 100,000 characters per field.</p>
                <FormError error={error} />
                <div className="admin-actions">
                    <button type="submit" disabled={busy || (!!testCase && !dirty)}><Icon name="save" size={16} />{busy ? 'Saving…' : testCase ? 'Save test case' : 'Add test case'}</button>
                    <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
                    {dirty && <span className="save-indicator dirty"><span className="status-dot" />Unsaved changes</span>}
                </div>
            </fieldset>
        </form>
    )
}

function preview(text) {
    return text === '' ? '(empty)' : text.length > 180 ? `${text.slice(0, 180)}…` : text
}

export function TestCaseManager({ problemId }) {
    const [refresh, setRefresh] = useState(0)
    const [loaded, setLoaded] = useState({ key: null, items: [], error: null })
    const [editing, setEditing] = useState(null)
    const [busy, setBusy] = useState(false)
    const [actionError, setActionError] = useState(null)
    const [notice, setNotice] = useState(null)
    const [filter, setFilter] = useState('all')
    const [switchTarget, setSwitchTarget] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const editorRef = useRef(null)
    const requestKey = `${problemId}:${refresh}`

    useEffect(() => {
        let cancelled = false
        adminApi.testCases(problemId)
            .then((items) => { if (!cancelled) setLoaded({ key: requestKey, items, error: null }) })
            .catch((error) => { if (!cancelled) setLoaded({ key: requestKey, items: [], error }) })
        return () => { cancelled = true }
    }, [problemId, requestKey])

    const loading = loaded.key !== requestKey
    const activeCase = loaded.items.find((item) => item.id === editing)
    const samples = loaded.items.filter((item) => item.sample).length
    const visibleItems = loaded.items.filter((item) => filter === 'all' || (filter === 'sample' ? item.sample : !item.sample))

    function openEditor(id) {
        if (id === editing) return
        if (editorRef.current?.isDirty()) {
            setSwitchTarget({ id })
            return
        }
        switchEditor(id)
    }

    function switchEditor(id) {
        setEditing(id)
        setActionError(null)
        setNotice(null)
    }

    async function save(body) {
        setBusy(true)
        setActionError(null)
        try {
            const item = editing === 'new'
                ? await adminApi.createTestCase(problemId, body)
                : await adminApi.updateTestCase(problemId, editing, body)
            setLoaded((prev) => ({ ...prev, items: editing === 'new'
                ? [...prev.items, item]
                : prev.items.map((entry) => entry.id === item.id ? item : entry) }))
            setEditing(null)
            setFilter('all')
            setNotice('Test case saved.')
        } finally {
            setBusy(false)
        }
    }

    async function remove(item) {
        if (busy) return
        setBusy(true)
        setActionError(null)
        setNotice(null)
        try {
            await adminApi.deleteTestCase(problemId, item.id)
            setLoaded((prev) => ({ ...prev, items: prev.items.filter((entry) => entry.id !== item.id) }))
            if (editing === item.id) setEditing(null)
            setNotice('Test case deleted.')
            setDeleteTarget(null)
        } catch (error) {
            setActionError(error)
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="panel admin-section" id="test-cases" aria-labelledby="test-cases-heading">
            <div className="admin-heading">
                <div>
                    <h2 id="test-cases-heading">Test cases</h2>
                    <p className="muted">Help learners get started. Challenge their solutions behind the scenes.</p>
                </div>
                <button type="button" disabled={loading || busy || !!loaded.error || editing === 'new'} onClick={() => openEditor('new')}>
                    <Icon name="plus" size={16} />New test case
                </button>
            </div>
            {loading ? <p className="muted" role="status">Loading test cases…</p> : loaded.error ? (
                <><FormError error={loaded.error} /><button className="secondary" onClick={() => setRefresh((n) => n + 1)}>Retry test cases</button></>
            ) : (
                <>
                    <div className="case-summary"><span><Icon name="layers" size={15} />{loaded.items.length} total</span><span><span className="status-dot sample" />{samples} sample</span><span><Icon name="shield" size={15} />{loaded.items.length - samples} hidden</span></div>
                    {samples === 0 && <p className="banner warn"><Icon name="book" size={17} />Add a sample case so learners can use Run samples.</p>}
                    {loaded.items.length === 0 && editing !== 'new' && <p className="muted">No test cases yet. Add at least one before accepting submissions.</p>}
                    {!deleteTarget && <FormError error={actionError} />}
                    {notice && <p className="admin-success success-notice" role="status"><Icon name="check" size={17} />{notice}</p>}
                    {editing !== null && (editing === 'new' || activeCase) && (
                        <CaseForm key={editing} editorRef={editorRef} testCase={activeCase} busy={busy} onSave={save} onCancel={() => openEditor(null)} />
                    )}
                    {loaded.items.length > 0 && (
                        <>
                        <div className="filter-bar case-filters" role="group" aria-label="Filter test cases">
                            {[['all', 'All cases', loaded.items.length], ['sample', 'Samples', samples], ['hidden', 'Hidden', loaded.items.length - samples]].map(([value, label, count]) => (
                                <button key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span className="filter-count">{count}</span></button>
                            ))}
                        </div>
                        {visibleItems.length === 0 ? <div className="admin-empty"><p className="muted">No {filter} test cases yet.</p><button className="secondary" onClick={() => setFilter('all')}>Show all cases</button></div> :
                        <div className="admin-table-scroll">
                            <table className="table admin-cases-table">
                                <caption className="sr-only">All test cases, including hidden cases</caption>
                                <thead><tr><th scope="col">Order</th><th scope="col">Visibility</th><th scope="col">Input</th><th scope="col">Expected output</th><th scope="col">Actions</th></tr></thead>
                                <tbody>{visibleItems.map((item) => (
                                    <tr key={item.id} className={editing === item.id ? 'editing-case' : ''}>
                                        <td data-label="Order">{item.orderIndex}</td>
                                        <td data-label="Visibility"><span className={`admin-visibility ${item.sample ? 'sample' : ''}`}><Icon name={item.sample ? 'book' : 'shield'} size={13} />{item.sample ? 'Sample' : 'Hidden'}</span></td>
                                        <td data-label="Input"><pre className="admin-case-preview">{preview(item.input)}</pre></td>
                                        <td data-label="Expected output"><pre className="admin-case-preview">{preview(item.expectedOutput)}</pre></td>
                                        <td><div className="admin-actions">
                                            <button className="secondary compact-button" disabled={busy} onClick={() => openEditor(item.id)} aria-label={`Edit test case ${item.orderIndex}`}><Icon name="edit" size={15} />Edit</button>
                                            <button className="secondary danger icon-button" disabled={busy} onClick={() => { setDeleteTarget(item); setActionError(null) }} aria-label={`Delete test case ${item.orderIndex}`} title="Delete test case"><Icon name="trash" size={16} /></button>
                                        </div></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>}
                        </>
                    )}
                </>
            )}
            {switchTarget && <ConfirmDialog title="Discard test case edits?" confirmLabel="Discard edits" cancelLabel="Keep editing" onCancel={() => setSwitchTarget(null)}
                onConfirm={() => { switchEditor(switchTarget.id); setSwitchTarget(null) }}>
                <p>The changes in this test case form haven’t been saved.</p>
            </ConfirmDialog>}
            {deleteTarget && <ConfirmDialog title={`Delete test case ${deleteTarget.orderIndex}?`} danger confirmLabel="Delete test case" busy={busy} error={actionError}
                onCancel={() => { setDeleteTarget(null); setActionError(null) }} onConfirm={() => remove(deleteTarget)}>
                <p>This permanently removes the {deleteTarget.sample ? 'sample' : 'hidden'} case from the problem. This action can’t be undone.</p>
            </ConfirmDialog>}
        </section>
    )
}
