import { useRef } from 'react'
import type { Tool } from '../model/types.ts'
import { TOOLS } from '../tools.ts'

interface ToolRailProps {
  tool: Tool
  onTool: (tool: Tool) => void
}

export function ToolRail({ tool, onTool }: ToolRailProps) {
  return (
    <nav className="tools" aria-label="Drawing tools">
      {TOOLS.map((t) => (
        <button key={t.tool} type="button" className="tool" aria-pressed={tool === t.tool} onClick={() => onTool(t.tool)}>
          {t.label}
          <kbd>{t.key}</kbd>
        </button>
      ))}
    </nav>
  )
}

interface ReferencePanelProps {
  hasImage: boolean
  opacity: number
  onPick: (file: File) => void
  onRemove: () => void
  onOpacity: (opacity: number) => void
}

export function ReferencePanel({ hasImage, opacity, onPick, onRemove, onOpacity }: ReferencePanelProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <section className="card ref" aria-labelledby="ref-title">
      <h2 id="ref-title">Reference image</h2>
      <p className="note">
        Load or paste an image to trace, such as a simulator screenshot. It is stretched to the screen and isn't saved.
      </p>
      <div className="buttons">
        <button type="button" onClick={() => input.current?.click()}>
          Load image…
        </button>
        {hasImage && (
          <button type="button" onClick={onRemove}>
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
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
      {hasImage && (
        <label className="field">
          Opacity
          <input
            type="range"
            min={5}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacity(Number(e.target.value) / 100)}
          />
        </label>
      )}
    </section>
  )
}
