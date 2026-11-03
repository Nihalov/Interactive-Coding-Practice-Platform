export function DifficultyBadge({ value }) {
    return <span className={`difficulty ${value.toLowerCase()}`}>{value}</span>
}