import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { PALETTE } from '../model/palette.ts'
import type { ColorKey } from '../model/types.ts'

const COLUMNS = 7
const KEY_STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }

interface ColorPickerProps {
  /** Accessible name of the swatch group. */
  label: string
  value: ColorKey
  onChange: (color: ColorKey) => void
  /** Called after a swatch is clicked, when the choice is final. */
  onDone?: () => void
}

/** The Garmin colours as swatches, with the chosen colour's name and constant. */
export function ColorPicker({ label, value, onChange, onDone }: ColorPickerProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.max(0, PALETTE.findIndex((c) => c.key === value))
  const current = PALETTE[index]

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const step = KEY_STEP[e.key]
    if (step === undefined) return
    // Keep arrow keys here; elsewhere they nudge the selected shape.
    e.preventDefault()
    e.stopPropagation()
    const next = (index + step + PALETTE.length) % PALETTE.length
    onChange(PALETTE[next].key)
    buttons.current[next]?.focus()
  }

  return (
    <div className="color-picker">
      <div className="swatches" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
        {PALETTE.map((c, i) => (
          <button
            key={c.key}
            ref={(el) => {
              buttons.current[i] = el
            }}
            type="button"
            role="radio"
            className="swatch-button"
            aria-checked={c.key === value}
            aria-label={c.label}
            title={c.label}
            tabIndex={c.key === value ? 0 : -1}
            style={{ background: c.hex }}
            onClick={() => {
              onChange(c.key)
              onDone?.()
            }}
          />
        ))}
      </div>
      <span className="color-name">
        {current.label} · <code>COLOR_{current.key}</code>
      </span>
    </div>
  )
}

interface ColorMenuProps {
  label: string
  value: ColorKey
  onChange: (color: ColorKey) => void
}

/** A button showing the colour, which opens the swatches in a dropdown. */
export function ColorMenu({ label, value, onChange }: ColorMenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const current = PALETTE.find((c) => c.key === value) ?? PALETTE[0]

  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation() // don't also clear the shape selection
      setOpen(false)
      toggle.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="color-menu" ref={root}>
      <button
        ref={toggle}
        type="button"
        className="color-menu-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${label}: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="swatch" style={{ background: current.hex }} />
        {current.label}
      </button>
      {open && (
        <div className="color-menu-panel">
          <ColorPicker
            label={label}
            value={value}
            onChange={onChange}
            onDone={() => {
              setOpen(false)
              toggle.current?.focus()
            }}
          />
        </div>
      )}
    </div>
  )
}
