import { useEffect, useId, useRef } from 'react'
import { FormError } from './FormError'
import { Icon } from './Icon'

export function ConfirmDialog({ title, children, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel, busy = false, error, danger = false }) {
    const ref = useRef(null)
    const titleId = useId()
    useEffect(() => {
        const dialog = ref.current
        dialog.showModal()
        return () => dialog.close()
    }, [])

    return (
        <dialog ref={ref} className="confirm-dialog" aria-labelledby={titleId}
            onCancel={(event) => { event.preventDefault(); if (!busy) onCancel() }}
            onClick={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}>
            <div className={`dialog-symbol ${danger ? 'danger' : ''}`}><Icon name={danger ? 'trash' : 'edit'} size={24} /></div>
            <h2 id={titleId}>{title}</h2>
            <div className="dialog-description">{children}</div>
            <FormError error={error} />
            <div className="dialog-actions">
                <button type="button" className="secondary" autoFocus disabled={busy} onClick={onCancel}>{cancelLabel}</button>
                <button type="button" className={danger ? 'danger-solid' : ''} disabled={busy} onClick={onConfirm}>
                    {busy ? 'Working…' : confirmLabel}
                </button>
            </div>
        </dialog>
    )
}
