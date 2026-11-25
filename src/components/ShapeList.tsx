import { useEffect, useRef, useState } from 'react'
import { HEX } from '../model/palette.ts'
import type { Shape } from '../model/types.ts'
import { shapeTypeName } from '../state/editor.ts'

interface Props {
  shapes: Shape[]
  selectedId: number | null
  onSelect: (id: number) => void
  onMove: (index: number, delta: -1 | 1) => void
  onDuplicate: (id: number) => void
  onDelete: (id: number) => void
  onClear: () => void
  onLoadExamples: () => void
}

export function ShapeList({ shapes, selectedId, onSelect, onMove, onDuplicate, onDelete, onClear, onLoadExamples }: Props) {
  // "Clear all" asks for a second click within 3 seconds.
  const [confirming, setConfirming] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function clickClear() {
    if (!confirming) {
      setConfirming(true)
      timer.current = window.setTimeout(() => setConfirming(false), 3000)
      return
    }
    window.clearTimeout(timer.current)
    setConfirming(false)
    onClear()
  }

  return (
    <section className="card" aria-labelledby="shapes-title">
      <h2 id="shapes-title">
        Shapes
        <button type="button" className={confirming ? 'danger' : undefined} disabled={!shapes.length} onClick={clickClear}>
          {confirming ? 'Click again to clear' : 'Clear all'}
        </button>
      </h2>
      <p className="note">Drawn from top to bottom, so later shapes cover earlier ones.</p>
      {shapes.length === 0 ? (
        <div className="empty">
          <span>No shapes yet. Pick a tool on the left and draw on the screen.</span>
          <button type="button" onClick={onLoadExamples}>
            Load the examples
          </button>
        </div>
      ) : (
        <div className="list" role="listbox" aria-label="Shapes">
          {shapes.map((s, i) => (
            <div
              key={s.id}
              className="row"
              role="option"
              aria-selected={s.id === selectedId}
              tabIndex={0}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(s.id)
                }
              }}
            >
              <span className="swatch" style={{ background: HEX[s.color] }} />
              <span className="label">
                <span className="name">{s.name}</span>
                <span className="kind">{shapeTypeName(s.type)}</span>
                {s.guide && <span className="badge">Guide</span>}
              </span>
              <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                <RowButton text="↑" title="Draw earlier" name={s.name} disabled={i === 0} onClick={() => onMove(i, -1)} />
                <RowButton text="↓" title="Draw later" name={s.name} disabled={i === shapes.length - 1} onClick={() => onMove(i, 1)} />
                <RowButton text="⧉" title="Duplicate" name={s.name} onClick={() => onDuplicate(s.id)} />
                <RowButton text="×" title="Delete" name={s.name} onClick={() => onDelete(s.id)} />
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

interface RowButtonProps {
  text: string
  title: string
  name: string
  disabled?: boolean
  onClick: () => void
}

function RowButton({ text, title, name, disabled, onClick }: RowButtonProps) {
  return (
    <button type="button" title={title} aria-label={`${title}: ${name}`} disabled={disabled} onClick={onClick}>
      {text}
    </button>
  )
}
