import type { Shape, ShapeType } from '../model/types.ts'

/**
 * The shapes, the selection and undo history.
 *
 * `shapes` is what is on screen. While something is being dragged or typed,
 * it runs ahead of `committed`; a commit adds `committed` to the history and
 * catches it up. So undo steps over a whole drag, not every mouse move.
 */
export interface EditorState {
  shapes: Shape[]
  committed: Shape[]
  past: Shape[][]
  future: Shape[][]
  selectedId: number | null
}

export type EditorAction =
  /** Change the shapes without adding an undo step yet. */
  | { type: 'preview'; shapes: Shape[] }
  /** Add the pending change to the history. */
  | { type: 'commit' }
  /** Change the shapes as one undo step, optionally selecting a shape. */
  | { type: 'set'; shapes: Shape[]; select?: number | null }
  | { type: 'select'; id: number | null }
  | { type: 'undo' }
  | { type: 'redo' }

const HISTORY_LIMIT = 200

export function initEditor(shapes: Shape[]): EditorState {
  return { shapes, committed: shapes, past: [], future: [], selectedId: null }
}

const same = (a: Shape[], b: Shape[]) => a === b || JSON.stringify(a) === JSON.stringify(b)

function commit(state: EditorState): EditorState {
  if (state.shapes === state.committed) return state
  if (same(state.shapes, state.committed)) return { ...state, committed: state.shapes }
  return {
    ...state,
    committed: state.shapes,
    past: [...state.past, state.committed].slice(-HISTORY_LIMIT),
    future: [],
  }
}

function keepSelection(shapes: Shape[], id: number | null): number | null {
  return id !== null && shapes.some((s) => s.id === id) ? id : null
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'preview':
      return { ...state, shapes: action.shapes }
    case 'commit':
      return commit(state)
    case 'set': {
      const selectedId = action.select !== undefined ? action.select : keepSelection(action.shapes, state.selectedId)
      return commit({ ...state, shapes: action.shapes, selectedId })
    }
    case 'select':
      return { ...state, selectedId: action.id }
    case 'undo': {
      const s = commit(state)
      if (s.past.length === 0) return s
      const prev = s.past[s.past.length - 1]
      return {
        shapes: prev,
        committed: prev,
        past: s.past.slice(0, -1),
        future: [s.committed, ...s.future],
        selectedId: keepSelection(prev, s.selectedId),
      }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        shapes: next,
        committed: next,
        past: [...state.past, state.committed],
        future: state.future.slice(1),
        selectedId: keepSelection(next, state.selectedId),
      }
    }
  }
}

export function nextShapeId(shapes: readonly Shape[]): number {
  return shapes.reduce((max, s) => Math.max(max, s.id), 0) + 1
}

const TYPE_NAME: Record<ShapeType, string> = {
  polygon: 'Polygon',
  rect: 'Rectangle',
  rrect: 'Rounded rectangle',
  circle: 'Circle',
  line: 'Line',
}

export function shapeTypeName(type: ShapeType): string {
  return TYPE_NAME[type]
}

/** "Polygon 3" for the third polygon. */
export function nextShapeName(shapes: readonly Shape[], type: ShapeType): string {
  return `${TYPE_NAME[type]} ${shapes.filter((s) => s.type === type).length + 1}`
}

export function replaceShape(shapes: readonly Shape[], shape: Shape): Shape[] {
  return shapes.map((s) => (s.id === shape.id ? shape : s))
}
