import { create } from 'zustand'
import { produce } from 'immer'
import type { Design, PlacedObject, Room } from '@/types'
import { newId } from '@/utils/id'
import { findModule } from '@/modules/faux-plafond/library'
import { sampleSalon } from '@/modules/faux-plafond/sample'

interface Snapshot {
  room: Room
  objects: PlacedObject[]
}

const HISTORY_LIMIT = 60

interface CanvasState {
  designId: string
  designName: string
  room: Room
  objects: PlacedObject[]
  selectionId: string | null
  /** snapshots, oldest first */
  history: Snapshot[]
  /** pointer; -1 means "live state is the future of history.last" */
  historyIndex: number
  /** for transient dragging — UI may temporarily set objects without history */
  isDirty: boolean

  // commands
  setRoom: (room: Partial<Room>) => void
  addObject: (moduleId: string, at?: { x: number; y: number }) => void
  updateObject: (id: string, patch: Partial<PlacedObject>) => void
  patchObjectData: (id: string, data: Partial<NonNullable<PlacedObject['data']>>) => void
  removeObject: (id: string) => void
  duplicateObject: (id: string) => void
  toggleLock: (id: string) => void
  toggleHidden: (id: string) => void
  reorder: (fromIndex: number, toIndex: number) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  select: (id: string | null) => void
  loadDesign: (d: Design) => void
  newDesign: () => void
  loadSample: () => void
  setName: (name: string) => void

  // history
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  /** internal — push current snapshot to history */
  commit: () => void
}

const defaultRoom = (): Room => ({ width: 400, length: 500, height: 270 })

