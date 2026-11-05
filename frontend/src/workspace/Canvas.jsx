import { useMemo, useRef } from 'react'
import {
    CANVAS_H,
    CANVAS_W,
    CELL_H,
    CELL_W,
    NOTE_LINE_H,
    arrowEndpoints,
    computeLayout,
    shorten,
} from './model'

const DRAW_ORDER = { ARROW: 0, ARRAY: 1, VARIABLE: 2, TEXT: 3, POINTER: 4 }

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

function ArrayShape({ element, box }) {
    const values = element.values ?? []
    return (
        <>
            {values.length === 0 && (
                <>
                    <rect className="ws-shape ws-empty" x={box.x} y={box.y} width={CELL_W} height={CELL_H} rx={4} />
                    <text
                        className="ws-index"
                        x={box.x + CELL_W / 2}
                        y={box.y + CELL_H / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                    >
                        empty
                    </text>
                </>
            )}
            {values.map((value, i) => {
                const left = box.x + i * CELL_W
                return (
                    <g key={i}>
                        <rect className="ws-shape" x={left} y={box.y} width={CELL_W} height={CELL_H} />
                        <text
                            className="ws-value"
                            x={left + CELL_W / 2}
                            y={box.y + CELL_H / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                        >
                            {shorten(value, 6)}
                        </text>
                        <text className="ws-index" x={left + CELL_W / 2} y={box.y + CELL_H + 14} textAnchor="middle">
                            {i}
                        </text>
                    </g>
                )
            })}
            {element.name && (
                <text
                    className="ws-name"
                    x={box.x - 10}
                    y={box.y + CELL_H / 2}
                    textAnchor="end"
                    dominantBaseline="central"
                >
                    {shorten(element.name, 16)}
                </text>
            )}
        </>
    )
}

function PointerShape({ element, box }) {
    const cx = box.x + box.w / 2
    // Bound pointers point at their cell; free ones show a short arrow pointing down
    const tipY = box.bound ? box.tipY : box.y + box.h + 12
    return (
        <>
            <line
                className="ws-pointer-line"
                x1={cx}
                y1={box.y + box.h}
                x2={cx}
                y2={tipY}
                markerEnd="url(#ws-pointerhead)"
            />
            <rect className="ws-shape ws-pointer" x={box.x} y={box.y} width={box.w} height={box.h} rx={12} />
            <text
                className="ws-pointer-text"
                x={cx}
                y={box.y + box.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
            >
                {element.name}
            </text>
        </>
    )
}

function VariableShape({ element, box }) {
    return (
        <>
            <rect className="ws-shape ws-variable" x={box.x} y={box.y} width={box.w} height={box.h} rx={8} />
            <text className="ws-name" x={box.x + 10} y={box.y + box.h / 2} dominantBaseline="central">
                {shorten(element.name, 10)}
            </text>
            <text
                className="ws-value"
                x={box.x + box.w - 10}
                y={box.y + box.h / 2}
                textAnchor="end"
                dominantBaseline="central"
            >
                {shorten(element.value, 12)}
            </text>
        </>
    )
}

function NoteShape({ box }) {
    return (
        <>
            <rect className="ws-shape ws-note" x={box.x} y={box.y} width={box.w} height={box.h} rx={4} />
            {box.lines.map((line, i) => (
                <text
                    key={i}
                    className="ws-note-text"
                    x={box.x + 10}
                    y={box.y + 8 + (i + 0.5) * NOTE_LINE_H}
                    dominantBaseline="central"
                >
                    {line}
                </text>
            ))}
        </>
    )
}

function ArrowShape({ element, boxes }) {
    const points = arrowEndpoints(element, boxes)
    if (!points) return null
    const { from, to } = points
    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2
    return (
        <>
            {/* A wide invisible line makes the thin arrow easy to click */}
            <line className="ws-hit" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
            <line
                className="ws-arrow"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                markerEnd="url(#ws-arrowhead)"
            />
            {element.label && (
                <text className="ws-arrow-label" x={midX} y={midY - 6} textAnchor="middle">
                    {shorten(element.label, 24)}
                </text>
            )}
        </>
    )
}

export function Canvas({ elements, selectedId, onSelect, onMove }) {
    const svgRef = useRef(null)
    const dragRef = useRef(null)
    const boxes = useMemo(() => computeLayout(elements), [elements])

    // Arrows go underneath, pointers on top. filter() makes a copy, so sort() never touches the state.
    const ordered = useMemo(
        () =>
            elements
                .filter((e) => Object.hasOwn(DRAW_ORDER, e.type))
                .sort((a, b) => DRAW_ORDER[a.type] - DRAW_ORDER[b.type]),
        [elements],
    )

    // Screen position -> canvas position (correct even when the page or the canvas is scrolled)
    function toCanvasPoint(event) {
        const svg = svgRef.current
        const point = svg.createSVGPoint()
        point.x = event.clientX
        point.y = event.clientY
        return point.matrixTransform(svg.getScreenCTM().inverse())
    }

    function startDrag(event, element, box) {
        event.stopPropagation()
        onSelect(element.id)
        if (element.type === 'ARROW' || !box || box.bound) {
            return
        }
        const point = toCanvasPoint(event)
        dragRef.current = { id: element.id, offsetX: point.x - element.x, offsetY: point.y - element.y }
        svgRef.current.setPointerCapture(event.pointerId)
    }

    function handleMove(event) {
        const drag = dragRef.current
        if (!drag) return
        const point = toCanvasPoint(event)
        onMove(
            drag.id,
            clamp(Math.round(point.x - drag.offsetX), 0, CANVAS_W - 40),
            clamp(Math.round(point.y - drag.offsetY), 0, CANVAS_H - 40),
        )
    }

    function endDrag() {
        dragRef.current = null
    }

    return (
        <svg
            ref={svgRef}
            className="ws-svg"
            width={CANVAS_W}
            height={CANVAS_H}
            aria-label="Dry-run workspace"
            onPointerMove={handleMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            <defs>
                <marker
                    id="ws-arrowhead"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" className="ws-arrowhead" />
                </marker>
                <marker
                    id="ws-pointerhead"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" className="ws-pointerhead" />
                </marker>
                <pattern id="ws-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" className="ws-grid-line" fill="none" />
                </pattern>
            </defs>

            {/* Clicking the empty background clears the selection */}
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#ws-grid)" onPointerDown={() => onSelect(null)} />

            {elements.length === 0 && (
                <text className="ws-hint" x={60} y={80}>
                    Empty workspace. Use the buttons above to add arrays, pointers, variables and notes.
                </text>
            )}

            {ordered.map((element) => {
                const box = boxes.get(element.id)
                const isArrow = element.type === 'ARROW'
                if (!isArrow && !box) return null

                const draggable = !isArrow && !box.bound
                const classes = ['ws-el', element.type.toLowerCase()]
                if (draggable) classes.push('draggable')
                if (element.id === selectedId) classes.push('selected')

                return (
                    <g key={element.id} className={classes.join(' ')} onPointerDown={(e) => startDrag(e, element, box)}>
                        {element.type === 'ARRAY' && <ArrayShape element={element} box={box} />}
                        {element.type === 'VARIABLE' && <VariableShape element={element} box={box} />}
                        {element.type === 'TEXT' && <NoteShape box={box} />}
                        {element.type === 'POINTER' && <PointerShape element={element} box={box} />}
                        {isArrow && <ArrowShape element={element} boxes={boxes} />}
                    </g>
                )
            })}
        </svg>
    )
}