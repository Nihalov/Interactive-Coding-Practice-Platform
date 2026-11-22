import { Link } from 'react-router-dom'
import { Icon } from '../admin/Icon'
import { DifficultyBadge } from '../DifficultyBadge'

export function PageHeading({ eyebrow, title, description, children }) {
    return <header className="practice-heading"><div><p className="practice-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>{children}</header>
}

export function DifficultyTag({ value }) {
    return <span className={`practice-difficulty ${value.toLowerCase()}`}><span className="status-dot" /><DifficultyBadge value={value} /></span>
}

export function LoadingState({ label = 'Loading…' }) {
    return <div className="practice-loading" role="status"><span className="spinner" />{label}</div>
}

export function ErrorState({ message, onRetry }) {
    return <div className="practice-error" role="alert"><p>{message}</p>{onRetry && <button className="secondary" onClick={onRetry}><Icon name="refresh" size={16} />Try again</button>}</div>
}

export function EmptyState({ icon = 'book', title, description, to, action, children }) {
    return <div className="practice-empty"><span className="practice-empty-icon"><Icon name={icon} size={28} /></span><h2>{title}</h2><p>{description}</p>{to && <Link className="button-link" to={to}>{action}<Icon name="arrow" size={16} /></Link>}{children}</div>
}
