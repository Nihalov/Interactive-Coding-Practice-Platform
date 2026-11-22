import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { DraftContext } from './draftContext'
import { ConfirmDialog } from './ConfirmDialog'

/** One blocker coordinates all editors on a page, including a statement and a test-case draft. */
export function DraftGuard({ children }) {
    const drafts = useRef(new Set())
    const [pending, setPending] = useState(null)
    const setDraft = useCallback((id, dirty) => {
        if (dirty) drafts.current.add(id)
        else drafts.current.delete(id)
    }, [])
    const clearDrafts = useCallback(() => drafts.current.clear(), [])
    const discardThen = useCallback((action) => {
        if (drafts.current.size) setPending(() => action)
        else action()
    }, [])
    const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }) => {
        return drafts.current.size > 0 && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search)
    }, []))

    useEffect(() => {
        function onBeforeUnload(event) {
            if (drafts.current.size) {
                event.preventDefault()
                event.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [])

    const value = useMemo(() => ({ setDraft, clearDrafts, discardThen }), [setDraft, clearDrafts, discardThen])
    const blocked = blocker.state === 'blocked'
    return (
        <DraftContext.Provider value={value}>
            {children}
            {(blocked || pending) && <ConfirmDialog title="Discard unsaved changes?" confirmLabel="Discard and continue" cancelLabel="Keep editing"
                onCancel={() => { if (blocked) blocker.reset(); setPending(null) }}
                onConfirm={() => {
                    clearDrafts()
                    if (blocked) blocker.proceed()
                    else pending?.()
                    setPending(null)
                }}>
                <p>You have edits that haven’t been saved. Keep editing to save your work, or discard those changes to continue.</p>
            </ConfirmDialog>}
        </DraftContext.Provider>
    )
}
