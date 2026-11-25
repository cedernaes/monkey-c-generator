import { describe, expect, it } from 'vitest'
import { cropPlacement, fitPlacement, fullRect, FULL_CROP, resizePlacement, uncrop } from './reference.ts'
import type { Placement } from './reference.ts'

const screen = { width: 215, height: 180, shape: 'semiround' as const }
const square = (x: number, y: number, size: number): Placement => ({ x, y, w: size, h: size, crop: FULL_CROP })

describe('fitPlacement', () => {
  it('fits a wide image to the screen width and centres it', () => {
    expect(fitPlacement(400, 200, screen)).toEqual({ x: 0, y: 36.25, w: 215, h: 107.5, crop: FULL_CROP })
  })

  it('fits only the cropped part', () => {
    const crop = { x0: 0, y0: 0, x1: 0.5, y1: 1 }
    expect(fitPlacement(400, 200, screen, crop)).toMatchObject({ w: 180, h: 180, x: 17.5, y: 0 })
  })
})

describe('resizePlacement', () => {
  const wide: Placement = { x: 0, y: 0, w: 100, h: 50, crop: FULL_CROP }

  it('keeps the proportions by default', () => {
    expect(resizePlacement(wide, 'br', [60, 10], false)).toMatchObject({ x: 0, y: 0, w: 60, h: 30 })
  })

  it('stretches freely when asked', () => {
    expect(resizePlacement(wide, 'br', [60, 10], true)).toMatchObject({ x: 0, y: 0, w: 60, h: 10 })
  })

  it('keeps the opposite corner in place', () => {
    const moved = { ...wide, x: 10, y: 10 }
    expect(resizePlacement(moved, 'tl', [30, 20], false)).toMatchObject({ x: 30, y: 20, w: 80, h: 40 })
  })
})

describe('cropPlacement', () => {
  it('trims an edge without moving or scaling the image', () => {
    const cropped = cropPlacement(square(0, 0, 100), 'l', [25, 50])
    expect(cropped).toMatchObject({ x: 25, y: 0, w: 75, h: 100 })
    expect(cropped.crop.x0).toBeCloseTo(0.25)
    expect(fullRect(cropped)).toEqual({ x: 0, y: 0, w: 100, h: 100 })
  })

  it("can't uncover more than the image", () => {
    const cropped = cropPlacement(square(0, 0, 100), 'l', [25, 50])
    expect(cropPlacement(cropped, 'l', [-40, 50])).toMatchObject({ x: 0, w: 100 })
  })

  it('crops two edges from a corner', () => {
    expect(cropPlacement(square(0, 0, 100), 'br', [80, 60])).toMatchObject({ x: 0, y: 0, w: 80, h: 60 })
  })
})

describe('uncrop', () => {
  it('shows the whole image at the same size and position', () => {
    const cropped = cropPlacement(cropPlacement(square(10, 10, 100), 'tl', [30, 40]), 'br', [90, 70])
    const whole = uncrop(cropped)
    expect(whole.crop).toEqual(FULL_CROP)
    for (const key of ['x', 'y', 'w', 'h'] as const) expect(whole[key]).toBeCloseTo(square(10, 10, 100)[key])
  })
})
