import { isColorKey } from './palette.ts'
import type { EditorDocument, Point, Screen, Shape } from './types.ts'

export const DOCUMENT_FORMAT = 'watch-shape-editor'
export const DOCUMENT_VERSION = 1

export function serializeDocument(doc: EditorDocument): string {
  return JSON.stringify({ format: DOCUMENT_FORMAT, version: DOCUMENT_VERSION, screen: doc.screen, shapes: doc.shapes }, null, 2)
}

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Read a saved file. Throws an Error that explains what is wrong. */
export function parseDocument(text: string): EditorDocument {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('The file is not valid JSON.')
  }
  if (!isObject(data) || data.format !== DOCUMENT_FORMAT) {
    throw new Error('This is not a Watch Shape Editor file.')
  }
  if (typeof data.version !== 'number' || data.version > DOCUMENT_VERSION) {
    throw new Error('This file was saved by a newer version of the editor.')
  }
  const screen = parseScreen(data.screen)
  if (!Array.isArray(data.shapes)) throw new Error('The file has no list of shapes.')
  // Ids are reassigned so they are always unique.
  const shapes = data.shapes.map((v, i) => ({ ...parseShape(v, i), id: i + 1 }))
  return { screen, shapes }
}

function parseScreen(v: unknown): Screen {
  if (!isObject(v)) throw new Error('The file has no screen size.')
  const { width, height, shape } = v
  const valid = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 16 && n <= 2000
  if (!valid(width) || !valid(height)) throw new Error('The screen size must be whole numbers between 16 and 2000.')
  if (shape !== 'round' && shape !== 'semiround' && shape !== 'rectangle') {
    throw new Error(`Unknown screen shape "${String(shape)}".`)
  }
  return { width, height, shape }
}

function parseShape(v: unknown, index: number): Shape {
  const where = `Shape ${index + 1}`
  if (!isObject(v)) throw new Error(`${where} is not an object.`)
  const num = (key: string): number => {
    const n = v[key]
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${where}: "${key}" must be a number.`)
    return n
  }
  if (!isColorKey(v.color)) throw new Error(`${where}: unknown colour "${String(v.color)}".`)
  const base = {
    id: index + 1,
    name: typeof v.name === 'string' && v.name ? v.name : `Shape ${index + 1}`,
    color: v.color,
    ...(v.guide === true ? { guide: true } : {}),
  }
  switch (v.type) {
    case 'polygon': {
      if (!Array.isArray(v.points) || v.points.length < 3) throw new Error(`${where}: a polygon needs at least 3 points.`)
      const points = v.points.map((p): Point => {
        if (!Array.isArray(p) || p.length !== 2 || !p.every((n) => typeof n === 'number' && Number.isFinite(n))) {
          throw new Error(`${where}: every point must be [x, y].`)
        }
        return [p[0], p[1]]
      })
      return { ...base, type: 'polygon', points }
    }
    case 'rect':
      return { ...base, type: 'rect', x: num('x'), y: num('y'), w: num('w'), h: num('h') }
    case 'rrect':
      return { ...base, type: 'rrect', x: num('x'), y: num('y'), w: num('w'), h: num('h'), r: num('r') }
    case 'circle':
      return { ...base, type: 'circle', cx: num('cx'), cy: num('cy'), r: num('r') }
    case 'line':
      return { ...base, type: 'line', x1: num('x1'), y1: num('y1'), x2: num('x2'), y2: num('y2'), width: num('width') }
    default:
      throw new Error(`${where}: unknown type "${String(v.type)}".`)
  }
}
