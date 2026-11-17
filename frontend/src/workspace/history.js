const HISTORY_LIMIT = 100

export function createHistory(elements) {
    return { past: [], present: elements, future: [], dragStart: null }
}

function changed(a, b) {
    return JSON.stringify(a) !== JSON.stringify(b)
}

function commit(state, elements, previous = state.present) {
    if (!changed(previous, elements)) return { ...state, present: elements, dragStart: null }
    return {
        past: [...state.past, previous].slice(-HISTORY_LIMIT),
        present: elements,
        future: [],
        dragStart: null,
    }
}

/** Each applied edit or completed drag is one undo step. Saving does not change history. */
export function historyReducer(state, action) {
    switch (action.type) {
        case 'replace':
            return commit(state, action.elements)
        case 'move-start':
            return { ...state, dragStart: state.present }
        case 'move':
            return {
                ...state,
                present: state.present.map((e) => e.id === action.id ? { ...e, x: action.x, y: action.y } : e),
            }
        case 'move-end':
            return state.dragStart ? commit(state, state.present, state.dragStart) : state
        case 'undo':
            if (state.dragStart || !state.past.length) return state
            return {
                ...state,
                past: state.past.slice(0, -1),
                present: state.past[state.past.length - 1],
                future: [state.present, ...state.future],
            }
        case 'redo':
            if (state.dragStart || !state.future.length) return state
            return {
                ...state,
                past: [...state.past, state.present],
                present: state.future[0],
                future: state.future.slice(1),
            }
        default:
            return state
    }
}
