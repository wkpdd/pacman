import type { Design, PlacedObject } from '@/types'
import {
  ceilTo,
  cmToM,
  polylineLengthM,
  rectAreaM2,
  rectPerimeterM
} from '@/utils/units'
import { computeTotals } from '@/utils/fiscal'
import { PLAQUE_TYPE, findModule } from './library'
import { MATERIAL_DEFAULTS, RATIOS } from './defaults'
import { layoutPlaques } from './plaqueLayout'

export interface MaterialLine {
  id: string
  labelFr: string
  labelAr: string
  /** raw computed need before rounding */
  rawQuantity: number
  /** rounded quantity actually purchased */
  quantity: number
  unit: string
  unitPriceDZD: number
  totalDZD: number
  /** quick note for the worker PDF (e.g. "incl. 10% waste") */
  note?: string
}

export interface DecorativeLine {
  id: string
  labelFr: string
  labelAr: string
  quantity: number
  unit: string
  unitPriceDZD: number
  totalDZD: number
  /** kind it derives from, for grouping in worker PDF */
  kind: string
}

export interface CalcResult {
  geometry: {
    ceilingAreaM2: number
    perimeterM: number
    retombeeAreaM2: number
    retombeeVerticalM2: number
    obstacleAreaM2: number
    cloisonAreaM2: number
    billableM2: number
  }
  materials: MaterialLine[]
  decorative: DecorativeLine[]
  totals: ReturnType<typeof computeTotals>
  /** the actual plaque layout used for the worker plan */
  plaqueLayout: ReturnType<typeof layoutPlaques>
}

