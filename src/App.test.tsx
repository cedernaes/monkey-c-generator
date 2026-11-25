// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App.tsx'

// Lets React know updates inside act() are deliberate.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(async () => {
  localStorage.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(<App />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const rows = () => Array.from(container.querySelectorAll<HTMLElement>('.row'))
const code = () => container.querySelector('pre.code')?.textContent ?? ''
const pressed = () => container.querySelector('.tool[aria-pressed="true"]')?.textContent ?? ''

describe('App', () => {
  it('opens with the example shapes and their code', () => {
    expect(container.querySelector('h1')?.textContent).toBe('Watch Shape Editor')
    expect(container.querySelector('.privacy')?.textContent).toContain('Nothing you draw or load is sent to a server')
    expect(rows()).toHaveLength(9)
    expect(code()).toContain('dc.fillPolygon([')
    // The frame shapes are guides, so they are not in the code.
    expect(code()).not.toContain('Frame outline')
  })

  it('shows the properties of the shape you pick', async () => {
    await act(async () => rows()[7].click())
    expect(container.textContent).toContain('Points, one "x, y" per line')
  })

  it('changes a shape colour with the swatches', async () => {
    await act(async () => rows()[3].click()) // Battery body (example), black
    const red = container.querySelector<HTMLButtonElement>('[role="radiogroup"][aria-label="Colour"] [aria-label="Red"]')
    await act(async () => red?.click())
    expect(red?.getAttribute('aria-checked')).toBe('true')
    expect(code()).toContain('dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);')
  })

  it('switches tools with the keyboard', async () => {
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })))
    expect(pressed()).toContain('Polygon')
  })

  it('deletes the selected shape and undoes it', async () => {
    await act(async () => rows()[8].click())
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' })))
    expect(rows()).toHaveLength(8)
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })))
    expect(rows()).toHaveLength(9)
  })
})
