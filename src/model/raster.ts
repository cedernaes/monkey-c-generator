import { normRect } from './geometry.ts'
import { HEX } from './palette.ts'
import type { Drawable, Point } from './types.ts'

// Watches draw without anti-aliasing, so the editor previews shapes pixel by
// pixel. This is close to what the watch draws, though not guaranteed to match
// every edge pixel.

export type Put = (x: number, y: number) => void

export interface Size {
  width: number
  height: number
}

/** Fill the pixels whose centre lies inside the polygon (even-odd rule). */
export function fillPoly(pts: readonly Point[], size: Size, put: Put): void {
  if (pts.length < 3) return
  let minY = Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minY = Math.min(minY, p[1])
    maxY = Math.max(maxY, p[1])
  }
  const yEnd = Math.min(size.height - 1, Math.ceil(maxY))
  for (let y = Math.max(0, Math.floor(minY)); y <= yEnd; y++) {
    const cy = y + 0.5
    const xs: number[] = []
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i]
      const [x2, y2] = pts[(i + 1) % pts.length]
      if (y1 <= cy !== y2 <= cy) xs.push(x1 + ((cy - y1) * (x2 - x1)) / (y2 - y1))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k] - 0.5))
      const xb = Math.min(size.width, Math.ceil(xs[k + 1] - 0.5))
      for (let x = xa; x < xb; x++) put(x, y)
    }
  }
}

/** A 1 px line between two pixels. */
export function bresenham(x0: number, y0: number, x1: number, y1: number, put: Put): void {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const stepX = x0 < x1 ? 1 : -1
  const stepY = y0 < y1 ? 1 : -1
  let err = dx + dy
  const limit = dx - dy + 1
  for (let i = 0; i <= limit; i++) {
    put(x0, y0)
    if (x0 === x1 && y0 === y1) return
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += stepX
    }
    if (e2 <= dx) {
      err += dx
      y0 += stepY
    }
  }
}

const rnd = (v: number) => Math.floor(v + 0.5)

/** Call put for every pixel the shape covers. */
export function eachPixel(s: Drawable, size: Size, put: Put): void {
  const clipped: Put = (x, y) => {
    if (x >= 0 && y >= 0 && x < size.width && y < size.height) put(x, y)
  }
  switch (s.type) {
    case 'polygon':
      // Points are rounded to whole pixels, as px() does in the generated code.
      fillPoly(s.points.map(([x, y]): Point => [rnd(x), rnd(y)]), size, clipped)
      return
    case 'rect':
    case 'rrect': {
      const n = normRect(s)
      const x0 = rnd(n.x)
      const y0 = rnd(n.y)
      const x1 = rnd(n.x + n.w)
      const y1 = rnd(n.y + n.h)
      const rr = s.type === 'rrect' ? Math.max(0, Math.min(s.r, (x1 - x0) / 2, (y1 - y0) / 2)) : 0
      for (let y = Math.max(0, y0); y < Math.min(size.height, y1); y++) {
        for (let x = Math.max(0, x0); x < Math.min(size.width, x1); x++) {
          if (rr > 0) {
            const px = x + 0.5
            const py = y + 0.5
            const cx = Math.min(Math.max(px, x0 + rr), x1 - rr)
            const cy = Math.min(Math.max(py, y0 + rr), y1 - rr)
            if ((px - cx) ** 2 + (py - cy) ** 2 > rr * rr) continue
          }
          put(x, y)
        }
      }
      return
    }
    case 'circle': {
      const cx = rnd(s.cx)
      const cy = rnd(s.cy)
      const r = Math.max(0, s.r)
      const lim = Math.ceil(r)
      for (let dy = -lim; dy <= lim; dy++) {
        for (let dx = -lim; dx <= lim; dx++) {
          if (dx * dx + dy * dy <= r * r + r * 0.5) clipped(cx + dx, cy + dy)
        }
      }
      return
    }
    case 'line': {
      const w = Math.max(1, Math.round(s.width))
      if (w === 1) {
        bresenham(rnd(s.x1), rnd(s.y1), rnd(s.x2), rnd(s.y2), clipped)
        return
      }
      const dx = s.x2 - s.x1
      const dy = s.y2 - s.y1
      const len = Math.hypot(dx, dy) || 1
      const nx = (-dy / len) * (w / 2)
      const ny = (dx / len) * (w / 2)
      // A line runs through pixel centres.
      const a: Point = [s.x1 + 0.5, s.y1 + 0.5]
      const b: Point = [s.x2 + 0.5, s.y2 + 0.5]
      fillPoly(
        [
          [a[0] + nx, a[1] + ny],
          [b[0] + nx, b[1] + ny],
          [b[0] - nx, b[1] - ny],
          [a[0] - nx, a[1] - ny],
        ],
        size,
        clipped,
      )
      return
    }
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

/** RGBA pixels of the shapes drawn in order, on a transparent background. */
export function rasterize(shapes: readonly Drawable[], size: Size): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size.width * size.height * 4)
  for (const s of shapes) {
    const [r, g, b] = hexToRgb(HEX[s.color])
    eachPixel(s, size, (x, y) => {
      const i = (y * size.width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    })
  }
  return data
}
