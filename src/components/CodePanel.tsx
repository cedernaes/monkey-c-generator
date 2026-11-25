import { useRef, useState } from 'react'
import { generateCode, HELPERS_CODE } from '../model/codegen.ts'
import type { CodeMode, Settings, Shape } from '../model/types.ts'

interface Props {
  shapes: Shape[]
  selected: Shape | null
  settings: Settings
  onSettings: (patch: Partial<Settings>) => void
}

function placeholder(list: Shape[], scope: Settings['codeScope']): string {
  if (scope === 'selected' && list.length === 0) return '// Select a shape to see its code.'
  if (list.length === 0) return '// Draw a shape to see its code here.'
  return '// Guides are left out of the code.'
}

export function CodePanel({ shapes, selected, settings, onSettings }: Props) {
  const list = settings.codeScope === 'selected' ? (selected ? [selected] : []) : shapes
  const code = generateCode(list, { mode: settings.codeMode, colours: settings.colours, fnName: settings.fnName })

  return (
    <section className="card" aria-labelledby="code-title">
      <h2 id="code-title">
        Monkey C
        <CopyButton text={code} />
      </h2>
      <div className="fields">
        <label className="field">
          Style
          <select value={settings.codeMode} onChange={(e) => onSettings({ codeMode: e.target.value as CodeMode })}>
            <option value="grid">Design grid: gx() / gy() / sz()</option>
            <option value="px">Screen pixels</option>
            <option value="fn">Function with an origin</option>
          </select>
        </label>
        <label className="field">
          Shapes
          <select
            value={settings.codeScope}
            onChange={(e) => onSettings({ codeScope: e.target.value === 'selected' ? 'selected' : 'all' })}
          >
            <option value="all">All shapes</option>
            <option value="selected">Selected shape</option>
          </select>
        </label>
        {settings.codeMode === 'fn' && (
          <label className="field">
            Function name
            <input type="text" spellCheck={false} value={settings.fnName} onChange={(e) => onSettings({ fnName: e.target.value.trim() })} />
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={settings.colours} onChange={(e) => onSettings({ colours: e.target.checked })} />
          Include colours
        </label>
      </div>
      <pre className="code" tabIndex={0} aria-label="Generated Monkey C code">
        {code || placeholder(list, settings.codeScope)}
      </pre>
      {settings.codeMode !== 'px' && (
        <details className="helpers">
          <summary>Helper functions this code calls</summary>
          <p className="note">Paste these into your WatchFace view once. On the screen size you designed for they draw at 1:1.</p>
          <div className="helpers-copy">
            <CopyButton text={HELPERS_CODE} label="Copy helpers" />
          </div>
          <pre className="code">{HELPERS_CODE}</pre>
        </details>
      )}
      <p className="note">The pixels in the drawing area are a close approximation of what the watch draws.</p>
    </section>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [status, setStatus] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  async function copy() {
    window.clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Copied')
    } catch {
      setStatus('Copy failed: select the code and press Ctrl+C')
    }
    timer.current = window.setTimeout(() => setStatus(null), 2000)
  }

  return (
    <button type="button" onClick={copy} disabled={!text}>
      {status ?? label}
    </button>
  )
}
