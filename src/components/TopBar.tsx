import { useRef, useState } from 'react'
import { presetFor, SCREEN_PRESETS, screenLabel } from '../model/palette.ts'
import { SNAP_STEPS, ZOOM_LEVELS } from '../model/settings.ts'
import type { Screen, ScreenShape, Settings } from '../model/types.ts'
import { ColorMenu } from './ColorPicker.tsx'

interface Props {
  screen: Screen
  onScreen: (screen: Screen) => void
  settings: Settings
  onSettings: (patch: Partial<Settings>) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onOpen: (file: File) => void
  onSave: () => void
  message: string | null
}

const CUSTOM = 'custom'

/** The AGPL asks that people using the app over a network can get its source. */
const SOURCE_URL = 'https://github.com/cedernaes/monkey-c-generator'

export function TopBar(props: Props) {
  const { screen, settings, onSettings } = props
  const fileInput = useRef<HTMLInputElement>(null)
  const preset = presetFor(screen)
  const [customOpen, setCustomOpen] = useState(false)
  const showCustom = customOpen || !preset

  return (
    <header className="bar">
      <div className="title">
        <h1>Watch Shape Editor</h1>
        <span className="sub">
          {screenLabel(screen)} design grid · 1 unit = 1 px ·{' '}
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">
            Source (AGPL-3.0)
          </a>
        </span>
        <p className="privacy">
          Private: everything runs in your browser. Nothing you draw or load is sent to a server, and your drawing is
          only saved in this browser.
        </p>
      </div>

      <div className="controls">
        <label className="ctl">
          Screen
          <select
            value={showCustom ? CUSTOM : preset?.id}
            onChange={(e) => {
              const next = SCREEN_PRESETS.find((p) => p.id === e.target.value)
              setCustomOpen(!next)
              if (next) props.onScreen(next.screen)
            }}
          >
            {SCREEN_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value={CUSTOM}>Custom…</option>
          </select>
        </label>
        {showCustom && <CustomScreen screen={screen} onScreen={props.onScreen} />}

        <label className="ctl">
          Zoom
          <select value={settings.zoom} onChange={(e) => onSettings({ zoom: Number(e.target.value) })}>
            {ZOOM_LEVELS.map((z) => (
              <option key={z} value={z}>
                {z}×
              </option>
            ))}
          </select>
        </label>
        <label className="ctl">
          Snap
          <select value={settings.snap} onChange={(e) => onSettings({ snap: Number(e.target.value) })}>
            {SNAP_STEPS.map((s) => (
              <option key={s} value={s}>
                {s === 0 ? 'Off' : `${s} px`}
              </option>
            ))}
          </select>
        </label>
        <div className="ctl">
          Background
          <ColorMenu
            label="Background colour"
            value={settings.background}
            onChange={(background) => onSettings({ background })}
          />
        </div>
        <label className="check">
          <input type="checkbox" checked={settings.grid} onChange={(e) => onSettings({ grid: e.target.checked })} />
          Pixel grid
        </label>

        <div className="group">
          <button type="button" title="Undo (Ctrl+Z)" disabled={!props.canUndo} onClick={props.onUndo}>
            Undo
          </button>
          <button type="button" title="Redo (Ctrl+Shift+Z)" disabled={!props.canRedo} onClick={props.onRedo}>
            Redo
          </button>
        </div>
        <div className="group">
          <button type="button" onClick={() => fileInput.current?.click()}>
            Open…
          </button>
          <button type="button" onClick={props.onSave}>
            Save
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) props.onOpen(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>
      {props.message && (
        <p className="message" role="status">
          {props.message}
        </p>
      )}
    </header>
  )
}

function CustomScreen({ screen, onScreen }: { screen: Screen; onScreen: (screen: Screen) => void }) {
  const size = (label: string, key: 'width' | 'height') => (
    <label className="ctl">
      {label}
      <input
        type="number"
        className="size"
        min={16}
        max={2000}
        step={1}
        defaultValue={screen[key]}
        key={`${key}-${screen[key]}`}
        onBlur={(e) => {
          const v = Number(e.target.value)
          if (Number.isInteger(v) && v >= 16 && v <= 2000) onScreen({ ...screen, [key]: v })
          else e.target.value = String(screen[key])
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </label>
  )
  return (
    <>
      {size('W', 'width')}
      {size('H', 'height')}
      <label className="ctl">
        Shape
        <select value={screen.shape} onChange={(e) => onScreen({ ...screen, shape: e.target.value as ScreenShape })}>
          <option value="round">Round</option>
          <option value="semiround">Semi-round</option>
          <option value="rectangle">Rectangle</option>
        </select>
      </label>
    </>
  )
}
