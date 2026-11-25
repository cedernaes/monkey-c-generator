import type { EditorDocument } from './types.ts'

/**
 * What a first visit shows: the frame of a retro LCD watch face on a
 * Forerunner 735XT as guides, plus two of its icons as examples.
 */
export function sampleDocument(): EditorDocument {
  return {
    screen: { width: 215, height: 180, shape: 'semiround' },
    shapes: [
      { id: 1, type: 'rrect', name: 'Frame outline', color: 'WHITE', guide: true, x: 18, y: 20, w: 179, h: 140, r: 18 },
      { id: 2, type: 'rrect', name: 'Frame gap', color: 'BLACK', guide: true, x: 20, y: 22, w: 175, h: 136, r: 16 },
      { id: 3, type: 'rrect', name: 'LCD panel', color: 'WHITE', guide: true, x: 22, y: 24, w: 171, h: 132, r: 14 },
      { id: 4, type: 'rect', name: 'Battery body (example)', color: 'BLACK', x: 28, y: 39, w: 30, h: 12 },
      { id: 5, type: 'rect', name: 'Battery inside (example)', color: 'WHITE', x: 30, y: 41, w: 26, h: 8 },
      { id: 6, type: 'rect', name: 'Battery nub (example)', color: 'BLACK', x: 58, y: 42, w: 3, h: 6 },
      { id: 7, type: 'rect', name: 'Battery bar (example)', color: 'BLACK', x: 31, y: 42, w: 4, h: 6 },
      {
        id: 8,
        type: 'polygon',
        name: 'Bell (example)',
        color: 'BLACK',
        points: [
          [69.5, 36],
          [73.5, 36],
          [75.5, 38.5],
          [76, 44],
          [78, 46.5],
          [65, 46.5],
          [67, 44],
          [67.5, 38.5],
        ],
      },
      { id: 9, type: 'circle', name: 'Bell clapper (example)', color: 'BLACK', cx: 71.5, cy: 48, r: 1.5 },
    ],
  }
}
