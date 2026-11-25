import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import {
  anchorFor,
  applyHandle,
  createShape,
  hitHandle,
  hitTest,
  isEmptyShape,
  moveShape,
  nearestEdge,
  snapTo,
} from '../model/geometry.ts'
import type { HandleKey } from '../model/geometry.ts'
import { rasterize } from '../model/raster.ts'
import { cropPlacement, hitRefHandle, movePlacement, placementContains, resizePlacement } from '../model/reference.ts'
import type { Placement, RefEditMode, RefHandleKey } from '../model/reference.ts'
import type { ColorKey, Drawable, Point, Screen, Shape, Tool } from '../model/types.ts'
import { drawScene, fromView, viewSize } from '../render/scene.ts'
import type { SceneReference } from '../render/scene.ts'
import { replaceShape } from '../state/editor.ts'

export interface EditorCanvasProps {
  screen: Screen
  shapes: Shape[]
  selected: Shape | null
  tool: Tool
  zoom: number
  snap: number
  grid: boolean
  background: ColorKey
  newColor: ColorKey
  draft: Point[] | null
  cursor: Point | null
  reference: SceneReference | null
  refOpacity: number
  refOnTop: boolean
  /** While set, the pointer adjusts the reference image instead of the shapes. */
  refEdit: RefEditMode | null
  onReference: (placement: Placement) => void
  onCursor: (p: Point | null) => void
  onSelect: (id: number | null) => void
  /** 'preview' while dragging; 'commit' for a finished change. */
  onShapes: (shapes: Shape[], mode: 'preview' | 'commit') => void
  onCommit: () => void
  onCreate: (shape: Drawable) => void
  onDraft: (points: Point[] | null) => void
  onFinishPolygon: () => void
}

type Drag =
  | { kind: 'move'; start: Point; orig: Shape }
  | { kind: 'handle'; id: number; key: HandleKey; anchor: Point | null }
  | { kind: 'create'; type: 'rect' | 'rrect' | 'circle' | 'line'; start: Point }
  | { kind: 'ref-move'; start: Point; orig: Placement }
  | { kind: 'ref-handle'; key: RefHandleKey; orig: Placement }

const RESIZE_CURSOR: Record<RefHandleKey, string> = {
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  t: 'ns-resize',
  b: 'ns-resize',
  l: 'ew-resize',
  r: 'ew-resize',
}

// Hit distances, in CSS pixels on screen
const HANDLE_TOLERANCE = 7
const SHAPE_TOLERANCE = 4
const EDGE_TOLERANCE = 6