export const useCanvasStore = create<CanvasState>((set, get) => ({
  designId: newId(),
  designName: 'Nouveau devis',
  room: defaultRoom(),
  objects: [],
  selectionId: null,
  history: [{ room: defaultRoom(), objects: [] }],
  historyIndex: 0,
  isDirty: false,

  setRoom: (patch) => {
    set(
      produce<CanvasState>((s) => {
        s.room = { ...s.room, ...patch }
        s.isDirty = true
      })
    )
    get().commit()
  },

  addObject: (moduleId, at) => {
    const mod = findModule(moduleId)
    if (!mod) return
    const { room } = get()
    const x = at?.x ?? Math.max(0, room.width / 2 - mod.defaultWidthCm / 2)
    const y = at?.y ?? Math.max(0, room.length / 2 - mod.defaultHeightCm / 2)
    const id = newId()
    set(
      produce<CanvasState>((s) => {
        const obj: PlacedObject = {
          id,
          kind: mod.kind,
          moduleId: mod.id,
          x,
          y,
          width: mod.defaultWidthCm,
          height: mod.defaultHeightCm,
          rotation: 0,
          data:
            mod.kind === 'spotlight-grid'
              ? { rows: 3, cols: 4 }
              : mod.kind === 'led-strip'
                ? {
                    points: [
                      { x: 0, y: 0 },
                      { x: mod.defaultWidthCm, y: 0 }
                    ],
                    ledColor:
                      mod.id.includes('cool') ? 'cool'
                      : mod.id.includes('rgb') ? 'rgb'
                      : mod.id.includes('neutral') ? 'neutral'
                      : 'warm',
                    ledDensity: 60,
                    ledWattagePerM: 9.6
                  }
                : mod.kind === 'retombee'
                  ? { drop: 25 }
                  : mod.kind === 'corniche'
                    ? { perimeter: true, sides: ['top', 'right', 'bottom', 'left'] }
                    : mod.kind === 'obstacle'
                      ? { label: mod.labelFr.split(' ')[0].toLowerCase() }
                      : mod.kind === 'cloison'
                        ? { thickness: 7, wallHeight: 270, windows: [] }
                        : mod.kind === 'lamp'
                          ? {
                              lampKind:
                                mod.id.includes('chandelier') ? 'chandelier'
                                : mod.id.includes('pendant') ? 'pendant'
                                : mod.id.includes('plafonnier') ? 'plafonnier'
                                : mod.id.includes('sconce') ? 'sconce'
                                : 'suspension',
                              hangHeight: mod.id.includes('plafonnier') ? 0 : 80,
                              bulbCount: mod.id.includes('chandelier') ? 5 : 1,
                              bulbWattage: mod.id.includes('plafonnier') ? 36 : 40,
                              bulbColor: 'warm'
                            }
                          : undefined
        }
        s.objects.push(obj)
        s.selectionId = id
        s.isDirty = true
      })
    )
    get().commit()
  },

  updateObject: (id, patch) => {
    set(
      produce<CanvasState>((s) => {
        const o = s.objects.find((x) => x.id === id)
        if (!o) return
        Object.assign(o, patch)
        s.isDirty = true
      })
    )
    get().commit()
  },

  patchObjectData: (id, data) => {
    set(
      produce<CanvasState>((s) => {
        const o = s.objects.find((x) => x.id === id)
        if (!o) return
        o.data = { ...(o.data ?? {}), ...data }
        s.isDirty = true
      })
    )
    get().commit()
  },

  removeObject: (id) => {
    set(
      produce<CanvasState>((s) => {
        s.objects = s.objects.filter((o) => o.id !== id)
        if (s.selectionId === id) s.selectionId = null
        s.isDirty = true
      })
    )
    get().commit()
  },

  duplicateObject: (id) => {
    set(
      produce<CanvasState>((s) => {
        const o = s.objects.find((x) => x.id === id)
        if (!o) return
        const copy: PlacedObject = { ...o, id: newId(), x: o.x + 20, y: o.y + 20 }
        s.objects.push(copy)
        s.selectionId = copy.id
        s.isDirty = true
      })
    )
    get().commit()
  },

  toggleLock: (id) => {
    set(
      produce<CanvasState>((s) => {
        const o = s.objects.find((x) => x.id === id)
        if (!o) return
        o.locked = !o.locked
        s.isDirty = true
      })
    )
    get().commit()
  },

  toggleHidden: (id) => {
    set(
      produce<CanvasState>((s) => {
        const o = s.objects.find((x) => x.id === id)
        if (!o) return
        o.hidden = !o.hidden
        s.isDirty = true
      })
    )
    get().commit()
  },

  reorder: (fromIndex, toIndex) => {
    set(
      produce<CanvasState>((s) => {
        if (fromIndex < 0 || fromIndex >= s.objects.length) return
        if (toIndex < 0 || toIndex >= s.objects.length) return
        if (fromIndex === toIndex) return
        const [item] = s.objects.splice(fromIndex, 1)
        s.objects.splice(toIndex, 0, item)
        s.isDirty = true
      })
    )
    get().commit()
  },

  bringForward: (id) => {
    set(
      produce<CanvasState>((s) => {
        const i = s.objects.findIndex((x) => x.id === id)
        if (i < 0 || i === s.objects.length - 1) return
        const [item] = s.objects.splice(i, 1)
        s.objects.push(item)
        s.isDirty = true
      })
    )
    get().commit()
  },

  sendBackward: (id) => {
    set(
      produce<CanvasState>((s) => {
        const i = s.objects.findIndex((x) => x.id === id)
        if (i <= 0) return
        const [item] = s.objects.splice(i, 1)
        s.objects.unshift(item)
        s.isDirty = true
      })
    )
    get().commit()
  },

  select: (id) => set({ selectionId: id }),

  loadDesign: (d) => {
    set({
      designId: d.id,
      designName: d.name,
      room: d.room,
      objects: d.objects,
      selectionId: null,
      history: [{ room: d.room, objects: d.objects }],
      historyIndex: 0,
      isDirty: false
    })
  },

  newDesign: () => {
    const room = defaultRoom()
    set({
      designId: newId(),
      designName: 'Nouveau devis',
      room,
      objects: [],
      selectionId: null,
      history: [{ room, objects: [] }],
      historyIndex: 0,
      isDirty: false
    })
  },

  loadSample: () => {
    const { room, objects } = sampleSalon()
    set({
      designId: newId(),
      designName: 'Salon — exemple',
      room,
      objects,
      selectionId: null,
      history: [{ room, objects }],
      historyIndex: 0,
      isDirty: true
    })
  },

  setName: (name) => set({ designName: name, isDirty: true }),

  commit: () => {
    set(
      produce<CanvasState>((s) => {
        // trim any redo branch
        s.history = s.history.slice(0, s.historyIndex + 1)
        s.history.push({
          room: { ...s.room },
          objects: s.objects.map((o) => ({ ...o, data: o.data ? { ...o.data } : undefined }))
        })
        if (s.history.length > HISTORY_LIMIT) {
          s.history.shift()
        } else {
          s.historyIndex = s.history.length - 1
        }
      })
    )
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const snap = history[historyIndex - 1]
    set({ room: snap.room, objects: snap.objects, historyIndex: historyIndex - 1, isDirty: true })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const snap = history[historyIndex + 1]
    set({ room: snap.room, objects: snap.objects, historyIndex: historyIndex + 1, isDirty: true })
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1
}))
