import { statusLabel, statusTone } from '../api/results'
import { Icon } from './admin/Icon'

export function StatusChip({ status }) {
    const tone = statusTone(status)
    return <span className={`chip ${tone}`}><Icon name={tone === 'good' ? 'check' : tone === 'pending' ? 'clock' : 'close'} size={13} />{statusLabel(status)}</span>
}
