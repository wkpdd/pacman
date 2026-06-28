import type { PlacedObject, Room } from '@/types'

/** Standard BA13 plaque is 1.20 × 2.50 m. */
export const PLAQUE_W_CM = 120
export const PLAQUE_L_CM = 250

export interface LaidPlaque {
  /** index (1-based) for labelling on the plan */
  n: number
  /** top-left corner in cm */
  x: number
  y: number
  /** dimensions in cm — may be smaller than full size when clipped to a wall or obstacle */
  w: number
  h: number
  /** was this plaque cut from a full one? */
  cut: boolean
  /** wasted area in m² (rest of the cut plaque that gets discarded) */
  wasteM2: number
  /** if this plaque is split around an obstacle, the cutouts are listed here */
  cutouts?: Array<{ x: number; y: number; w: number; h: number; label?: string }>
}

export interface LayoutResult {
  plaques: LaidPlaque[]
  /** total full plaques required (each cut plaque counts as 1 full from supplier) */
  fullPlaquesNeeded: number
  /** sum of usable area covered in m² */
  coveredM2: number
  /** sum of wasted area in m² (offcuts) */
  wasteM2: number
}

/**
 * Greedy row-fill layout: lay full plaques wherever they fit; the last
 * column / last row gets cut to the remainder. Long edge (250 cm) runs
 * along the room length by default — flip in opts to test the other
 * orientation, picks the lower-waste one.
 *
 * Obstacles are flagged on the plaque records as cutouts; the placo
 * worker still cuts and installs the plaque around them.
 */
export function layoutPlaques(room: Room, obstacles: PlacedObject[]): LayoutResult {
  const a = layoutInOrientation(room, obstacles, false)
  const b = layoutInOrientation(room, obstacles, true)
  return a.wasteM2 <= b.wasteM2 ? a : b
}

function layoutInOrientation(
  room: Room,
  obstacles: PlacedObject[],
  rotate: boolean
): LayoutResult {
  const plaqueW = rotate ? PLAQUE_L_CM : PLAQUE_W_CM
  const plaqueH = rotate ? PLAQUE_W_CM : PLAQUE_L_CM
  const plaques: LaidPlaque[] = []
  let n = 0
  let wasteCm2 = 0
  let coveredCm2 = 0
  let fullPlaques = 0

  for (let y = 0; y < room.length; y += plaqueH) {
    for (let x = 0; x < room.width; x += plaqueW) {
      n++
      const w = Math.min(plaqueW, room.width - x)
      const h = Math.min(plaqueH, room.length - y)
      const cut = w < plaqueW || h < plaqueH
      const fullArea = plaqueW * plaqueH
      const usedArea = w * h
      const localWaste = cut ? fullArea - usedArea : 0
      // attach obstacles overlapping this plaque
      const cutouts: LaidPlaque['cutouts'] = []
      let obstacleCutCm2 = 0
      for (const o of obstacles) {
        if (o.kind !== 'obstacle') continue
        const ox1 = Math.max(o.x, x)
        const oy1 = Math.max(o.y, y)
        const ox2 = Math.min(o.x + o.width, x + w)
        const oy2 = Math.min(o.y + o.height, y + h)
        if (ox2 > ox1 && oy2 > oy1) {
          cutouts.push({
            x: ox1 - x,
            y: oy1 - y,
            w: ox2 - ox1,
            h: oy2 - oy1,
            label: o.data?.label
          })
          obstacleCutCm2 += (ox2 - ox1) * (oy2 - oy1)
        }
      }
      plaques.push({
        n,
        x,
        y,
        w,
        h,
        cut,
        wasteM2: (localWaste + obstacleCutCm2) / 10_000,
        cutouts: cutouts.length ? cutouts : undefined
      })
      coveredCm2 += usedArea - obstacleCutCm2
      wasteCm2 += localWaste + obstacleCutCm2
      fullPlaques += 1
    }
  }
  return {
    plaques,
    fullPlaquesNeeded: fullPlaques,
    coveredM2: coveredCm2 / 10_000,
    wasteM2: wasteCm2 / 10_000
  }
}
