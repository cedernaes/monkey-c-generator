import { describe, expect, it } from 'vitest'
import {
  anchorFor,
  applyHandle,
  bounds,
  coordWidth,
  formatCoord,
  hitTest,
  moveShape,
  parsePoints,
  snapTo,
} from './geometry.ts'
import type { Shape } from './types.ts'

const box: Shape = { id: 1, name: 'Box', color: 'BLACK', type: 'rect', x: 10, y: 10, w: 20, h: 10 }
const dot: Shape = { id: 2, name: 'Dot', color: 'RED', type: 'circle', cx: 20, cy: 15, r: 3 }
const tri: Shape = { id: 3, name: 'Tri', color: 'BLACK', type: 'polygon', points: [[0, 0], [4, 0], [0, 4]] }

describe('formatCoord', () => {
  it('always uses the same width', () => {
    const width = coordWidth(225, 1)
    const values = [5, 12.5, -10, 225, null].map((v) => formatCoord(v, 1, width))
    expect(values).toEqual(['   5.0', '  12.5', ' -10.0', ' 225.0', '     –'])
  })
})

describe('snapTo', () => {
  it('snaps to half pixels', () => {
    expect(snapTo(12.3, 0.5)).toBe(12.5)
    expect(snapTo(12.2, 0.5)).toBe(12)
  })

  it('only rounds to two decimals when snapping is off', () => {
    expect(snapTo(1.23456, 0)).toBe(1.23)
  })
})

describe('hitTest', () => {
  it('finds the topmost shape', () => {
    expect(hitTest([box, dot], [20.5, 15.5], 0)?.id).toBe(2)
  })

  it('finds nothing outside every shape', () => {
    expect(hitTest([box, dot], [50, 50], 1)).toBeNull()
  })
})

describe('dragging a rectangle corner', () => {
  it('keeps the opposite corner in place', () => {
    const anchor = anchorFor(box, 'br')
    expect(anchor).toEqual([10, 10])
    expect(applyHandle(box, 'br', anchor, [40, 30], 1)).toMatchObject({ x: 10, y: 10, w: 30, h: 20 })
  })

  it('flips the rectangle when dragged past the opposite corner', () => {
    expect(applyHandle(box, 'br', anchorFor(box, 'br'), [5, 5], 1)).toMatchObject({ x: 5, y: 5, w: 5, h: 5 })
  })
})

describe('moveShape', () => {
  it('moves every point of a polygon', () => {
    expect(moveShape(tri, 1, 2)).toMatchObject({ points: [[1, 2], [5, 2], [1, 6]] })
  })
})

describe('bounds', () => {
  it('covers every shape', () => {
    expect(bounds([box, dot])).toEqual({ x0: 10, y0: 10, x1: 30, y1: 20 })
  })
})

describe('parsePoints', () => {
  it('reads "x, y" lines and skips blank ones', () => {
    expect(parsePoints('1, 2\n\n3.5, 4\n-5, 6')).toEqual([[1, 2], [3.5, 4], [-5, 6]])
  })

  it('rejects a line without exactly two numbers', () => {
    expect(parsePoints('1, 2\n3\n5, 6')).toBeNull()
  })

  it('needs at least three points', () => {
    expect(parsePoints('1, 2\n3, 4')).toBeNull()
  })
})
