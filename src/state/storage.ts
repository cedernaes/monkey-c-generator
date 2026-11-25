import { parseDocument, serializeDocument } from '../model/document.ts'
import { sanitizeSettings } from '../model/settings.ts'
import type { EditorDocument, Settings } from '../model/types.ts'

// The drawing and settings are kept in this browser's localStorage. Storage can
// be unavailable (private windows, blocked site data), so every access is
// allowed to fail.

const DOCUMENT_KEY = 'watch-shape-editor/document'
const SETTINGS_KEY = 'watch-shape-editor/settings'

export function loadDocument(): EditorDocument | null {
  try {
    const raw = localStorage.getItem(DOCUMENT_KEY)
    return raw ? parseDocument(raw) : null
  } catch {
    return null
  }
}

export function saveDocument(doc: EditorDocument): void {
  try {
    localStorage.setItem(DOCUMENT_KEY, serializeDocument(doc))
  } catch {
    // Not saved; the editor keeps working.
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return sanitizeSettings(raw ? JSON.parse(raw) : null)
  } catch {
    return sanitizeSettings(null)
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Not saved; the editor keeps working.
  }
}
