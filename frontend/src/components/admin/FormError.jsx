import { describeError } from '../../api/errors'

export function FormError({ error, fields = true }) {
    if (!error) return null
    return (
        <div className="banner problem" role="alert">
            <p>{describeError(error)}</p>
            {fields && Object.entries(error.fieldErrors ?? {}).map(([field, message]) => (
                <p key={field}><strong>{field}:</strong> {message}</p>
            ))}
        </div>
    )
}
