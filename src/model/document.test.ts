import { describe, expect, it } from 'vitest'
import { parseDocument, serializeDocument } from './document.ts'
import { sampleDocument } from './samples.ts'

const fileWith = (shapes: unknown[]) =>
  JSON.stringify({ format: 'watch-shape-editor', version: 1, screen: { width: 215, height: 180, shape: 'semiround' }, shapes })

describe('parseDocument', () => {
  it('reads back what it saves', () => {
    const doc = sampleDocument()
    expect(parseDocument(serializeDocument(doc))).toEqual(doc)
  })

  it('rejects text that is not JSON', () => {
    expect(() => parseDocument('{')).toThrow('not valid JSON')
  })

  it('rejects JSON from other programs', () => {
    expect(() => parseDocument('{"hello": 1}')).toThrow('not a Watch Shape Editor file')
  })

  it('names the shape with a bad colour', () => {
    const text = fileWith([{ type: 'rect', color: 'TEAL', x: 0, y: 0, w: 1, h: 1 }])
    expect(() => parseDocument(text)).toThrow('Shape 1: unknown colour "TEAL"')
  })

  it('names the missing field', () => {
    const text = fileWith([{ type: 'circle', color: 'RED', cx: 1, cy: 1 }])
    expect(() => parseDocument(text)).toThrow('Shape 1: "r" must be a number')
  })

  it('gives every shape a unique id', () => {
    const text = fileWith([
      { id: 7, type: 'rect', color: 'RED', x: 0, y: 0, w: 1, h: 1 },
      { id: 7, type: 'rect', color: 'RED', x: 2, y: 0, w: 1, h: 1 },
    ])
    expect(parseDocument(text).shapes.map((s) => s.id)).toEqual([1, 2])
  })
})
