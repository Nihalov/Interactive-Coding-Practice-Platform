import { useEffect, useRef } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/editor/editor.api.js'
import 'monaco-editor/languages/definitions/java/register.js'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'

// Serve the editor and its worker with the app instead of depending on an external CDN.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })

export default function MonacoCodeEditor({ value, onChange, height = '420px', readOnly = false, dark, fontSize = 14, onRun, onSubmit }) {
    const actions = useRef({})
    useEffect(() => { actions.current = { onRun, onSubmit } }, [onRun, onSubmit])
    return <Editor height={height} language="java" theme={dark ? 'vs-dark' : 'light'} value={value} onChange={onChange}
        onMount={(editor, api) => {
            if (!readOnly) {
                editor.addCommand(api.KeyMod.CtrlCmd | api.KeyCode.Enter, () => actions.current.onRun?.())
                editor.addCommand(api.KeyMod.CtrlCmd | api.KeyMod.Shift | api.KeyCode.Enter, () => actions.current.onSubmit?.())
            }
        }}
        options={{ readOnly, minimap: { enabled: false }, fontSize, tabSize: 4, automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 18, bottom: 18 }, fontFamily: 'Consolas, ui-monospace, monospace', lineHeight: 24, renderLineHighlight: readOnly ? 'none' : 'line', wordWrap: 'on', ariaLabel: readOnly ? 'Submitted Java code' : 'Java code editor' }} />
}
