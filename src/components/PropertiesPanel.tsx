import { PALETTE } from '../model/palette.ts'
import type { ColorKey, Shape } from '../model/types.ts'
import { shapeTypeName } from '../state/editor.ts'
import { NumberField, PointsField, TextField } from './fields.tsx'

interface FieldDef {
  key: string
  label: string
  value: number
  min?: number
  apply: (v: number) => Shape
}

function fieldsOf(s: Shape): FieldDef[] {
  switch (s.type) {
    case 'polygon':
      return []
    case 'rect':
      return [
        { key: 'x', label: 'X', value: s.x, apply: (v) => ({ ...s, x: v }) },
        { key: 'y', label: 'Y', value: s.y, apply: (v) => ({ ...s, y: v }) },
        { key: 'w', label: 'Width', value: s.w, apply: (v) => ({ ...s, w: v }) },
        { key: 'h', label: 'Height', value: s.h, apply: (v) => ({ ...s, h: v }) },
      ]
    case 'rrect':
      return [
        { key: 'x', label: 'X', value: s.x, apply: (v) => ({ ...s, x: v }) },
        { key: 'y', label: 'Y', value: s.y, apply: (v) => ({ ...s, y: v }) },
        { key: 'w', label: 'Width', value: s.w, apply: (v) => ({ ...s, w: v }) },
        { key: 'h', label: 'Height', value: s.h, apply: (v) => ({ ...s, h: v }) },
        { key: 'r', label: 'Corner radius', value: s.r, min: 0, apply: (v) => ({ ...s, r: v }) },
      ]
    case 'circle':
      return [
        { key: 'cx', label: 'Centre x', value: s.cx, apply: (v) => ({ ...s, cx: v }) },
        { key: 'cy', label: 'Centre y', value: s.cy, apply: (v) => ({ ...s, cy: v }) },
        { key: 'r', label: 'Radius', value: s.r, min: 0, apply: (v) => ({ ...s, r: v }) },
      ]
    case 'line':
      return [
        { key: 'x1', label: 'Start x', value: s.x1, apply: (v) => ({ ...s, x1: v }) },
        { key: 'y1', label: 'Start y', value: s.y1, apply: (v) => ({ ...s, y1: v }) },
        { key: 'x2', label: 'End x', value: s.x2, apply: (v) => ({ ...s, x2: v }) },
        { key: 'y2', label: 'End y', value: s.y2, apply: (v) => ({ ...s, y2: v }) },
        { key: 'width', label: 'Width', value: s.width, min: 1, apply: (v) => ({ ...s, width: v }) },
      ]
  }
}

function ColorSelect({ value, onChange }: { value: ColorKey; onChange: (c: ColorKey) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as ColorKey)}>
      {PALETTE.map((c) => (
        <option key={c.key} value={c.key}>
          {c.label}
        </option>
      ))}
    </select>
  )
}

interface Props {
  shape: Shape | null
  newColor: ColorKey
  onNewColor: (color: ColorKey) => void
  /** 'preview' while typing; 'commit' for a finished change. */
  onChange: (shape: Shape, mode: 'preview' | 'commit') => void
  onCommit: () => void
}

export function PropertiesPanel({ shape, newColor, onNewColor, onChange, onCommit }: Props) {
  if (!shape) {
    return (
      <section className="card" aria-labelledby="props-title">
        <h2 id="props-title">Properties</h2>
        <p className="note">Select a shape to edit its colour and exact coordinates.</p>
        <label className="field">
          Colour for new shapes
          <ColorSelect value={newColor} onChange={onNewColor} />
        </label>
      </section>
    )
  }

  return (
    <section className="card" aria-labelledby="props-title">
      <h2 id="props-title">{shapeTypeName(shape.type)}</h2>
      <div className="fields">
        <TextField wide label="Name" value={shape.name} onChange={(name) => onChange({ ...shape, name }, 'preview')} onCommit={onCommit} />
        <label className="field">
          Colour
          <ColorSelect
            value={shape.color}
            onChange={(color) => {
              onNewColor(color)
              onChange({ ...shape, color }, 'commit')
            }}
          />
        </label>
        {fieldsOf(shape).map((f) => (
          <NumberField
            key={f.key}
            label={f.label}
            value={f.value}
            min={f.min}
            onChange={(v) => onChange(f.apply(v), 'preview')}
            onCommit={onCommit}
          />
        ))}
        {shape.type === 'polygon' && (
          <PointsField points={shape.points} onChange={(points) => onChange({ ...shape, points }, 'preview')} onCommit={onCommit} />
        )}
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={shape.guide === true}
          onChange={(e) => onChange({ ...shape, guide: e.target.checked || undefined }, 'commit')}
        />
        Guide: show it here but leave it out of the code
      </label>
    </section>
  )
}
