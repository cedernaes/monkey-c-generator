import { bounds, fmt, normRect, round2 } from './geometry.ts'
import type { CodeMode, Point, Shape } from './types.ts'

export interface CodeOptions {
  mode: CodeMode
  /** Add a dc.setColor() call whenever the colour changes. */
  colours: boolean
  /** Name of the function in 'fn' mode. */
  fnName: string
}

export const DEFAULT_FN_NAME = 'drawIcon'

export function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
}

/**
 * Monkey C that draws the shapes, in order. Guides are left out. Returns an
 * empty string when there is nothing to draw.
 *
 * - 'grid': design-grid coordinates through the gx()/gy()/sz() helpers
 * - 'px':   plain screen pixels
 * - 'fn':   a function drawing relative to (x, y) at scale s
 */
export function generateCode(shapes: readonly Shape[], options: CodeOptions): string {
  const list = shapes.filter((s) => !s.guide)
  if (list.length === 0) return ''

  const { mode } = options
  const box = mode === 'fn' ? bounds(list) : null
  const ox = box?.x0 ?? 0
  const oy = box?.y0 ?? 0

  const scaled = (v: number) => (round2(v) === 1 ? 's' : `${fmt(v)} * s`)
  const offset = (base: string, v: number) => {
    const d = round2(v)
    if (d === 0) return base
    return `${base} ${d < 0 ? '-' : '+'} ${scaled(Math.abs(d))}`
  }
  const X = (v: number) => (mode === 'grid' ? `gx(${fmt(v)})` : mode === 'px' ? fmt(v) : offset('x', v - ox))
  const Y = (v: number) => (mode === 'grid' ? `gy(${fmt(v)})` : mode === 'px' ? fmt(v) : offset('y', v - oy))
  const S = (v: number) => (mode === 'grid' ? `sz(${fmt(v)})` : mode === 'px' ? fmt(v) : scaled(v))
  const point = ([x, y]: Point) =>
    mode === 'px' ? `[${Math.floor(x + 0.5)}, ${Math.floor(y + 0.5)}]` : `[px(${X(x)}), px(${Y(y)})]`
  const penWidth = (w: number) =>
    mode === 'grid' ? `pen(${fmt(w)})` : mode === 'px' ? String(Math.max(1, Math.round(w))) : `px(${scaled(w)})`

  const lines: string[] = []
  let color: string | null = null
  for (const s of list) {
    if (options.colours && s.color !== color) {
      lines.push(`dc.setColor(Graphics.COLOR_${s.color}, Graphics.COLOR_TRANSPARENT);`)
      color = s.color
    }
    lines.push(`// ${s.name.replace(/[\r\n]+/g, ' ')}`)
    switch (s.type) {
      case 'polygon':
        lines.push('dc.fillPolygon([')
        s.points.forEach((p, i) => lines.push(`    ${point(p)}${i < s.points.length - 1 ? ',' : ''}`))
        lines.push(']);')
        break
      case 'rect': {
        const n = normRect(s)
        lines.push(`dc.fillRectangle(${X(n.x)}, ${Y(n.y)}, ${S(n.w)}, ${S(n.h)});`)
        break
      }
      case 'rrect': {
        const n = normRect(s)
        lines.push(`dc.fillRoundedRectangle(${X(n.x)}, ${Y(n.y)}, ${S(n.w)}, ${S(n.h)}, ${S(s.r)});`)
        break
      }
      case 'circle':
        lines.push(`dc.fillCircle(${X(s.cx)}, ${Y(s.cy)}, ${S(s.r)});`)
        break
      case 'line':
        lines.push(`dc.setPenWidth(${penWidth(s.width)});`)
        lines.push(`dc.drawLine(${X(s.x1)}, ${Y(s.y1)}, ${X(s.x2)}, ${Y(s.y2)});`)
        lines.push('dc.setPenWidth(1);')
        break
    }
  }

  if (!box) return lines.join('\n')
  const name = isValidIdentifier(options.fnName) ? options.fnName : DEFAULT_FN_NAME
  return [
    `//! ${fmt(box.x1 - box.x0)} x ${fmt(box.y1 - box.y0)} design units. Call it with the top-left`,
    `//! corner and the scale, e.g. ${name}(dc, gx(${fmt(ox)}), gy(${fmt(oy)}), _scale);`,
    `private function ${name}(dc as Dc, x as Numeric, y as Numeric, s as Numeric) as Void {`,
    ...lines.map((l) => `    ${l}`),
    '}',
  ].join('\n')
}

/** The helpers the 'grid' and 'fn' styles call, to paste into a WatchFace view. */
export const HELPERS_CODE = `// Design grid -> screen pixels. Set these in onLayout() so the design grid
// fits the real screen. On the screen you designed for, the scale is 1 and
// the offsets are 0.
private var _scale as Float = 1.0;
private var _ox as Float = 0.0;
private var _oy as Float = 0.0;

private function gx(v as Numeric) as Numeric {
    return _ox + v * _scale;
}

private function gy(v as Numeric) as Numeric {
    return _oy + v * _scale;
}

private function sz(v as Numeric) as Numeric {
    return v * _scale;
}

//! Round to whole pixels
private function px(v as Numeric) as Number {
    return (v + 0.5).toNumber();
}

//! Scaled line width, at least 1 px
private function pen(v as Numeric) as Number {
    var p = px(sz(v));
    return (p < 1) ? 1 : p;
}`
