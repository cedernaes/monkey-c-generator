import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { fmt, formatPoints, parsePoints } from '../model/geometry.ts'
import type { Point } from '../model/types.ts'

// Fields keep their own text while focused, so half-typed values such as "-"
// or "1." aren't overwritten. Valid values are applied as you type and become
// an undo step when the field loses focus.

const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') e.currentTarget.blur()
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  onCommit: () => void
  min?: number
}

export function NumberField({ label, value, onChange, onCommit, min }: NumberFieldProps) {
  const [text, setText] = useState<string | null>(null)
  return (
    <label className="field">
      {label}
      <input
        type="number"
        step="any"
        min={min}
        value={text ?? fmt(value)}
        onFocus={() => setText(fmt(value))}
        onChange={(e) => {
          setText(e.target.value)
          const v = parseFloat(e.target.value)
          if (Number.isFinite(v) && (min === undefined || v >= min)) onChange(v)
        }}
        onBlur={() => {
          setText(null)
          onCommit()
        }}
        onKeyDown={blurOnEnter}
      />
    </label>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  onCommit: () => void
  wide?: boolean
}

export function TextField({ label, value, onChange, onCommit, wide }: TextFieldProps) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      {label}
      <input
        type="text"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={blurOnEnter}
      />
    </label>
  )
}

interface PointsFieldProps {
  points: Point[]
  onChange: (points: Point[]) => void
  onCommit: () => void
}

export function PointsField({ points, onChange, onCommit }: PointsFieldProps) {
  const [text, setText] = useState<string | null>(null)
  const current = text ?? formatPoints(points)
  const invalid = text !== null && parsePoints(text) === null
  return (
    <>
      <label className="field wide">
        Points, one "x, y" per line
        <textarea
          spellCheck={false}
          value={current}
          aria-invalid={invalid}
          onFocus={() => setText(formatPoints(points))}
          onChange={(e) => {
            setText(e.target.value)
            const parsed = parsePoints(e.target.value)
            if (parsed) onChange(parsed)
          }}
          onBlur={() => {
            setText(null)
            onCommit()
          }}
        />
      </label>
      {invalid && <p className="warn">Each line needs two numbers, like 12, 34, and a polygon needs at least 3 points.</p>}
      {!invalid && points.length > 64 && <p className="warn">Garmin's fillPolygon() takes at most 64 points.</p>}
    </>
  )
}
