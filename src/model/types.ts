/** The Graphics.COLOR_* constants available on Garmin watches. */
export type ColorKey =
  | 'WHITE'
  | 'LT_GRAY'
  | 'DK_GRAY'
  | 'BLACK'
  | 'RED'
  | 'DK_RED'
  | 'ORANGE'
  | 'YELLOW'
  | 'GREEN'
  | 'DK_GREEN'
  | 'BLUE'
  | 'DK_BLUE'
  | 'PURPLE'
  | 'PINK'

/** A position on the design grid, [x, y]. One unit is one screen pixel. */
export type Point = [number, number]

interface ShapeBase {
  id: number
  name: string
  color: ColorKey
  /** Guides are drawn in the editor but left out of the generated code. */
  guide?: boolean
}

export interface PolygonShape extends ShapeBase {
  type: 'polygon'
  points: Point[]
}

export interface RectShape extends ShapeBase {
  type: 'rect'
  x: number
  y: number
  w: number
  h: number
}

export interface RoundRectShape extends ShapeBase {
  type: 'rrect'
  x: number
  y: number
  w: number
  h: number
  r: number
}

export interface CircleShape extends ShapeBase {
  type: 'circle'
  cx: number
  cy: number
  r: number
}

export interface LineShape extends ShapeBase {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
}

export type Shape = PolygonShape | RectShape | RoundRectShape | CircleShape | LineShape
export type ShapeType = Shape['type']

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** Just the geometry and colour of a shape: enough to draw it. */
export type Drawable = DistributiveOmit<Shape, 'id' | 'name' | 'guide'>

export type Tool = 'select' | ShapeType

export type ScreenShape = 'round' | 'semiround' | 'rectangle'

export interface Screen {
  width: number
  height: number
  shape: ScreenShape
}

/** What a saved file holds. */
export interface EditorDocument {
  screen: Screen
  shapes: Shape[]
}

export type CodeMode = 'grid' | 'px' | 'fn'

export interface Settings {
  zoom: number
  /** Snap step in design units; 0 turns snapping off. */
  snap: number
  grid: boolean
  background: ColorKey
  newColor: ColorKey
  refOpacity: number
  /** Draw the reference image above the shapes instead of under them. */
  refOnTop: boolean
  codeMode: CodeMode
  codeScope: 'all' | 'selected'
  colours: boolean
  fnName: string
}
