import { statusLabel, statusTone } from '../api/results'
import { Icon } from './admin/Icon'

function Block({ label, text, tone }) {
    const empty = text === null || text === undefined || text === ''
    return (
        <div className="block">
            <span className="block-label">{label}</span>
            <pre className={`output ${tone ?? ''} ${empty ? 'muted' : ''}`}>{empty ? '(empty)' : text}</pre>
        </div>
    )
}

function CaseCard({ c }) {
    const tone = statusTone(c.status)
    return (
        <details className={`case result-case ${tone}`} open={c.status !== 'ACCEPTED'}>
            <summary className="case-head">
                <strong>{c.sample ? `Test ${c.index}` : `Hidden test ${c.index}`}</strong>
                <span className={`chip ${tone}`}>{statusLabel(c.status)}</span>
                <span className="muted">{c.timeMs} ms</span>
            </summary>
            {c.sample ? (
                <>
                    <Block label="Input" text={c.input} />
                    <Block label="Expected" text={c.expectedOutput} />
                    <Block label="Your output" text={c.actualOutput} />
                    {c.errorOutput && <Block label="Error output" text={c.errorOutput} tone="bad" />}
                </>
            ) : (
                <p className="muted">Details of hidden tests are not shown.</p>
            )}
        </details>
    )
}

export function ResultPanel({ result }) {
    const tone = statusTone(result.status)
    const showCounts = result.status !== 'COMPILATION_ERROR' && result.total > 0

    return (
        <section className={`result result-${tone}`} aria-label="Execution result">
            <header className="result-head">
                <span className={`verdict ${tone}`} role="status"><Icon name={tone === 'good' ? 'check' : tone === 'pending' ? 'clock' : 'close'} size={19} />{statusLabel(result.status)}</span>
                {showCounts && (
                    <span className="muted">
            {result.passed} / {result.total} tests passed
          </span>
                )}
                {result.timeMs !== null && result.timeMs !== undefined && <span className="muted">{result.timeMs} ms</span>}
                <span className="muted">{result.kind === 'run' ? 'Sample run' : `Submission #${result.id}`}</span>
            </header>
            {result.message && <pre className="output">{result.message}</pre>}
            {result.cases.map((c) => (
                <CaseCard key={c.index} c={c} />
            ))}
        </section>
    )
}
