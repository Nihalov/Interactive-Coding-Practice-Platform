import { useState } from 'react'
import { parseArrayValues } from './editing'

export function ElementEditor({ element, elements, onApply, onDelete }) {
    const [draft, setDraft] = useState(() => ({
        ...element,
        arrayText: JSON.stringify(element.values ?? []),
    }))
    const [error, setError] = useState(null)
    const arrays = elements.filter((e) => e.type === 'ARRAY' && e.values.length > 0)
    const targets = elements.filter((e) => e.type !== 'ARROW')
    const target = arrays.find((e) => e.id === draft.targetElementId)

    function field(name, value) {
        setDraft((prev) => ({ ...prev, [name]: value }))
        setError(null)
    }

    function apply(event) {
        event.preventDefault()
        try {
            const updated = { ...element }
            if (['ARRAY', 'POINTER', 'VARIABLE'].includes(element.type)) updated.name = draft.name.trim()
            if (element.type === 'ARRAY') updated.values = parseArrayValues(draft.arrayText)
            if (element.type === 'VARIABLE') updated.value = draft.value
            if (element.type === 'TEXT') updated.text = draft.text
            if (element.type === 'POINTER') {
                updated.targetElementId = draft.targetElementId || null
                updated.index = updated.targetElementId ? Number(draft.index) : null
                if (updated.targetElementId && (!target || !Number.isInteger(updated.index) ||
                    updated.index < 0 || updated.index >= target.values.length)) {
                    throw new Error('Select an index inside the target array.')
                }
            }
            if (element.type === 'ARROW') {
                if (draft.fromElementId === draft.toElementId) throw new Error('Choose two different endpoints.')
                updated.fromElementId = draft.fromElementId
                updated.toElementId = draft.toElementId
                updated.label = draft.label
            }
            onApply(updated)
            setError(null)
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <form className="ws-inspector panel" onSubmit={apply}>
            <h2>Edit {element.type.toLowerCase()}</h2>
            {['ARRAY', 'POINTER', 'VARIABLE'].includes(element.type) && (
                <label>Name
                    <input value={draft.name ?? ''} maxLength={element.type === 'ARRAY' ? 50 : 30}
                        required={element.type !== 'ARRAY'} pattern={element.type !== 'ARRAY' ? '.*\\S.*' : undefined}
                        onChange={(e) => field('name', e.target.value)} />
                </label>
            )}
            {element.type === 'ARRAY' && (
                <>
                    <label>Array values (JSON)
                        <textarea aria-label="Array values (JSON)" value={draft.arrayText} rows={4} required onChange={(e) => field('arrayText', e.target.value)} />
                    </label>
                    <p className="hint">Example: [2, 7, "hello", true]. Use [] for an empty array. Shrinking an array moves pointers to its last cell; emptying it detaches them.</p>
                </>
            )}
            {element.type === 'VARIABLE' && (
                <label>Value
                    <input value={draft.value} maxLength={200} required pattern=".*\S.*" onChange={(e) => field('value', e.target.value)} />
                </label>
            )}
            {element.type === 'TEXT' && (
                <>
                    <label>Note
                        <textarea aria-label="Note" value={draft.text} maxLength={2000} rows={6} aria-describedby="ws-note-help"
                            onChange={(e) => field('text', e.target.value)} />
                    </label>
                    <p id="ws-note-help" className="hint">The canvas previews the first eight lines; all text is saved.</p>
                </>
            )}
            {element.type === 'POINTER' && (
                <>
                    <label>Target array
                        <select aria-label="Target array" value={draft.targetElementId ?? ''} onChange={(e) => setDraft((prev) => ({
                            ...prev, targetElementId: e.target.value || null, index: e.target.value ? 0 : null,
                        }))}>
                            <option value="">Free pointer</option>
                            {arrays.map((e) => <option key={e.id} value={e.id}>{e.name || e.id}</option>)}
                        </select>
                    </label>
                    {target && <label>Index (starts at 0)
                        <input type="number" min={0} max={target.values.length - 1} step={1} required
                            value={draft.index ?? 0} onChange={(e) => field('index', e.target.value)} />
                    </label>}
                </>
            )}
            {element.type === 'ARROW' && (
                <>
                    {['fromElementId', 'toElementId'].map((name) => (
                        <label key={name}>{name === 'fromElementId' ? 'From' : 'To'}
                            <select aria-label={name === 'fromElementId' ? 'From' : 'To'} value={draft[name]} onChange={(e) => field(name, e.target.value)}>
                                {targets.map((e) => <option key={e.id} value={e.id}>{e.name || e.id}</option>)}
                            </select>
                        </label>
                    ))}
                    <label>Label
                        <input value={draft.label ?? ''} maxLength={100} onChange={(e) => field('label', e.target.value)} />
                    </label>
                </>
            )}
            {error && <p className="error" role="alert">{error}</p>}
            <button type="submit">Apply changes</button>
            <button type="button" className="secondary ws-delete" onClick={onDelete}>Delete element</button>
            <p className="hint">Deleting an element removes its connecting arrows and detaches its pointers. Undo restores them.</p>
        </form>
    )
}
