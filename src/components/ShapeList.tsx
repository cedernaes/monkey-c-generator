import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { HEX } from '../model/palette.ts'
import type { Shape } from '../model/types.ts'
import { shapeTypeName } from '../state/editor.ts'

/** Where a dragged shape lands relative to the row it is dropped on. */
type Place = 'front' | 'behind'

interface Props {
  shapes: Shape[]
  selectedId: number | null
  onSelect: (id: number) => void
  onReorder: (id: number, targetId: number, place: Place) => void
  onDuplicate: (id: number) => void
  onDelete: (id: number) => void
  onClear: () => void
  onLoadExamples: () => void
}

/** The top half of a row means "in front of it" (the list shows the front first). */
function placeOver(e: DragEvent<HTMLElement>): Place {
  const r = e.currentTarget.getBoundingClientRect()
  return e.clientY < r.top + r.height / 2 ? 'front' : 'behind'
}

export function ShapeList(props: Props) {
  const { shapes, selectedId, onSelect, onDuplicate, onDelete } = props

  // "Clear all" asks for a second click within 3 seconds.
  const [confirming, setConfirming] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Drag and drop: which row is being dragged, and where it would land.
  const [dragId, setDragId] = useState<number | null>(null)
  const [drop, setDrop] = useState<{ id: number; place: Place } | null>(null)

  function clickClear() {
    if (!confirming) {
      setConfirming(true)
      timer.current = window.setTimeout(() => setConfirming(false), 3000)
      return
    }
    window.clearTimeout(timer.current)
    setConfirming(false)
    props.onClear()
  }

  function endDrag() {
    setDragId(null)
    setDrop(null)
  }

  return (
    <section className="card" aria-labelledby="shapes-title">
      <h2 id="shapes-title">
        Shapes
        <button type="button" className={confirming ? 'danger' : undefined} disabled={!shapes.length} onClick={clickClear}>
          {confirming ? 'Click again to clear' : 'Clear all'}
        </button>
      </h2>
      <p className="note">The top of the list is in front: each shape covers the ones below it. Drag a shape to reorder.</p>
      {shapes.length === 0 ? (
        <div className="empty">
          <span>No shapes yet. Pick a tool on the left and draw on the screen.</span>
          <button type="button" onClick={props.onLoadExamples}>
            Load the examples
          </button>
        </div>
      ) : (
        <div
          className="list"
          role="listbox"
          aria-label="Shapes"
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrop(null)
          }}
        >
          {/* Shapes are stored back to front (drawing order); the list shows them front first. */}
          {[...shapes].reverse().map((s) => (
            <div
              key={s.id}
              className="row"
              role="option"
              aria-selected={s.id === selectedId}
              tabIndex={0}
              draggable
              data-dragging={dragId === s.id || undefined}
              data-drop={drop?.id === s.id && dragId !== s.id ? drop.place : undefined}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(s.id)
                }
              }}
              onDragStart={(e) => {
                setDragId(s.id)
                if (e.dataTransfer) {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', s.name) // Firefox only drags with data set
                }
              }}
              onDragOver={(e) => {
                if (dragId === null) return // something else, such as a file
                e.preventDefault()
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
                const place = placeOver(e)
                if (drop?.id !== s.id || drop.place !== place) setDrop({ id: s.id, place })
              }}
              onDrop={(e) => {
                if (dragId === null) return
                e.preventDefault()
                props.onReorder(dragId, s.id, placeOver(e))
                endDrag()
              }}
              onDragEnd={endDrag}
            >
              <span className="grip" aria-hidden="true" />
              <span className="swatch" style={{ background: HEX[s.color] }} />
              <span className="label">
                <span className="name">{s.name}</span>
                <span className="kind">{shapeTypeName(s.type)}</span>
                {s.guide && <span className="badge">Guide</span>}
              </span>
              <span className="row-actions" onClick={(e) => e.stopPropagation()}>
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