/** Compute everything from the canvas state alone. Pure, deterministic. */
export function calculate(design: Design): CalcResult {
  const { room, objects, options } = design
  const wastePct = options.wastePct ?? RATIOS.wastePct
  const layerCount = options.doubleLayer ? 2 : 1
  const plaqueType = options.plaqueType ?? 'standard'
  const plaqueInfo = PLAQUE_TYPE[plaqueType]

  const ceilingAreaM2 = rectAreaM2(room.width, room.length)
  const perimeterM = rectPerimeterM(room.width, room.length)

  // ---- Obstacles: subtract from billable area, add cutout edge to perimeter
  let obstacleAreaM2 = 0
  let obstacleEdgeM = 0
  for (const o of objects) {
    if (o.kind !== 'obstacle') continue
    obstacleAreaM2 += rectAreaM2(o.width, o.height)
    obstacleEdgeM += rectPerimeterM(o.width, o.height)
  }

  // ---- Retombée geometry — sum dropped areas + their vertical faces.
  let retombeeAreaM2 = 0
  let retombeeVerticalM2 = 0
  for (const o of objects) {
    if (o.kind !== 'retombee') continue
    const area = rectAreaM2(o.width, o.height)
    retombeeAreaM2 += area
    const drop = (o.data?.drop ?? 30) / 100 // cm → m
    retombeeVerticalM2 += rectPerimeterM(o.width, o.height) * drop
  }

  // ---- Cloisons: full surface = length × wallHeight × 2 sides (BA13 both faces)
  let cloisonAreaM2 = 0
  let cloisonLengthM = 0
  for (const o of objects) {
    if (o.kind !== 'cloison') continue
    const length = cmToM(o.width)
    const height = cmToM(o.data?.wallHeight ?? room.height)
    cloisonLengthM += length
    cloisonAreaM2 += length * height * 2 // both sides
  }

  const billableM2 =
    Math.max(0, ceilingAreaM2 - obstacleAreaM2) + retombeeAreaM2 + retombeeVerticalM2 + cloisonAreaM2

  // ---- Actual plaque layout (for accurate count and worker plan)
  const obstacles = objects.filter((o) => o.kind === 'obstacle')
  const plaqueLayout = layoutPlaques(room, obstacles)

  const materials: MaterialLine[] = []

  // Plaques: ceiling from layout, retombée + cloison by area. Times layer count.
  const ceilingPlaques = Math.ceil(plaqueLayout.fullPlaquesNeeded * (1 + wastePct))
  const retombeePlaques = Math.ceil(((retombeeAreaM2 + retombeeVerticalM2) * (1 + wastePct)) / 3)
  const cloisonPlaques = Math.ceil((cloisonAreaM2 * (1 + wastePct)) / 3)
  const plaquesNeeded = (ceilingPlaques + retombeePlaques + cloisonPlaques) * layerCount
  const plaqueLine = {
    ...MATERIAL_DEFAULTS.plaqueBA13,
    labelFr: `${plaqueInfo.labelFr}${layerCount > 1 ? ` (×${layerCount} couches)` : ''}`,
    unitPriceDZD: Math.round(MATERIAL_DEFAULTS.plaqueBA13.unitPriceDZD * plaqueInfo.priceMultiplier)
  }
  const breakdownParts = [
    `${ceilingPlaques} plafond`,
    retombeePlaques ? `${retombeePlaques} retombée` : null,
    cloisonPlaques ? `${cloisonPlaques} cloison` : null,
    layerCount > 1 ? `×${layerCount} couches` : null,
    `${(wastePct * 100).toFixed(0)}% perte`
  ].filter(Boolean).join(' · ')
  materials.push(line(plaqueLine, plaquesNeeded, 1, breakdownParts))

  // Fourrures — only for the ceiling area (cloisons use rail+stud, calc below)
  const ceilingBillable = Math.max(0, ceilingAreaM2 - obstacleAreaM2) + retombeeAreaM2 + retombeeVerticalM2
  const fourrureRaw = ceilingBillable * RATIOS.fourrurePerM2 * (1 + wastePct)
  materials.push(line(MATERIAL_DEFAULTS.fourrureF530, fourrureRaw, 1))

  // Perimeter rails: room perimeter + retombée perimeters + obstacle cutout edges + cloison lengths × 2 (top+bottom rail)
  let cornierePerimeterM = perimeterM + obstacleEdgeM
  for (const o of objects) {
    if (o.kind === 'retombee') cornierePerimeterM += rectPerimeterM(o.width, o.height)
  }
  cornierePerimeterM += cloisonLengthM * 2
  materials.push(line(MATERIAL_DEFAULTS.cornierePerimetrique, cornierePerimeterM * (1 + wastePct), 1))

  // Suspentes (ceiling only)
  const suspenteRaw = ceilingBillable * RATIOS.suspentePerM2
  materials.push(line(MATERIAL_DEFAULTS.suspente, suspenteRaw, 1))

  // Screws — proportional to plaque surface × layer count
  const visRaw = billableM2 * RATIOS.visPerM2 * layerCount
  materials.push(
    line(MATERIAL_DEFAULTS.visTTPC, visRaw / (MATERIAL_DEFAULTS.visTTPC.unitSize ?? 1000), 1)
  )

  // Joint band — every plaque joint, doubled when 2 layers
  const bandeRaw = billableM2 * RATIOS.bandeJointPerM2 * (layerCount > 1 ? 1.4 : 1)
  materials.push(
    line(MATERIAL_DEFAULTS.bandeJoint, bandeRaw / (MATERIAL_DEFAULTS.bandeJoint.unitSize ?? 75), 1)
  )

  // Enduit
  const enduitRaw = billableM2 * RATIOS.enduitKgPerM2 * (layerCount > 1 ? 1.3 : 1)
  materials.push(
    line(MATERIAL_DEFAULTS.enduitJoint, enduitRaw / (MATERIAL_DEFAULTS.enduitJoint.unitSize ?? 25), 1)
  )

  // ---- Decorative + obstacle + cloison lines (from placed objects) ----
  const decorative: DecorativeLine[] = []
  let spotCount = 0
  let ledTotalM = 0

  for (const o of objects) {
    const mod = findModule(o.moduleId)
    if (!mod) continue
    const decoEntry = decorativeFor(o, mod, room)
    if (decoEntry) decorative.push(decoEntry)
    if (o.kind === 'spotlight') spotCount += 1
    if (o.kind === 'spotlight-grid') {
      const rows = o.data?.rows ?? 3
      const cols = o.data?.cols ?? 3
      spotCount += rows * cols
    }
    if (o.kind === 'led-strip') {
      ledTotalM += polylineLengthM(o.data?.points ?? [{ x: 0, y: 0 }, { x: o.width, y: 0 }])
    }
  }

  if (ledTotalM > 0) {
    const drivers = Math.ceil(ledTotalM / (MATERIAL_DEFAULTS.driverLED.unitSize ?? 5))
    materials.push(line(MATERIAL_DEFAULTS.driverLED, drivers, 1, `pour ${ledTotalM.toFixed(1)} ml`))
  }
  if (spotCount > 0) {
    const drivers = Math.ceil(spotCount / (MATERIAL_DEFAULTS.driverSpot.unitSize ?? 6))
    materials.push(line(MATERIAL_DEFAULTS.driverSpot, drivers, 1, `pour ${spotCount} spots`))
  }

  // ---- Pricing ----
  const materialsHT = [...materials, ...decorative].reduce((s, l) => s + l.totalDZD, 0)
  const laborHT =
    options.flatLabor != null
      ? options.flatLabor
      : (options.laborPerM2 ?? RATIOS.laborPerM2) * billableM2 * layerCount
  const totals = computeTotals({
    materialsHT,
    laborHT,
    paymentMode: options.paymentMode
  })

  return {
    geometry: {
      ceilingAreaM2,
      perimeterM,
      retombeeAreaM2,
      retombeeVerticalM2,
      obstacleAreaM2,
      cloisonAreaM2,
      billableM2
    },
    materials,
    decorative,
    totals,
    plaqueLayout
  }
}

