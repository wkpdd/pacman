import type { PlacedObject, Room } from '@/types'
import { newId } from '@/utils/id'

/**
 * A representative living-room ceiling: a 4 × 5 m room with a perimeter
 * corniche + LED, central rosace, 2 × 4 spotlight grid, and a small
 * retombée bringing visual depth. Lets first-run users see what good
 * looks like without typing a number.
 */
export function sampleSalon(): { room: Room; objects: PlacedObject[] } {
  const room: Room = { width: 400, length: 500, height: 280 }
  return {
    room,
    objects: [
      {
        id: newId(),
        kind: 'corniche',
        moduleId: 'corniche-led-12',
        x: 0, y: 0, width: 200, height: 12, rotation: 0,
        data: { perimeter: true, sides: ['top', 'right', 'bottom', 'left'] }
      },
      {
        id: newId(),
        kind: 'rosace',
        moduleId: 'rosace-d90',
        x: room.width / 2 - 45,
        y: room.length / 2 - 45,
        width: 90, height: 90, rotation: 0
      },
      {
        id: newId(),
        kind: 'spotlight-grid',
        moduleId: 'spot-grid',
        x: 50, y: 60, width: 300, height: 380, rotation: 0,
        data: { rows: 2, cols: 4 }
      },
      {
        id: newId(),
        kind: 'led-strip',
        moduleId: 'led-strip-warm',
        x: 30, y: 30, width: 340, height: 1, rotation: 0,
        data: {
          points: [
            { x: 0, y: 0 },
            { x: 340, y: 0 },
            { x: 340, y: 440 },
            { x: 0, y: 440 },
            { x: 0, y: 0 }
          ]
        }
      }
    ]
  }
}
