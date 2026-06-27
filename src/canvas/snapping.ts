import type { PlacedObject, Room } from '@/types'

export interface SnapResult {
  x: number
  y: number
  guides: Array<{
    kind: 'v' | 'h'
    /** position in canvas cm */
    pos: number
    /** what we snapped to (for UI label) */
    label: string
  }>
}

export interface SnapOpts {
  threshold: number // cm
  gridStep?: number // cm; 0/undefined disables grid snap
}

/**
 * Snap a moving object's (x,y) to room edges, room centerlines, the grid,
 * and the edges/centers of other objects. Threshold compensates for low
 * touch precision — make it generous on phones.
 */
export function snap(
  obj: PlacedObject,
  others: PlacedObject[],
  room: Room,
  opts: SnapOpts
): SnapResult {
  const guides: SnapResult['guides'] = []
  let x = obj.x
  let y = obj.y

  const candidatesX: Array<{ pos: number; label: string; objPos: number }> = [
    { pos: 0, label: 'room.left', objPos: 0 },
    { pos: room.width, label: 'room.right', objPos: obj.width },
    { pos: room.width / 2, label: 'room.cx', objPos: obj.width / 2 }
  ]
  const candidatesY: Array<{ pos: number; label: string; objPos: number }> = [
    { pos: 0, label: 'room.top', objPos: 0 },
    { pos: room.length, label: 'room.bottom', objPos: obj.height },
    { pos: room.length / 2, label: 'room.cy', objPos: obj.height / 2 }
  ]
  for (const o of others) {
    if (o.id === obj.id) continue
    candidatesX.push(
      { pos: o.x, label: `obj.${o.id}.l`, objPos: 0 },
      { pos: o.x + o.width, label: `obj.${o.id}.r`, objPos: obj.width },
      { pos: o.x + o.width / 2, label: `obj.${o.id}.cx`, objPos: obj.width / 2 }
    )
    candidatesY.push(
      { pos: o.y, label: `obj.${o.id}.t`, objPos: 0 },
      { pos: o.y + o.height, label: `obj.${o.id}.b`, objPos: obj.height },
      { pos: o.y + o.height / 2, label: `obj.${o.id}.cy`, objPos: obj.height / 2 }
    )
  }

  let bestX = { d: opts.threshold, val: x, label: '' }
  for (const c of candidatesX) {
    const target = c.pos - c.objPos
    const d = Math.abs(x - target)
    if (d < bestX.d) bestX = { d, val: target, label: c.label }
  }
  if (bestX.label) {
    x = bestX.val
    guides.push({ kind: 'v', pos: x + (bestX.label.includes('cx') ? obj.width / 2 : bestX.label.endsWith('.r') || bestX.label === 'room.right' ? obj.width : 0), label: bestX.label })
  } else if (opts.gridStep) {
    x = Math.round(x / opts.gridStep) * opts.gridStep
  }

  let bestY = { d: opts.threshold, val: y, label: '' }
  for (const c of candidatesY) {
    const target = c.pos - c.objPos
    const d = Math.abs(y - target)
    if (d < bestY.d) bestY = { d, val: target, label: c.label }
  }
  if (bestY.label) {
    y = bestY.val
    guides.push({ kind: 'h', pos: y + (bestY.label.includes('cy') ? obj.height / 2 : bestY.label.endsWith('.b') || bestY.label === 'room.bottom' ? obj.height : 0), label: bestY.label })
  } else if (opts.gridStep) {
    y = Math.round(y / opts.gridStep) * opts.gridStep
  }

  // Keep inside the room
  x = Math.max(0, Math.min(x, room.width - obj.width))
  y = Math.max(0, Math.min(y, room.length - obj.height))

  return { x, y, guides }
}
