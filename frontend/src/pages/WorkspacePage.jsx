import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { describeError } from '../api/errors'
import { problemsApi } from '../api/problems'
import { workspaceApi } from '../api/workspace'
import { Canvas } from '../workspace/Canvas'
import { MAX_ELEMENTS, createElement } from '../workspace/model'

function WorkspaceEditor({ slug, problem, workspace, onReload }) {
    const initialElements = workspace.state?.elements ?? []

    const [elements, setElements] = useState(initialElements)
    const [version, setVersion] = useState(workspace.version) // null until the first save
    const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialElements))
    const [selectedId, setSelectedId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [savedAt, setSavedAt] = useState(null)
    const [conflict, setConflict] = useState(false)
    const [saveError, setSaveError] = useState(null)

    const dirty = useMemo(() => JSON.stringify(elements) !== savedJson, [elements, savedJson])
    const full = elements.length >= MAX_ELEMENTS

    const save = useCallback(
        async (versionOverride) => {
            if (saving) return
            const expectedVersion = versionOverride === undefined ? version : versionOverride
            const sent = elements // what we send is what we mark as saved, even if the user keeps editing meanwhile

            setSaving(true)
            setSaveError(null)
            setConflict(false)
            try {
                const saved = await workspaceApi.save(slug, expectedVersion, sent)
                setVersion(saved.version)
                setSavedJson(JSON.stringify(sent))
                setSavedAt(new Date())
            } catch (err) {
                if (err instanceof ApiError && err.status === 409) {
                    setConflict(true)
                } else {
                    setSaveError({
                        message: describeError(err),
                        fieldErrors: err instanceof ApiError ? err.fieldErrors : {},
                    })
                }
            } finally {
                setSaving(false)
            }
        },
        [saving, version, elements, slug],
    )

    // Ctrl+S (Cmd+S on a Mac) saves instead of opening the browser's save dialog
    useEffect(() => {
        function onKeyDown(event) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault()
                if (dirty) save()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [dirty, save])

    // Closing or reloading the tab with unsaved work shows the browser's "Leave site?" prompt
    useEffect(() => {
        if (!dirty) return
        function onBeforeUnload(event) {
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [dirty])

    const handleMove = useCallback((id, x, y) => {
        setElements((prev) =>
            prev.map((e) => (e.id === id && (e.x !== x || e.y !== y) ? { ...e, x, y } : e)),
        )
    }, [])

    function handleAdd(type) {
        if (full) return
        const element = createElement(type, elements)
        setElements([...elements, element])
        setSelectedId(element.id)
    }

    function handleDiscard() {
        if (window.confirm('Discard your unsaved changes?')) {
            onReload()
        }
    }

    // "Overwrite with mine": read the current version, then save on top of it
    async function handleOverwrite() {
        try {
            const latest = await workspaceApi.get(slug)
            await save(latest.version)
        } catch (err) {
            setSaveError({ message: describeError(err), fieldErrors: {} })
        }
    }

    let status = 'New workspace'
    if (saving) status = 'Saving…'
    else if (dirty) status = 'Unsaved changes'
    else if (savedAt) status = `Saved at ${savedAt.toLocaleTimeString()}`
    else if (version !== null) status = 'All changes saved'

    return (
        <div>
            <p className="muted">
                <Link to={`/problems/${slug}`}>← {problem.title}</Link>
            </p>

            <div className="ws-toolbar">
                <button className="secondary" onClick={() => handleAdd('ARRAY')} disabled={full}>
                    + Array
                </button>
                <button className="secondary" onClick={() => handleAdd('POINTER')} disabled={full}>
                    + Pointer
                </button>
                <button className="secondary" onClick={() => handleAdd('VARIABLE')} disabled={full}>
                    + Variable
                </button>
                <button className="secondary" onClick={() => handleAdd('TEXT')} disabled={full}>
                    + Note
                </button>
                <div className="spacer" />
                <span className="muted ws-status">{status}</span>
                <button className="secondary" onClick={handleDiscard} disabled={!dirty || saving}>
                    Discard changes
                </button>
                {/* () => save(): passing save directly would hand it the click event as the version */}
                <button onClick={() => save()} disabled={!dirty || saving}>
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>

            {conflict && (
                <div className="banner warn">
                    <strong>This workspace was changed somewhere else</strong> (for example in another tab), so your save was
                    not applied.
                    <div className="banner-actions">
                        <button className="secondary" onClick={onReload}>
                            Discard mine and load the latest
                        </button>
                        <button className="secondary" onClick={handleOverwrite}>
                            Overwrite with my version
                        </button>
                    </div>
                </div>
            )}

            {saveError && (
                <div className="banner problem">
                    <strong>{saveError.message}</strong>
                    {Object.entries(saveError.fieldErrors)
                        .slice(0, 8)
                        .map(([field, message]) => (
                            <div key={field}>
                                <code>{field}</code>: {message}
                            </div>
                        ))}
                </div>
            )}

            <div className="ws-scroll">
                <Canvas elements={elements} selectedId={selectedId} onSelect={setSelectedId} onMove={handleMove} />
            </div>
        </div>
    )
}

export function WorkspacePage() {
    const { slug } = useParams()
    const [loadKey, setLoadKey] = useState(0)
    const [loaded, setLoaded] = useState({ key: null, problem: null, workspace: null, error: null })
    const requestKey = `${slug}:${loadKey}`

    useEffect(() => {
        let cancelled = false
        Promise.all([problemsApi.get(slug), workspaceApi.get(slug)])
            .then(([problem, workspace]) => {
                if (!cancelled) setLoaded({ key: requestKey, problem, workspace, error: null })
            })
            .catch((err) => {
                if (!cancelled) setLoaded({ key: requestKey, problem: null, workspace: null, error: err })
            })
        return () => {
            cancelled = true
        }
    }, [slug, loadKey, requestKey])

    if (loaded.key !== requestKey) {
        return <p className="muted">Loading…</p>
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

    // Changing the key remounts the editor, which is how "reload" resets all of its state
    return (
        <WorkspaceEditor
            key={requestKey}
            slug={slug}
            problem={loaded.problem}
            workspace={loaded.workspace}
            onReload={() => setLoadKey((k) => k + 1)}
        />
    )
}