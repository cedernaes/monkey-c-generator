import type { ColorKey, Screen } from './types.ts'

export interface PaletteColor {
  key: ColorKey
  hex: string
  label: string
}

/** The Graphics.COLOR_* constants and the colours they stand for. */
export const PALETTE: readonly PaletteColor[] = [
  { key: 'WHITE', hex: '#FFFFFF', label: 'White' },
  { key: 'LT_GRAY', hex: '#AAAAAA', label: 'Light grey' },
  { key: 'DK_GRAY', hex: '#555555', label: 'Dark grey' },
  { key: 'BLACK', hex: '#000000', label: 'Black' },
  { key: 'RED', hex: '#FF0000', label: 'Red' },
  { key: 'DK_RED', hex: '#AA0000', label: 'Dark red' },
  { key: 'ORANGE', hex: '#FF5500', label: 'Orange' },
  { key: 'YELLOW', hex: '#FFAA00', label: 'Yellow' },
  { key: 'GREEN', hex: '#00FF00', label: 'Green' },
  { key: 'DK_GREEN', hex: '#00AA00', label: 'Dark green' },
  { key: 'BLUE', hex: '#00AAFF', label: 'Blue' },
  { key: 'DK_BLUE', hex: '#0000FF', label: 'Dark blue' },
  { key: 'PURPLE', hex: '#AA00FF', label: 'Purple' },
  { key: 'PINK', hex: '#FF00FF', label: 'Pink' },
]

export const HEX = Object.fromEntries(PALETTE.map((c) => [c.key, c.hex])) as Record<ColorKey, string>

export function isColorKey(value: unknown): value is ColorKey {
  return PALETTE.some((c) => c.key === value)
}

export interface ScreenPreset {
  id: string
  label: string
  screen: Screen
}

export const SCREEN_PRESETS: readonly ScreenPreset[] = [
  {
    id: 'semiround-215x180',
    label: 'Semi-round 215 × 180 (Forerunner 735XT)',
    screen: { width: 215, height: 180, shape: 'semiround' },
  },
  { id: 'round-218', label: 'Round 218 × 218', screen: { width: 218, height: 218, shape: 'round' } },
  { id: 'round-240', label: 'Round 240 × 240', screen: { width: 240, height: 240, shape: 'round' } },
  { id: 'round-260', label: 'Round 260 × 260', screen: { width: 260, height: 260, shape: 'round' } },
  { id: 'round-280', label: 'Round 280 × 280', screen: { width: 280, height: 280, shape: 'round' } },
  { id: 'round-390', label: 'Round 390 × 390', screen: { width: 390, height: 390, shape: 'round' } },
  { id: 'round-416', label: 'Round 416 × 416', screen: { width: 416, height: 416, shape: 'round' } },
  { id: 'round-454', label: 'Round 454 × 454', screen: { width: 454, height: 454, shape: 'round' } },
  { id: 'rectangle-240', label: 'Rectangle 240 × 240', screen: { width: 240, height: 240, shape: 'rectangle' } },
]

export function presetFor(screen: Screen): ScreenPreset | undefined {
  return SCREEN_PRESETS.find(
    (p) => p.screen.width === screen.width && p.screen.height === screen.height && p.screen.shape === screen.shape,
  )
}

const SHAPE_LABEL = { round: 'Round', semiround: 'Semi-round', rectangle: 'Rectangle' } as const

export function screenLabel(screen: Screen): string {
  return `${SHAPE_LABEL[screen.shape]} ${screen.width} × ${screen.height}`
}
