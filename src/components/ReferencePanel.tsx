import { useRef } from 'react'
import type { RefEditMode } from '../model/reference.ts'

interface Props {
  hasImage: boolean
  editMode: RefEditMode | null
  opacity: number
  onTop: boolean
  onPick: (file: File) => void
  onRemove: () => void
  /** null leaves edit mode. */
  onEditMode: (mode: RefEditMode | null) => void
  onFit: () => void
  onUncrop: () => void
  onOpacity: (opacity: number) => void
  onOnTop: (onTop: boolean) => void
}

export function ReferencePanel(props: Props) {
  const { hasImage, editMode } = props
  const input = useRef<HTMLInputElement>(null)

  return (
    <section className="card ref" aria-labelledby="ref-title">
      <h2 id="ref-title">Reference image</h2>
      {!hasImage && <p className="note">Load or paste an image to trace, such as a simulator screenshot.</p>}
      <div className="buttons">
        <button type="button" onClick={() => input.current?.click()}>
          {hasImage ? 'Replace…' : 'Load image…'}
        </button>
        {hasImage && (
          <button type="button" onClick={props.onRemove}>
            Remove
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) props.onPick(file)
          e.target.value = ''
        }}
      />

      {hasImage && (
        <>
          <button
            type="button"
            className="toggle"
            aria-pressed={editMode !== null}
            onClick={() => props.onEditMode(editMode ? null : 'move')}
          >
            {editMode ? 'Done adjusting' : 'Adjust image'}
          </button>
          {editMode ? (
            <>
              <div className="segmented" role="group" aria-label="What dragging does">
                <button type="button" aria-pressed={editMode === 'move'} onClick={() => props.onEditMode('move')}>
                  Move and resize
                </button>
                <button type="button" aria-pressed={editMode === 'crop'} onClick={() => props.onEditMode('crop')}>
                  Crop
                </button>
              </div>
              <div className="buttons">
                <button type="button" onClick={props.onFit}>
                  Fit to screen
                </button>
                <button type="button" onClick={props.onUncrop}>
                  Uncrop
                </button>
              </div>
            </>
          ) : (
            <p className="note">Locked in place. Choose Adjust image to move, resize or crop it.</p>
          )}
          <label className="field">
            Opacity
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round(props.opacity * 100)}
              onChange={(e) => props.onOpacity(Number(e.target.value) / 100)}
            />
          </label>
          <label className="check">
            <input type="checkbox" checked={props.onTop} onChange={(e) => props.onOnTop(e.target.checked)} />
            Show on top of shapes
          </label>
        </>
      )}
      <p className="note">The image stays on your device and isn't saved.</p>
    </section>
  )
}
