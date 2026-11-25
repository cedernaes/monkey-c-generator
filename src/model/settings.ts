import { isColorKey } from './palette.ts'
import type { Screen, Settings } from './types.ts'

export const DEFAULT_SETTINGS: Settings = {
  zoom: 4,
  snap: 0.5,
  grid: true,
  background: 'BLACK',
  newColor: 'BLACK',
  refOpacity: 0.5,
  refOnTop: false,
  codeMode: 'grid',
  codeScope: 'all',
  colours: true,
  fnName: 'drawIcon',
}

export const ZOOM_LEVELS = [1, 2, 3, 4, 5, 6, 8] as const
export const SNAP_STEPS = [1, 0.5, 0] as const

/** Settings read from storage, with anything missing or invalid replaced by the default. */
export function sanitizeSettings(value: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS }
  if (typeof value !== 'object' || value === null) return s
  const v = value as Record<string, unknown>
  if (typeof v.zoom === 'number' && (ZOOM_LEVELS as readonly number[]).includes(v.zoom)) s.zoom = v.zoom
  if (typeof v.snap === 'number' && (SNAP_STEPS as readonly number[]).includes(v.snap)) s.snap = v.snap
  if (typeof v.grid === 'boolean') s.grid = v.grid
  if (isColorKey(v.background)) s.background = v.background
  if (isColorKey(v.newColor)) s.newColor = v.newColor
  if (typeof v.refOpacity === 'number' && v.refOpacity > 0 && v.refOpacity <= 1) s.refOpacity = v.refOpacity
  if (typeof v.refOnTop === 'boolean') s.refOnTop = v.refOnTop
  if (v.codeMode === 'grid' || v.codeMode === 'px' || v.codeMode === 'fn') s.codeMode = v.codeMode
  if (v.codeScope === 'all' || v.codeScope === 'selected') s.codeScope = v.codeScope
  if (typeof v.colours === 'boolean') s.colours = v.colours
  if (typeof v.fnName === 'string') s.fnName = v.fnName
  return s
}

/** The largest zoom that keeps the drawing area around 900 px wide or less. */
export function fitZoom(screen: Screen): number {
  const fit = ZOOM_LEVELS.filter((z) => (Math.max(screen.width, screen.height) + 20) * z <= 900)
  return fit.length ? fit[fit.length - 1] : 1
}
