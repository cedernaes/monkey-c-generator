import type { ColorKey, Drawable, Point, Shape } from './types.ts'

export const round2 = (v: number): number => Math.round(v * 100) / 100

/** A number as it appears in code and fields: at most two decimals, no "-0". */
export function fmt(v: number): string {
  const r = round2(v)
  return String(Object.is(r, -0) ? 0 : r)
}

/**
 * A coordinate for the pointer readout, right-aligned in a fixed width so the
 * readout doesn't jump as the numbers change. null shows a dash.
 */
export function formatCoord(v: number | null, decimals: number, width: number): string {
  return (v === null ? '–' : v.toFixed(decimals)).padStart(width)
}

/** Width that fits every coordinate on a screen of this size, including the margin and a minus sign. */
export function coordWidth(maxValue: number, decimals: number): number {
  return Math.ceil(maxValue).toFixed(decimals).length + 1
}

/** Snap to the nearest multiple of step. A step of 0 only rounds to 2 decimals. */
export function snapTo(v: number, step: number): number {
  return step > 0 ? round2(Math.round(v / step) * step) : round2(v)
}

/** Points as "x, y" lines, the way the points field shows them. */
export function formatPoints(points: readonly Point[]): string {
  return points.map(([x, y]) => `${fmt(x)}, ${fmt(y)}`).join('\n')
}

