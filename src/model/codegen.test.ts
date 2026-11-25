import { describe, expect, it } from 'vitest'
import { generateCode } from './codegen.ts'
import type { CodeOptions } from './codegen.ts'
import type { Shape } from './types.ts'

const box: Shape = { id: 1, name: 'Box', color: 'BLACK', type: 'rect', x: 2, y: 3, w: 4, h: 2 }
const arrow: Shape = { id: 2, name: 'Arrow', color: 'RED', type: 'polygon', points: [[10, 10], [14.5, 12], [10, 14]] }

const options = (o: Partial<CodeOptions> = {}): CodeOptions => ({ mode: 'grid', colours: false, fnName: 'drawIcon', ...o })

describe('generateCode', () => {
  it('uses the design-grid helpers', () => {
    expect(generateCode([box], options())).toBe('// Box\ndc.fillRectangle(gx(2), gy(3), sz(4), sz(2));')
  })

  it('rounds polygon points to whole pixels in screen-pixel mode', () => {
    expect(generateCode([arrow], options({ mode: 'px' }))).toBe(
      ['// Arrow', 'dc.fillPolygon([', '    [10, 10],', '    [15, 12],', '    [10, 14]', ']);'].join('\n'),
    )
  })

  it('sets the colour only when it changes', () => {
    const code = generateCode([box, { ...box, id: 3, name: 'Box 2' }, arrow], options({ colours: true }))
    expect(code.match(/setColor/g)).toHaveLength(2)
    expect(code.split('\n')[0]).toBe('dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);')
  })

  it('draws relative to the top-left corner in function mode', () => {
    const code = generateCode([box], options({ mode: 'fn' }))
    expect(code).toContain('private function drawIcon(dc as Dc, x as Numeric, y as Numeric, s as Numeric) as Void {')
    expect(code).toContain('    dc.fillRectangle(x, y, 4 * s, 2 * s);')
    expect(code).toContain('drawIcon(dc, gx(2), gy(3), _scale);')
  })

  it('indents every polygon point inside a function', () => {
    const code = generateCode([arrow], options({ mode: 'fn' }))
    expect(code).toContain('        [px(x), px(y)],')
    expect(code).toContain('        [px(x + 4.5 * s), px(y + 2 * s)],')
  })

  it('falls back to drawIcon for a name Monkey C would reject', () => {
    expect(generateCode([box], options({ mode: 'fn', fnName: '2fast' }))).toContain('function drawIcon(')
  })

  it('wraps a line in a pen width and resets it', () => {
    const line: Shape = { id: 4, name: 'Rule', color: 'BLACK', type: 'line', x1: 0, y1: 5, x2: 10, y2: 5, width: 2 }
    expect(generateCode([line], options())).toBe(
      '// Rule\ndc.setPenWidth(pen(2));\ndc.drawLine(gx(0), gy(5), gx(10), gy(5));\ndc.setPenWidth(1);',
    )
  })

  it('leaves guides out', () => {
    expect(generateCode([{ ...box, guide: true }], options())).toBe('')
  })
})
