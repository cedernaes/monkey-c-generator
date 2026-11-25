import type { RefEditMode } from './model/reference.ts'
import type { Tool } from './model/types.ts'

export interface ToolInfo {
  tool: Tool
  label: string
  /** Keyboard shortcut. */
  key: string
  hint: string
}

export const TOOLS: readonly ToolInfo[] = [
  {
    tool: 'select',
    label: 'Select and move',
    key: 'V',
    hint: 'Click a shape to select it, drag to move it, drag a handle to reshape it. Alt-click a polygon point to remove it; double-click an edge to add one. Arrow keys nudge.',
  },
  {
    tool: 'polygon',
    label: 'Polygon',
    key: 'P',
    hint: 'Click to add points. Click the first point, double-click or press Enter to finish. Esc cancels.',
  },
  { tool: 'rect', label: 'Rectangle', key: 'R', hint: 'Drag to draw a rectangle.' },
  {
    tool: 'rrect',
    label: 'Rounded rectangle',
    key: 'U',
    hint: 'Drag to draw a rounded rectangle, then set its corner radius on the right.',
  },
  { tool: 'circle', label: 'Circle', key: 'C', hint: 'Drag outwards from the centre.' },
  { tool: 'line', label: 'Line', key: 'L', hint: 'Drag to draw a line, then set its width on the right.' },
]

export function toolForKey(key: string): Tool | undefined {
  return TOOLS.find((t) => t.key.toLowerCase() === key.toLowerCase())?.tool
}

export function hintFor(tool: Tool): string {
  return TOOLS.find((t) => t.tool === tool)?.hint ?? ''
}

export const REF_EDIT_HINTS: Record<RefEditMode, string> = {
  move: 'Drag the image to move it and drag a corner to resize it (hold Shift to stretch). Arrow keys nudge it. Press Esc when done.',
  crop: 'Drag an edge or corner to crop the image. Press Esc when done.',
}
