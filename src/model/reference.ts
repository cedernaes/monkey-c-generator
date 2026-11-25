import type { Box } from './geometry.ts'
import type { Point, Screen } from './types.ts'

// The reference image is placed on the design grid like a picture in a frame:
// `x, y, w, h` is the frame, and `crop` says which part of the image fills it.

/** The visible part of the image, as fractions (0 to 1) of its width and height. */
export interface Crop {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Placement {
  x: number
  y: number
  w: number
  h: number
  crop: Crop
}

/** 'move': move and resize the image. 'crop': trim its edges. */
export type RefEditMode = 'move' | 'crop'

export type RefHandleKey = 'tl' | 'tr' | 'br' | 'bl' | 't' | 'r' | 'b' | 'l'

export interface RefHandle {
  key: RefHandleKey
  x: number
  y: number
}

/** Smallest width or height, in design units. */
const MIN_SIZE = 2

export const FULL_CROP: Crop = { x0: 0, y0: 0, x1: 1, y1: 1 }

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** The (cropped) image as large as fits on the screen, centred on it. */
export function fitPlacement(imageWidth: number, imageHeight: number, screen: Screen, crop: Crop = FULL_CROP): Placement {
  const cw = imageWidth * (crop.x1 - crop.x0)
  const ch = imageHeight * (crop.y1 - crop.y0)
  const scale = Math.min(screen.width / cw, screen.height / ch)
  const w = cw * scale
  const h = ch * scale
  return { x: (screen.width - w) / 2, y: (screen.height - h) / 2, w, h, crop }
}

/** Where the whole, uncropped image is. */
export function fullRect(p: Placement): Box {
  const w = p.w / (p.crop.x1 - p.crop.x0)
  const h = p.h / (p.crop.y1 - p.crop.y0)
  return { x: p.x - p.crop.x0 * w, y: p.y - p.crop.y0 * h, w, h }
}

/** Show the whole image again, at the same size and position. */
export function uncrop(p: Placement): Placement {
  return { ...fullRect(p), crop: FULL_CROP }
}

export function placementContains(p: Placement, pt: Point): boolean {
  return pt[0] >= p.x && pt[0] <= p.x + p.w && pt[1] >= p.y && pt[1] <= p.y + p.h
}

export function movePlacement(p: Placement, dx: number, dy: number): Placement {
  return { ...p, x: p.x + dx, y: p.y + dy }
}

/** Handles to drag: corners for resizing, corners and edges for cropping. */
export function refHandles(p: Placement, mode: RefEditMode): RefHandle[] {
  const corners: RefHandle[] = [
    { key: 'tl', x: p.x, y: p.y },
    { key: 'tr', x: p.x + p.w, y: p.y },
    { key: 'br', x: p.x + p.w, y: p.y + p.h },
    { key: 'bl', x: p.x, y: p.y + p.h },
  ]
  if (mode === 'move') return corners
  return [
    ...corners,
    { key: 't', x: p.x + p.w / 2, y: p.y },
    { key: 'r', x: p.x + p.w, y: p.y + p.h / 2 },
    { key: 'b', x: p.x + p.w / 2, y: p.y + p.h },
    { key: 'l', x: p.x, y: p.y + p.h / 2 },
  ]
}

export function hitRefHandle(p: Placement, mode: RefEditMode, pt: Point, tol: number): RefHandle | null {
  return refHandles(p, mode).find((h) => Math.abs(h.x - pt[0]) <= tol && Math.abs(h.y - pt[1]) <= tol) ?? null
}

/**
 * Drag a corner to resize. The opposite corner stays put. The image keeps its
 * proportions unless `free` is true.
 */
export function resizePlacement(start: Placement, key: RefHandleKey, pt: Point, free: boolean): Placement {
  const left = key.includes('l')
  const top = key.includes('t')
  const ax = left ? start.x + start.w : start.x
  const ay = top ? start.y + start.h : start.y
  let w = Math.max(MIN_SIZE, left ? ax - pt[0] : pt[0] - ax)
  let h = Math.max(MIN_SIZE, top ? ay - pt[1] : pt[1] - ay)
  if (!free) {
    const scale = Math.max(w / start.w, h / start.h)
    w = start.w * scale
    h = start.h * scale
  }
  return { ...start, x: left ? ax - w : ax, y: top ? ay - h : ay, w, h }
}

/**
 * Drag an edge or corner to crop. The image keeps its size and position; only
 * the part that shows changes, and it can't grow past the image.
 */
export function cropPlacement(start: Placement, key: RefHandleKey, pt: Point): Placement {
  const full = fullRect(start)
  let left = start.x
  let top = start.y
  let right = start.x + start.w
  let bottom = start.y + start.h
  if (key.includes('l')) left = clamp(pt[0], full.x, right - MIN_SIZE)
  if (key.includes('r')) right = clamp(pt[0], left + MIN_SIZE, full.x + full.w)
  if (key.includes('t')) top = clamp(pt[1], full.y, bottom - MIN_SIZE)
  if (key.includes('b')) bottom = clamp(pt[1], top + MIN_SIZE, full.y + full.h)
  return {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
    crop: {
      x0: (left - full.x) / full.w,
      x1: (right - full.x) / full.w,
      y0: (top - full.y) / full.h,
      y1: (bottom - full.y) / full.h,
    },
  }
}
