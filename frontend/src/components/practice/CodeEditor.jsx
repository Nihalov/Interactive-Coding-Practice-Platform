import { lazy, Suspense } from 'react'

function PlainEditor({ value, onChange, height = '420px', readOnly, loading = false, fontSize = 14 }) {
    return <div className="plain-code-editor">{loading && <p className="hint">Preparing the editor… You can start typing below.</p>}<textarea aria-label={readOnly ? 'Submitted Java code' : 'Java code editor'} value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={readOnly} spellCheck={false} style={{ height, fontSize }} /></div>
}

const Monaco = lazy(() => import('./MonacoCodeEditor').catch(() => ({ default: PlainEditor })))

export function CodeEditor(props) {
    return <Suspense fallback={<PlainEditor {...props} loading />}><Monaco {...props} /></Suspense>
}
