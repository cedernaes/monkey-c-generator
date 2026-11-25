import { handlesOf, normRect } from '../model/geometry.ts'
import { HEX } from '../model/palette.ts'
import { fullRect, refHandles } from '../model/reference.ts'
import type { Placement, RefEditMode } from '../model/reference.ts'
import type { ColorKey, Point, Screen, Shape } from '../model/types.ts'

/** A loaded reference image and where it sits on the design grid. */
export interface SceneReference {
  image: HTMLImageElement
  placement: Placement
}

/** Design units shown around the screen, so shapes can reach past its edge. */
export const MARGIN = 10

/** Selection and draft colour. The drawing area is dark in both themes. */
const OVERLAY = '#4d8dff'

/** Design units -> CSS pixels on the canvas. */
export const toView = (v: number, zoom: number): number => (v + MARGIN) * zoom
/** CSS pixels on the canvas -> design units. */
export const fromView = (v: number, zoom: number): number => v / zoom - MARGIN

export function viewSize(screen: Screen, zoom: number): { width: number; height: number } {
  return { width: (screen.width + 2 * MARGIN) * zoom, height: (screen.height + 2 * MARGIN) * zoom }
}

/** Outline of the part of the screen the watch can show. */
export function screenPath(screen: Screen, zoom: number): Path2D {
  const path = new Path2D()
  const x0 = toView(0, zoom)
  const y0 = toView(0, zoom)
  const w = screen.width * zoom
  const h = screen.height * zoom
  if (screen.shape === 'rectangle') {
    path.rect(x0, y0, w, h)
    return path
  }
  const cx = x0 + w / 2
  const cy = y0 + h / 2
  if (screen.shape === 'round') {
    path.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2)
    return path
  }
  // Semi-round: a circle as wide as the screen, cut flat at the top and bottom.
  const r = w / 2
  const a = Math.asin(Math.min(1, h / 2 / r))
  path.moveTo(cx + r * Math.cos(a), cy - r * Math.sin(a))
  path.arc(cx, cy, r, -a, a)
  path.arc(cx, cy, r, Math.PI - a, Math.PI + a)
  path.closePath()
  return path
}

export interface Scene {
  screen: Screen
  zoom: number
  background: ColorKey
  /** The shapes rasterised at one pixel per design unit. */
  layer: CanvasImageSource
  reference: SceneReference | null
  refOpacity: number
  refOnTop: boolean
  /** Set while the reference image is being adjusted. */
  refEdit: RefEditMode | null
  grid: boolean
  selected: Shape | null
  draft: Point[] | null
  cursor: Point | null
  showCursor: boolean
}

export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { screen, zoom } = scene
  const { width, height } = viewSize(screen, zoom)
  const x0 = toView(0, zoom)
  const y0 = toView(0, zoom)
  const w = screen.width * zoom
  const h = screen.height * zoom

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = HEX[scene.background]
  ctx.fillRect(x0, y0, w, h)

  // The reference image goes under the shapes, or over them when asked and
  // while it is being adjusted.
  const ref = scene.reference
  const refAbove = scene.refOnTop || scene.refEdit !== null
  if (ref && !refAbove) drawReference(ctx, ref, zoom, scene.refOpacity, scene.refEdit)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(scene.layer, x0, y0, w, h)
  if (ref && refAbove) drawReference(ctx, ref, zoom, scene.refOpacity, scene.refEdit)

  // Dim everything outside the screen: the watch can't show it.
  const outline = screenPath(screen, zoom)
  const mask = new Path2D()
  mask.rect(0, 0, width, height)
  mask.addPath(outline)
  ctx.fillStyle = 'rgba(11, 12, 14, 0.8)'
  ctx.fill(mask, 'evenodd')
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.lineWidth = 1
  ctx.stroke(outline)

  if (scene.grid && zoom >= 4) drawGrid(ctx, screen, zoom)
  drawOverlay(ctx, scene)
  if (ref && scene.refEdit) drawReferenceFrame(ctx, ref.placement, zoom, scene.refEdit)
}

function drawReference(
  ctx: CanvasRenderingContext2D,
  ref: SceneReference,
  zoom: number,
  alpha: number,
  edit: RefEditMode | null,
): void {
  const { image, placement: p } = ref
  const iw = image.naturalWidth
  const ih = image.naturalHeight
  ctx.save()
  ctx.imageSmoothingEnabled = true
  if (edit === 'crop') {
    // Show what is cropped away faintly, so it can be brought back.
    const full = fullRect(p)
    ctx.globalAlpha = alpha * 0.3
    ctx.drawImage(image, toView(full.x, zoom), toView(full.y, zoom), full.w * zoom, full.h * zoom)
  }
  ctx.globalAlpha = alpha
  ctx.drawImage(
    image,
    p.crop.x0 * iw,
    p.crop.y0 * ih,
    (p.crop.x1 - p.crop.x0) * iw,
    (p.crop.y1 - p.crop.y0) * ih,
    toView(p.x, zoom),
    toView(p.y, zoom),
    p.w * zoom,
    p.h * zoom,
  )
  ctx.restore()
}

