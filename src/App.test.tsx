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
const names = () => rows().map((r) => r.querySelector('.name')?.textContent)
const row = (name: string) => {
  const found = rows().find((r) => r.querySelector('.name')?.textContent === name)
  if (!found) throw new Error(`No shape named ${name} in the list`)
  return found
}
const code = () => container.querySelector('pre.code')?.textContent ?? ''
const pressed = () => container.querySelector('.tool[aria-pressed="true"]')?.textContent ?? ''

// jsdom has no real drag and drop, so drag events are sent by hand. Its rows
// have no size, so clientY -1 is the top half of a row and 1 the bottom half.
function drag(type: string, target: Element, clientY = 0) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    clientY: { value: clientY },
    dataTransfer: { value: { setData: () => {}, effectAllowed: 'all', dropEffect: 'none' } },
  })
  target.dispatchEvent(event)
}

describe('App', () => {
  it('opens with the example shapes and their code', () => {
    expect(container.querySelector('h1')?.textContent).toBe('Watch Shape Editor')
    expect(container.querySelector('.privacy')?.textContent).toContain('Nothing you draw or load is sent to a server')
    expect(rows()).toHaveLength(9)
    expect(code()).toContain('dc.fillPolygon([')
    // The frame shapes are guides, so they are not in the code.
    expect(code()).not.toContain('Frame outline')
  })

  it('lists the front-most shape first and keeps the code back to front', async () => {
    expect(names()[0]).toBe('Bell clapper (example)')
    expect(names().at(-1)).toBe('Frame outline')
    expect(container.querySelector('[title="Bring forward"], [title="Send backward"]')).toBeNull()

    await act(async () => drag('dragstart', row('Bell (example)')))
    await act(async () => drag('drop', row('Bell clapper (example)'), -1))
    expect(names()[0]).toBe('Bell (example)')
    // The bell is now in front, so the code draws it after its clapper.
    expect(code().indexOf('// Bell clapper')).toBeLessThan(code().indexOf('// Bell (example)'))
  })

  it('reorders shapes by dragging them in the list', async () => {
    await act(async () => drag('dragstart', row('Frame outline')))
    await act(async () => drag('dragover', row('Bell clapper (example)'), -1))
    expect(row('Bell clapper (example)').dataset.drop).toBe('front')
    await act(async () => drag('drop', row('Bell clapper (example)'), -1))
    expect(names()[0]).toBe('Frame outline')

    // Dropping on the bottom half of the bottom row sends it all the way back.
    await act(async () => drag('dragstart', row('Frame outline')))
    await act(async () => drag('drop', row('Frame gap'), 1))
    expect(names().at(-1)).toBe('Frame outline')
  })

  it('previews the new order while dragging and puts it back when the drag is cancelled', async () => {
    const bellFirst = () => code().indexOf('// Bell (example)') < code().indexOf('// Bell clapper')
    expect(bellFirst()).toBe(true)

    await act(async () => drag('dragstart', row('Bell (example)')))
    await act(async () => drag('dragover', row('Bell clapper (example)'), -1))
    // The drawing and code show the new order; the list keeps its order while dragging.
    expect(bellFirst()).toBe(false)
    expect(names()[0]).toBe('Bell clapper (example)')

    // Letting go outside the list puts everything back, with no undo step.
    await act(async () => drag('dragend', row('Bell (example)')))
    expect(bellFirst()).toBe(true)
    expect(container.querySelector<HTMLButtonElement>('button[title^="Undo"]')?.disabled).toBe(true)
  })

  it('deselects when clicking an empty part of the page', async () => {
    const pointerDown = (selector: string) => {
      const target = container.querySelector(selector)
      if (!target) throw new Error(`Nothing matches ${selector}`)
      target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }))
    }
    const selected = () => container.querySelector('.row[aria-selected="true"] .name')?.textContent ?? null

    await act(async () => row('Bell (example)').click())
    // Clicks in the properties panel keep the shape selected...
    await act(async () => pointerDown('#props-title'))
    expect(selected()).toBe('Bell (example)')
    // ...but an empty part of the page deselects it.
    await act(async () => pointerDown('.status'))
    expect(selected()).toBeNull()
  })

  it('shows the properties of the shape you pick', async () => {
    await act(async () => row('Bell (example)').click())
    expect(container.textContent).toContain('Points, one "x, y" per line')
  })

  it('changes a shape colour with the swatches', async () => {
    await act(async () => row('Battery body (example)').click()) // black
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
    await act(async () => row('Bell clapper (example)').click())
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' })))
    expect(rows()).toHaveLength(8)
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })))
    expect(rows()).toHaveLength(9)
  })
})
