import { useEffect, useReducer, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { CodePanel } from './components/CodePanel.tsx'
import { EditorCanvas } from './components/EditorCanvas.tsx'
import { PropertiesPanel } from './components/PropertiesPanel.tsx'
import { ReferencePanel } from './components/ReferencePanel.tsx'
import { ShapeList } from './components/ShapeList.tsx'
import { ToolRail } from './components/ToolRail.tsx'
import { TopBar } from './components/TopBar.tsx'
import { parseDocument, serializeDocument } from './model/document.ts'
import { coordWidth, formatCoord, moveShape } from './model/geometry.ts'
import { fitPlacement, movePlacement, uncrop } from './model/reference.ts'
import type { RefEditMode } from './model/reference.ts'
import { sampleDocument } from './model/samples.ts'
import { fitZoom } from './model/settings.ts'
import type { Drawable, Point, Screen, Settings, Shape, Tool } from './model/types.ts'
import { MARGIN } from './render/scene.ts'
import type { SceneReference } from './render/scene.ts'
import { editorReducer, initEditor, nextShapeId, nextShapeName, reorderShape, replaceShape } from './state/editor.ts'
import { downloadText, loadImage } from './state/files.ts'
import { loadDocument, loadSettings, saveDocument, saveSettings } from './state/storage.ts'
import { hintFor, REF_EDIT_HINTS, toolForKey } from './tools.ts'

/**
 * Clicks here keep the selected shape selected: the canvas (which handles its
 * own clicks), shape rows, controls, and panels marked data-keep-selection.
 */
const KEEPS_SELECTION =
  'canvas, .row, button, input, select, textarea, a, label, summary, [role="radio"], [data-keep-selection]'

const ARROWS: Record<string, Point> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

export default function App() {
  const [initial] = useState(() => loadDocument() ?? sampleDocument())
  const [screen, setScreen] = useState<Screen>(initial.screen)
  const [editor, dispatch] = useReducer(editorReducer, initial.shapes, initEditor)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [tool, setTool] = useState<Tool>('select')
  const [draft, setDraft] = useState<Point[] | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [reference, setReference] = useState<SceneReference | null>(null)
  const [refEdit, setRefEdit] = useState<RefEditMode | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { shapes, selectedId } = editor
  const selected = shapes.find((s) => s.id === selectedId) ?? null

  // Pointer readout: one decimal (two without snapping) in a fixed width, so it doesn't jump.
  const decimals = settings.snap === 0 ? 2 : 1
  const width = coordWidth(Math.max(screen.width, screen.height) + MARGIN, decimals)
  const coord = (v: number | undefined) => formatCoord(v ?? null, decimals, width)

  useEffect(() => saveDocument({ screen, shapes: editor.committed }), [screen, editor.committed])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 6000)
    return () => window.clearTimeout(timer)
  }, [message])

  const updateSettings = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))
  const setShapes = (next: Shape[], mode: 'preview' | 'commit' = 'commit') =>
    dispatch(mode === 'preview' ? { type: 'preview', shapes: next } : { type: 'set', shapes: next })
  const select = (id: number | null) => dispatch({ type: 'select', id })

  function chooseTool(next: Tool) {
    if (next !== 'polygon') setDraft(null)
    setRefEdit(null)
    setTool(next)
  }

  /** Start or stop adjusting the reference image; null stops. */
  function editReference(mode: RefEditMode | null) {
    if (mode) {
      setDraft(null)
      setTool('select')
    }
    setRefEdit(mode)
  }

  function placeReference(change: (r: SceneReference) => SceneReference['placement']) {
    if (reference) setReference({ ...reference, placement: change(reference) })
  }

  function addShape(shape: Drawable) {
    const id = nextShapeId(shapes)
    const full: Shape = { ...shape, id, name: nextShapeName(shapes, shape.type) }
    dispatch({ type: 'set', shapes: [...shapes, full], select: id })
    chooseTool('select')
  }

  function finishPolygon() {
    if (draft && draft.length >= 3) addShape({ type: 'polygon', color: settings.newColor, points: draft })
    setDraft(null)
  }

  function removeShape(id: number) {
    setShapes(shapes.filter((s) => s.id !== id))
  }

  function duplicate(id: number) {
    const s = shapes.find((x) => x.id === id)
    if (!s) return
    const step = (settings.snap || 1) * 2
    const copy: Shape = { ...moveShape(s, step, step), id: nextShapeId(shapes), name: `${s.name} copy` }
    const next = [...shapes]
    next.splice(shapes.indexOf(s) + 1, 0, copy)
    dispatch({ type: 'set', shapes: next, select: copy.id })
  }

  function moveInList(index: number, delta: -1 | 1) {
    const next = [...shapes]
    const [s] = next.splice(index, 1)
    next.splice(index + delta, 0, s)
    setShapes(next)
  }

  function changeScreen(next: Screen) {
    setScreen(next)
    updateSettings({ zoom: fitZoom(next) })
  }

  async function openFile(file: File) {
    try {
      const doc = parseDocument(await file.text())
      changeScreen(doc.screen)
      setDraft(null)
      dispatch({ type: 'set', shapes: doc.shapes, select: null })
      setMessage(`Opened ${file.name}.`)
    } catch (err) {
      setMessage(`Couldn't open ${file.name}. ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function saveFile() {
    downloadText('watch-shapes.json', serializeDocument({ screen, shapes: editor.committed }))
  }

  async function pickReference(file: File) {
    try {
      const image = await loadImage(file)
      setReference({ image, placement: fitPlacement(image.naturalWidth, image.naturalHeight, screen) })
      setRefEdit(null)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    }
  }

  /** Clicking an empty part of the page deselects, like clicking empty canvas. */
  function onAppPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (selectedId === null || e.button !== 0) return
    if (e.target instanceof Element && e.target.closest(KEEPS_SELECTION)) return
    select(null)
  }

  // Keyboard shortcuts. Re-subscribed on every render so they see the current state.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      const key = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey
      if (mod && (key === 'z' || key === 'y')) {
        e.preventDefault()
        if (key === 'y' || e.shiftKey) dispatch({ type: 'redo' })
        else dispatch({ type: 'undo' })
        return
      }
      if (mod && key === 'd') {
        e.preventDefault()
        if (selected) duplicate(selected.id)
        return
      }
      if (mod || e.altKey) return

      // While adjusting the reference image, keys act on the image.
      if (refEdit) {
        const dir = ARROWS[e.key]
        const toolKey = toolForKey(e.key)
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault()
          setRefEdit(null)
        } else if (dir) {
          e.preventDefault()
          const step = (settings.snap || 1) * (e.shiftKey ? 10 : 1)
          placeReference((r) => movePlacement(r.placement, dir[0] * step, dir[1] * step))
        } else if (toolKey) {
          chooseTool(toolKey)
        }
        return
      }

      if (e.key === 'Escape') {
        if (draft) setDraft(null)
        else select(null)
        return
      }
      if (e.key === 'Enter' && draft) {
        e.preventDefault()
        finishPolygon()
        return
      }
      const toolKey = toolForKey(e.key)
      if (toolKey) {
        chooseTool(toolKey)
        return
      }
      if (!selected) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        removeShape(selected.id)
        return
      }
      const dir = ARROWS[e.key]
      if (dir) {
        e.preventDefault()
        const step = (settings.snap || 1) * (e.shiftKey ? 10 : 1)
        setShapes(replaceShape(shapes, moveShape(selected, dir[0] * step, dir[1] * step)))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  // Paste an image anywhere to use it as the reference image.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (file) {
        e.preventDefault()
        void pickReference(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  return (
    <div className="app" onPointerDown={onAppPointerDown}>
      <TopBar
        screen={screen}
        onScreen={changeScreen}
        settings={settings}
        onSettings={updateSettings}
        canUndo={editor.past.length > 0 || editor.shapes !== editor.committed}
        canRedo={editor.future.length > 0}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onOpen={(file) => void openFile(file)}
        onSave={saveFile}
        message={message}
      />

      <main className="work">
        <div className="rail">
          <ToolRail tool={tool} onTool={chooseTool} />
          <ReferencePanel
            hasImage={reference !== null}
            editMode={refEdit}
            opacity={settings.refOpacity}
            onTop={settings.refOnTop}
            onPick={(file) => void pickReference(file)}
            onRemove={() => {
              setReference(null)
              setRefEdit(null)
            }}
            onEditMode={editReference}
            onFit={() =>
              placeReference((r) => fitPlacement(r.image.naturalWidth, r.image.naturalHeight, screen, r.placement.crop))
            }
            onUncrop={() => placeReference((r) => uncrop(r.placement))}
            onOpacity={(refOpacity) => updateSettings({ refOpacity })}
            onOnTop={(refOnTop) => updateSettings({ refOnTop })}
          />
        </div>

        <section className="stage" aria-label="Watch screen">
          <div className="canvas-wrap">
            <EditorCanvas
              screen={screen}
              shapes={shapes}
              selected={selected}
              tool={tool}
              zoom={settings.zoom}
              snap={settings.snap}
              grid={settings.grid}
              background={settings.background}
              newColor={settings.newColor}
              draft={draft}
              cursor={cursor}
              reference={reference}
              refOpacity={settings.refOpacity}
              refOnTop={settings.refOnTop}
              refEdit={reference ? refEdit : null}
              onReference={(placement) => placeReference(() => placement)}
              onCursor={setCursor}
              onSelect={select}
              onShapes={setShapes}
              onCommit={() => dispatch({ type: 'commit' })}
              onCreate={addShape}
              onDraft={setDraft}
              onFinishPolygon={finishPolygon}
            />
          </div>
          <div className="status">
            <span className="pos">{`x ${coord(cursor?.[0])} · y ${coord(cursor?.[1])}`}</span>
            <span className="hint">{refEdit && reference ? REF_EDIT_HINTS[refEdit] : hintFor(tool)}</span>
          </div>
        </section>

        <aside className="side">
          <ShapeList
            shapes={shapes}
            selectedId={selectedId}
            onSelect={(id) => {
              select(id)
              chooseTool('select')
            }}
            onMove={moveInList}
            onReorder={(id, targetId, place) => setShapes(reorderShape(shapes, id, targetId, place))}
            onDuplicate={duplicate}
            onDelete={removeShape}
            onClear={() => dispatch({ type: 'set', shapes: [], select: null })}
            onLoadExamples={() => {
              const doc = sampleDocument()
              changeScreen(doc.screen)
              dispatch({ type: 'set', shapes: doc.shapes, select: null })
            }}
          />
          <PropertiesPanel
            key={selected?.id ?? 'none'}
            shape={selected}
            newColor={settings.newColor}
            onNewColor={(newColor) => updateSettings({ newColor })}
            onChange={(s, mode) => setShapes(replaceShape(shapes, s), mode)}
            onCommit={() => dispatch({ type: 'commit' })}
          />
          <CodePanel shapes={shapes} selected={selected} settings={settings} onSettings={updateSettings} />
        </aside>
      </main>
    </div>
  )
}
