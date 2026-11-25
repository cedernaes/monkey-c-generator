import { describe, expect, it } from 'vitest'
import type { Shape } from '../model/types.ts'
import { editorReducer, initEditor, reorderShape } from './editor.ts'

const box: Shape = { id: 1, name: 'Box', color: 'BLACK', type: 'rect', x: 0, y: 0, w: 4, h: 4 }

describe('reorderShape', () => {
  // Drawing order: a (back), b, c, d (front)
  const shapes = ['a', 'b', 'c', 'd'].map((name, i): Shape => ({ ...box, id: i + 1, name }))
  const order = (list: Shape[]) => list.map((s) => s.name).join('')

  it('puts a shape just in front of another', () => {
    expect(order(reorderShape(shapes, 1, 3, 'front'))).toBe('bcad')
  })

  it('puts a shape just behind another', () => {
    expect(order(reorderShape(shapes, 4, 2, 'behind'))).toBe('adbc')
  })

  it('can bring a shape all the way to the front', () => {
    expect(order(reorderShape(shapes, 1, 4, 'front'))).toBe('bcda')
  })

  it('leaves the order alone when dropped on itself', () => {
    expect(order(reorderShape(shapes, 2, 2, 'front'))).toBe('abcd')
  })
})

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
