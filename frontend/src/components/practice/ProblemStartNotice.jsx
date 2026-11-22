import { useEffect, useState } from 'react'
import { progressApi } from '../../api/progress'
import { describeError } from '../../api/errors'
import { ErrorState } from './PracticeUI'

export function ProblemStartNotice({ slug }) {
    const [retry, setRetry] = useState(0)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false
        progressApi.start(slug)
            .then(() => { if (!cancelled) setError(null) })
            .catch((err) => { if (!cancelled) setError(describeError(err)) })
        return () => { cancelled = true }
    }, [slug, retry])

    return error && <ErrorState message={`Your practice status could not be saved. ${error}`} onRetry={() => setRetry((value) => value + 1)} />
}