export function EditorCanvas(props: EditorCanvasProps) {
  const { screen, shapes, selected, tool, zoom, snap, draft, cursor, newColor, reference, refEdit } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<Drag | null>(null)
  const [creating, setCreating] = useState<Drawable | null>(null)
  const [hoverCursor, setHoverCursor] = useState('default')

  // Only follow the pointer in the raster while a polygon is being drawn.
  const draftCursor = draft ? cursor : null

  const layer = useMemo(() => {
    const extra: Drawable[] = []
    if (creating) extra.push(creating)
    if (draft && draft.length >= 2) {
      extra.push({ type: 'polygon', color: newColor, points: draftCursor ? [...draft, draftCursor] : draft })
    }
    const size = { width: screen.width, height: screen.height }
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const image = ctx.createImageData(size.width, size.height)
      image.data.set(rasterize([...shapes, ...extra], size))
      ctx.putImageData(image, 0, 0)
    }
    return canvas
  }, [shapes, creating, draft, draftCursor, newColor, screen.width, screen.height])

  const { width, height } = viewSize(screen, zoom)

  // Redraw after every render; the scene is small.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const bw = Math.round(width * dpr)
    const bh = Math.round(height * dpr)
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawScene(ctx, {
      screen,
      zoom,
      background: props.background,
      layer,
      reference,
      refOpacity: props.refOpacity,
      refOnTop: props.refOnTop,
      refEdit,
      grid: props.grid,
      selected: tool === 'select' && !refEdit ? selected : null,
      draft,
      cursor,
      showCursor: tool !== 'select' && !refEdit,
    })
  })

  const tol = (cssPixels: number) => cssPixels / zoom

  function toGrid(e: ReactPointerEvent<HTMLCanvasElement> | ReactMouseEvent<HTMLCanvasElement>): Point {
    const r = e.currentTarget.getBoundingClientRect()
    return [fromView(e.clientX - r.left, zoom), fromView(e.clientY - r.top, zoom)]
  }

  const snapPoint = (p: Point): Point => [snapTo(p[0], snap), snapTo(p[1], snap)]

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0) return
    const raw = toGrid(e)
    const p = snapPoint(raw)
    e.currentTarget.setPointerCapture(e.pointerId)

    // Adjusting the reference image: the shapes are left alone.
    if (refEdit) {
      if (!reference) return
      const placement = reference.placement
      const handle = hitRefHandle(placement, refEdit, raw, tol(HANDLE_TOLERANCE))
      if (handle) drag.current = { kind: 'ref-handle', key: handle.key, orig: placement }
      else if (placementContains(placement, raw)) drag.current = { kind: 'ref-move', start: p, orig: placement }
      return
    }

    if (tool === 'select') {
      const handle = selected ? hitHandle(selected, raw, tol(HANDLE_TOLERANCE)) : null
      if (selected && handle) {
        const key = handle.key
        if (e.altKey && selected.type === 'polygon' && typeof key === 'number' && selected.points.length > 3) {
          const points = selected.points.filter((_, i) => i !== key)
          props.onShapes(replaceShape(shapes, { ...selected, points }), 'commit')
          return
        }
        drag.current = { kind: 'handle', id: selected.id, key, anchor: anchorFor(selected, key) }
        return
      }
      const hit = hitTest(shapes, raw, tol(SHAPE_TOLERANCE))
      props.onSelect(hit ? hit.id : null)
      if (hit) drag.current = { kind: 'move', start: p, orig: hit }
      return
    }

    if (tool === 'polygon') {
      if (!draft) {
        props.onDraft([p])
      } else if (draft.length >= 3 && Math.hypot(raw[0] - draft[0][0], raw[1] - draft[0][1]) <= tol(HANDLE_TOLERANCE)) {
        props.onFinishPolygon()
      } else {
        const last = draft[draft.length - 1]
        if (last[0] !== p[0] || last[1] !== p[1]) props.onDraft([...draft, p])
      }
      return
    }

    drag.current = { kind: 'create', type: tool, start: p }
    setCreating(createShape(tool, p, p, newColor, snap))
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const raw = toGrid(e)
    const p = snapPoint(raw)
    props.onCursor(p)

    const d = drag.current
    if (d?.kind === 'move') {
      props.onShapes(replaceShape(shapes, moveShape(d.orig, p[0] - d.start[0], p[1] - d.start[1])), 'preview')
    } else if (d?.kind === 'handle') {
      const s = shapes.find((x) => x.id === d.id)
      if (s) props.onShapes(replaceShape(shapes, applyHandle(s, d.key, d.anchor, p, snap)), 'preview')
    } else if (d?.kind === 'create') {
      setCreating(createShape(d.type, d.start, p, newColor, snap))
    } else if (d?.kind === 'ref-move') {
      props.onReference(movePlacement(d.orig, p[0] - d.start[0], p[1] - d.start[1]))
    } else if (d?.kind === 'ref-handle') {
      props.onReference(
        refEdit === 'crop' ? cropPlacement(d.orig, d.key, p) : resizePlacement(d.orig, d.key, p, e.shiftKey),
      )
    }

    if (refEdit && reference) {
      if (d) return
      const handle = hitRefHandle(reference.placement, refEdit, raw, tol(HANDLE_TOLERANCE))
      if (handle) setHoverCursor(RESIZE_CURSOR[handle.key])
      else setHoverCursor(placementContains(reference.placement, raw) ? 'move' : 'default')
    } else if (tool === 'select') {
      if (d) setHoverCursor('grabbing')
      else if (selected && hitHandle(selected, raw, tol(HANDLE_TOLERANCE))) setHoverCursor('pointer')
      else if (hitTest(shapes, raw, tol(SHAPE_TOLERANCE))) setHoverCursor('move')
      else setHoverCursor('default')
    }
  }

  function onPointerUp() {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.kind === 'create') {
      const shape = creating
      setCreating(null)
      if (shape && !isEmptyShape(shape)) props.onCreate(shape)
      return
    }
    // The reference image isn't part of the drawing, so it has no undo steps.
    if (d.kind === 'ref-move' || d.kind === 'ref-handle') return
    props.onCommit()
  }

  function onDoubleClick(e: ReactMouseEvent<HTMLCanvasElement>) {
    if (refEdit) return
    const raw = toGrid(e)
    if (tool === 'polygon' && draft) {
      props.onFinishPolygon()
      return
    }
    if (tool === 'select' && selected?.type === 'polygon') {
      const i = nearestEdge(selected.points, raw, tol(EDGE_TOLERANCE))
      if (i >= 0) {
        const points = [...selected.points]
        points.splice(i + 1, 0, snapPoint(raw))
        props.onShapes(replaceShape(shapes, { ...selected, points }), 'commit')
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="editor-canvas"
      style={{ width, height, cursor: refEdit || tool === 'select' ? hoverCursor : 'crosshair' }}
      aria-label="Drawing area for the watch screen"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        if (!drag.current) props.onCursor(null)
      }}
      onDoubleClick={onDoubleClick}
    />
  )
}