function line(
  mat: { id: string; labelFr: string; labelAr: string; unit: string; unitPriceDZD: number },
  raw: number,
  quantum: number,
  note?: string
): MaterialLine {
  const quantity = ceilTo(raw, quantum)
  return {
    id: mat.id,
    labelFr: mat.labelFr,
    labelAr: mat.labelAr,
    rawQuantity: raw,
    quantity,
    unit: mat.unit,
    unitPriceDZD: mat.unitPriceDZD,
    totalDZD: quantity * mat.unitPriceDZD,
    note
  }
}

function decorativeFor(
  o: PlacedObject,
  mod: ReturnType<typeof findModule> & object,
  room: { width: number; length: number }
): DecorativeLine | undefined {
  if (!mod) return undefined
  let qty = 0
  let unit = mod.unit as string
  switch (o.kind) {
    case 'corniche': {
      if (o.data?.perimeter !== false) {
        const sides = o.data?.sides ?? ['top', 'right', 'bottom', 'left']
        let len = 0
        for (const s of sides) {
          len += s === 'top' || s === 'bottom' ? cmToM(room.width) : cmToM(room.length)
        }
        qty = len
      } else {
        qty = cmToM(o.width)
      }
      unit = 'ml'
      break
    }
    case 'rosace':
    case 'multi-level':
      qty = o.kind === 'multi-level' ? rectAreaM2(o.width, o.height) : 1
      unit = o.kind === 'multi-level' ? 'm²' : 'unit'
      break
    case 'spotlight':
      qty = 1
      unit = 'unit'
      break
    case 'spotlight-grid': {
      const rows = o.data?.rows ?? 3
      const cols = o.data?.cols ?? 3
      qty = rows * cols
      unit = 'unit'
      break
    }
    case 'led-strip': {
      qty = polylineLengthM(o.data?.points ?? [{ x: 0, y: 0 }, { x: o.width, y: 0 }])
      unit = 'ml'
      break
    }
    case 'retombee': {
      qty = rectAreaM2(o.width, o.height)
      unit = 'm²'
      break
    }
    case 'obstacle': {
      qty = rectAreaM2(o.width, o.height)
      unit = 'm²'
      break
    }
    case 'cloison': {
      qty = cmToM(o.width) * cmToM(o.data?.wallHeight ?? 270)
      unit = 'm²'
      break
    }
  }
  if (qty <= 0) return undefined
  const rounded =
    o.kind === 'led-strip' || o.kind === 'corniche' || unit === 'm²'
      ? Math.round(qty * 100) / 100
      : Math.ceil(qty)
  return {
    id: `${mod.id}-${o.id}`,
    labelFr: mod.labelFr,
    labelAr: mod.labelAr,
    quantity: rounded,
    unit,
    unitPriceDZD: mod.defaultPriceDZD,
    totalDZD: rounded * mod.defaultPriceDZD,
    kind: o.kind
  }
}
