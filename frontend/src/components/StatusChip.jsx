import { statusLabel, statusTone } from '../api/results'

export function StatusChip({ status }) {
    return <span className={`chip ${statusTone(status)}`}>{statusLabel(status)}</span>
}