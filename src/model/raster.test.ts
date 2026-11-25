import { describe, expect, it } from 'vitest'
import { eachPixel, rasterize } from './raster.ts'
import type { Drawable } from './types.ts'

const size = { width: 20, height: 20 }

function pixelsOf(shape: Drawable): string[] {
  const out: string[] = []
  eachPixel(shape, size, (x, y) => out.push(`${x},${y}`))
  return out.sort()
}

describe('eachPixel', () => {
  const rect: Drawable = { type: 'rect', color: 'BLACK', x: 2, y: 3, w: 4, h: 2 }

  it('fills a rectangle exactly', () => {
    expect(pixelsOf(rect)).toHaveLength(8)
  })

  it('fills a square polygon like the same rectangle', () => {
    const square: Drawable = { type: 'polygon', color: 'BLACK', points: [[2, 3], [6, 3], [6, 5], [2, 5]] }
    expect(pixelsOf(square)).toEqual(pixelsOf(rect))
  })

  it('clips shapes to the screen', () => {
    expect(pixelsOf({ type: 'rect', color: 'BLACK', x: -5, y: -5, w: 10, h: 10 })).toHaveLength(25)
  })

  it('draws a 1 px line pixel by pixel', () => {
    expect(pixelsOf({ type: 'line', color: 'BLACK', x1: 0, y1: 0, x2: 4, y2: 0, width: 1 })).toEqual(
      ['0,0', '1,0', '2,0', '3,0', '4,0'],
    )
  })

  it('draws a symmetric circle', () => {
    const pixels = pixelsOf({ type: 'circle', color: 'BLACK', cx: 10, cy: 10, r: 2 })
    expect(pixels).toContain('12,10')
    expect(pixels).toContain('8,10')
    expect(pixels).toContain('10,12')
    expect(pixels).not.toContain('12,12')
  })

  it('leaves the corners of a rounded rectangle empty', () => {
    const pixels = pixelsOf({ type: 'rrect', color: 'BLACK', x: 0, y: 0, w: 10, h: 10, r: 3 })
    expect(pixels).not.toContain('0,0')
    expect(pixels).toContain('5,0')
    expect(pixels).toContain('5,5')
  })
})

describe('rasterize', () => {
  it('paints later shapes over earlier ones', () => {
    const data = rasterize(
      [
        { type: 'rect', color: 'WHITE', x: 0, y: 0, w: 2, h: 2 },
        { type: 'rect', color: 'RED', x: 1, y: 1, w: 1, h: 1 },
      ],
      { width: 2, height: 2 },
    )
    expect(Array.from(data.slice(0, 4))).toEqual([255, 255, 255, 255]) // (0, 0)
    expect(Array.from(data.slice(12, 16))).toEqual([255, 0, 0, 255]) // (1, 1)
  })
})