/** "x, y" lines -> points; null unless every line has two numbers and there are at least 3. */
export function parsePoints(text: string): Point[] | null {
  const points: Point[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const nums = line.match(/-?\d+(?:\.\d+)?/g)
    if (!nums || nums.length !== 2) return null
    points.push([parseFloat(nums[0]), parseFloat(nums[1])])
  }
  return points.length >= 3 ? points : null
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** The same box with a non-negative width and height. */
export function normRect(b: Box): Box {
  return { x: Math.min(b.x, b.x + b.w), y: Math.min(b.y, b.y + b.h), w: Math.abs(b.w), h: Math.abs(b.h) }
}

/** Distance from p to the segment a-b. */
export function segDist(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

export function pointInPoly(pts: readonly Point[], p: Point): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Index of the polygon edge (points[i] to points[i + 1]) nearest to p within tol, or -1. */
export function nearestEdge(pts: readonly Point[], p: Point, tol: number): number {
  let best = -1
  let bestDist = tol
  for (let i = 0; i < pts.length; i++) {
    const d = segDist(p, pts[i], pts[(i + 1) % pts.length])
    if (d <= bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

// Circles are centred on a pixel, so their centre on the grid is (cx + 0.5, cy + 0.5).
const circleCentre = (s: { cx: number; cy: number }): Point => [s.cx + 0.5, s.cy + 0.5]

export function contains(s: Drawable, p: Point, tol: number): boolean {
  switch (s.type) {
    case 'polygon':
      return pointInPoly(s.points, p) || nearestEdge(s.points, p, tol) >= 0
    case 'rect':
    case 'rrect': {
      const n = normRect(s)
      return p[0] >= n.x - tol && p[0] <= n.x + n.w + tol && p[1] >= n.y - tol && p[1] <= n.y + n.h + tol
    }
    case 'circle': {
      const [cx, cy] = circleCentre(s)
      return Math.hypot(p[0] - cx, p[1] - cy) <= s.r + tol
    }
    case 'line':
      return segDist(p, [s.x1, s.y1], [s.x2, s.y2]) <= s.width / 2 + tol
  }
}

/** The topmost shape under p. Guides can be selected too. */
export function hitTest(shapes: readonly Shape[], p: Point, tol: number): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (contains(shapes[i], p, tol)) return shapes[i]
  }
  return null
}

export type HandleKey = number | 'tl' | 'tr' | 'br' | 'bl' | 'radius' | 'start' | 'end'

export interface Handle {
  key: HandleKey
  x: number
  y: number
}

export function handlesOf(s: Shape): Handle[] {
  switch (s.type) {
    case 'polygon':
      return s.points.map((p, i) => ({ key: i, x: p[0], y: p[1] }))
    case 'rect':
    case 'rrect': {
      const n = normRect(s)
      return [
        { key: 'tl', x: n.x, y: n.y },
        { key: 'tr', x: n.x + n.w, y: n.y },
        { key: 'br', x: n.x + n.w, y: n.y + n.h },
        { key: 'bl', x: n.x, y: n.y + n.h },
      ]
    }
    case 'circle': {
      const [cx, cy] = circleCentre(s)
      return [{ key: 'radius', x: cx + s.r, y: cy }]
    }
    case 'line':
      return [
        { key: 'start', x: s.x1, y: s.y1 },
        { key: 'end', x: s.x2, y: s.y2 },
      ]
  }
}

export function hitHandle(s: Shape, p: Point, tol: number): Handle | null {
  return handlesOf(s).find((h) => Math.abs(h.x - p[0]) <= tol && Math.abs(h.y - p[1]) <= tol) ?? null
}

/** For a rectangle corner: the opposite corner, which stays put while dragging. */
export function anchorFor(s: Shape, key: HandleKey): Point | null {
  if (s.type !== 'rect' && s.type !== 'rrect') return null
  const n = normRect(s)
  switch (key) {
    case 'tl':
      return [n.x + n.w, n.y + n.h]
    case 'tr':
      return [n.x, n.y + n.h]
    case 'br':
      return [n.x, n.y]
    case 'bl':
      return [n.x + n.w, n.y]
    default:
      return null
  }
}

/** The shape after dragging one of its handles to p. */
export function applyHandle(s: Shape, key: HandleKey, anchor: Point | null, p: Point, snapStep: number): Shape {
  switch (s.type) {
    case 'polygon': {
      if (typeof key !== 'number') return s
      const points = s.points.slice()
      points[key] = p
      return { ...s, points }
    }
    case 'rect':
    case 'rrect':
      if (!anchor) return s
      return {
        ...s,
        x: Math.min(anchor[0], p[0]),
        y: Math.min(anchor[1], p[1]),
        w: Math.abs(p[0] - anchor[0]),
        h: Math.abs(p[1] - anchor[1]),
      }
    case 'circle': {
      const [cx, cy] = circleCentre(s)
      return { ...s, r: snapTo(Math.hypot(p[0] - cx, p[1] - cy), snapStep) }
    }
    case 'line':
      return key === 'start' ? { ...s, x1: p[0], y1: p[1] } : { ...s, x2: p[0], y2: p[1] }
  }
}

export function moveShape(s: Shape, dx: number, dy: number): Shape {
  switch (s.type) {
    case 'polygon':
      return { ...s, points: s.points.map(([x, y]): Point => [round2(x + dx), round2(y + dy)]) }
    case 'rect':
    case 'rrect':
      return { ...s, x: round2(s.x + dx), y: round2(s.y + dy) }
    case 'circle':
      return { ...s, cx: round2(s.cx + dx), cy: round2(s.cy + dy) }
    case 'line':
      return { ...s, x1: round2(s.x1 + dx), y1: round2(s.y1 + dy), x2: round2(s.x2 + dx), y2: round2(s.y2 + dy) }
  }
}

/** A shape dragged out from a to b with one of the drag tools. */
export function createShape(
  type: 'rect' | 'rrect' | 'circle' | 'line',
  a: Point,
  b: Point,
  color: ColorKey,
  snapStep: number,
): Drawable {
  const box = { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) }
  switch (type) {
    case 'rect':
      return { type, color, ...box }
    case 'rrect':
      return { type, color, ...box, r: 3 }
    case 'circle':
      return { type, color, cx: a[0], cy: a[1], r: snapTo(Math.hypot(b[0] - a[0], b[1] - a[1]), snapStep) }
    case 'line':
      return { type, color, x1: a[0], y1: a[1], x2: b[0], y2: b[1], width: 2 }
  }
}

/** True for a shape with no area or length, such as a click without a drag. */
export function isEmptyShape(s: Drawable): boolean {
  switch (s.type) {
    case 'polygon':
      return s.points.length < 3
    case 'rect':
    case 'rrect':
      return s.w === 0 || s.h === 0
    case 'circle':
      return s.r === 0
    case 'line':
      return s.x1 === s.x2 && s.y1 === s.y2
  }
}

export interface Bounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function bounds(list: readonly Drawable[]): Bounds {
  const b: Bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  const add = (x: number, y: number) => {
    b.x0 = Math.min(b.x0, x)
    b.y0 = Math.min(b.y0, y)
    b.x1 = Math.max(b.x1, x)
    b.y1 = Math.max(b.y1, y)
  }
  for (const s of list) {
    switch (s.type) {
      case 'polygon':
        s.points.forEach(([x, y]) => add(x, y))
        break
      case 'rect':
      case 'rrect': {
        const n = normRect(s)
        add(n.x, n.y)
        add(n.x + n.w, n.y + n.h)
        break
      }
      case 'circle':
        add(s.cx - s.r, s.cy - s.r)
        add(s.cx + s.r, s.cy + s.r)
        break
      case 'line':
        add(s.x1, s.y1)
        add(s.x2, s.y2)
        break
    }
  }
  return b
}
