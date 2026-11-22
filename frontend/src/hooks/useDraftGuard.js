import { useCallback, useContext, useEffect, useId } from 'react'
import { DraftContext } from '../components/admin/draftContext'

export function useDraftActions() {
    const context = useContext(DraftContext)
    if (!context) throw new Error('Draft controls require a DraftGuard')
    return context
}

export function useDraftGuard(dirty) {
    const id = useId()
    const { setDraft } = useDraftActions()
    useEffect(() => {
        setDraft(id, dirty)
        return () => setDraft(id, false)
    }, [id, dirty, setDraft])
    return useCallback(() => setDraft(id, false), [id, setDraft])
}
