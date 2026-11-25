import { describe, expect, it } from 'vitest'
import type { Shape } from '../model/types.ts'
import { editorReducer, initEditor } from './editor.ts'

const box: Shape = { id: 1, name: 'Box', color: 'BLACK', type: 'rect', x: 0, y: 0, w: 4, h: 4 }

describe('editorReducer', () => {
  it('turns a whole drag into one undo step', () => {
    let s = initEditor([box])
    s = editorReducer(s, { type: 'preview', shapes: [{ ...box, x: 1 }] })
    s = editorReducer(s, { type: 'preview', shapes: [{ ...box, x: 2 }] })
    s = editorReducer(s, { type: 'commit' })
    expect(s.past).toHaveLength(1)

    s = editorReducer(s, { type: 'undo' })
    expect(s.shapes).toEqual([box])

    s = editorReducer(s, { type: 'redo' })
    expect(s.shapes[0]).toMatchObject({ x: 2 })
  })

  it('adds no undo step when nothing changed', () => {
    let s = initEditor([box])
    s = editorReducer(s, { type: 'preview', shapes: [{ ...box }] })
    s = editorReducer(s, { type: 'commit' })
    expect(s.past).toHaveLength(0)
  })

  it('clears the redo steps after a new change', () => {
    let s = initEditor([box])
    s = editorReducer(s, { type: 'set', shapes: [{ ...box, x: 5 }] })
    s = editorReducer(s, { type: 'undo' })
    s = editorReducer(s, { type: 'set', shapes: [{ ...box, x: 9 }] })
    expect(s.future).toHaveLength(0)
  })

  it('drops the selection when undo removes the selected shape', () => {
    let s = initEditor([])
    s = editorReducer(s, { type: 'set', shapes: [box], select: box.id })
    expect(s.selectedId).toBe(1)
    s = editorReducer(s, { type: 'undo' })
    expect(s.selectedId).toBeNull()
  })
})