function drawReferenceFrame(ctx: CanvasRenderingContext2D, p: Placement, zoom: number, mode: RefEditMode): void {
  const v = (n: number) => toView(n, zoom)
  ctx.save()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = OVERLAY
  if (mode === 'crop') {
    const full = fullRect(p)
    ctx.setLineDash([2, 3])
    ctx.strokeRect(v(full.x), v(full.y), full.w * zoom, full.h * zoom)
  }
  ctx.setLineDash([6, 3])
  ctx.strokeRect(v(p.x), v(p.y), p.w * zoom, p.h * zoom)
  ctx.setLineDash([])
  for (const h of refHandles(p, mode)) drawHandle(ctx, v(h.x), v(h.y), false)
  ctx.restore()
}

function drawGrid(ctx: CanvasRenderingContext2D, screen: Screen, zoom: number): void {
  const minor = new Path2D()
  const major = new Path2D()
  const line = (p: Path2D, ax: number, ay: number, bx: number, by: number) => {
    p.moveTo(ax, ay)
    p.lineTo(bx, by)
  }
  for (let i = 0; i <= screen.width; i++) {
    const x = Math.round(toView(i, zoom)) + 0.5
    line(i % 10 === 0 ? major : minor, x, toView(0, zoom), x, toView(screen.height, zoom))
  }
  for (let j = 0; j <= screen.height; j++) {
    const y = Math.round(toView(j, zoom)) + 0.5
    line(j % 10 === 0 ? major : minor, toView(0, zoom), y, toView(screen.width, zoom), y)
  }
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(128, 140, 160, 0.16)'
  ctx.stroke(minor)
  ctx.strokeStyle = 'rgba(128, 140, 160, 0.4)'
  ctx.stroke(major)
}

function outlineOf(s: Shape, zoom: number): Path2D {
  const v = (n: number) => toView(n, zoom)
  const path = new Path2D()
  switch (s.type) {
    case 'polygon':
      s.points.forEach(([x, y], i) => (i ? path.lineTo(v(x), v(y)) : path.moveTo(v(x), v(y))))
      path.closePath()
      break
    case 'rect':
    case 'rrect': {
      const n = normRect(s)
      const r = s.type === 'rrect' ? Math.max(0, Math.min(s.r, n.w / 2, n.h / 2)) : 0
      path.roundRect(v(n.x), v(n.y), n.w * zoom, n.h * zoom, r * zoom)
      break
    }
    case 'circle':
      path.arc(v(s.cx + 0.5), v(s.cy + 0.5), Math.max(0, s.r) * zoom, 0, Math.PI * 2)
      break
    case 'line':
      path.moveTo(v(s.x1 + 0.5), v(s.y1 + 0.5))
      path.lineTo(v(s.x2 + 0.5), v(s.y2 + 0.5))
      break
  }
  return path
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, strong: boolean): void {
  const r = strong ? 5 : 4
  ctx.fillStyle = strong ? OVERLAY : '#ffffff'
  ctx.strokeStyle = OVERLAY
  ctx.lineWidth = 1.5
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.strokeRect(x - r, y - r, r * 2, r * 2)
}

function drawOverlay(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { zoom, selected, draft, cursor } = scene
  const v = (n: number) => toView(n, zoom)
  ctx.save()
  if (selected) {
    ctx.strokeStyle = OVERLAY
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 3])
    ctx.stroke(outlineOf(selected, zoom))
    ctx.setLineDash([])
    for (const h of handlesOf(selected)) drawHandle(ctx, v(h.x), v(h.y), false)
  }
  if (draft) {
    ctx.strokeStyle = OVERLAY
    ctx.lineWidth = 1.5
    ctx.beginPath()
    draft.forEach(([x, y], i) => (i ? ctx.lineTo(v(x), v(y)) : ctx.moveTo(v(x), v(y))))
    if (cursor) ctx.lineTo(v(cursor[0]), v(cursor[1]))
    ctx.stroke()
    // The first point turns solid once clicking it would close the polygon.
    draft.forEach(([x, y], i) => drawHandle(ctx, v(x), v(y), i === 0 && draft.length >= 3))
  }
  if (cursor && scene.showCursor) {
    ctx.fillStyle = OVERLAY
    ctx.beginPath()
    ctx.arc(v(cursor[0]), v(cursor[1]), 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
