import type { Design, PlacedObject } from '@/types'
import {
  ceilTo,
  cmToM,
  polylineLengthM,
  rectAreaM2,
  rectPerimeterM
} from '@/utils/units'
import { computeTotals } from '@/utils/fiscal'
import { findModule } from './library'
import { MATERIAL_DEFAULTS, RATIOS } from './defaults'

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
  }
  materials: MaterialLine[]
  decorative: DecorativeLine[]
  totals: ReturnType<typeof computeTotals>
}

/** Compute everything from the canvas state alone. Pure, deterministic. */
export function calculate(design: Design): CalcResult {
  const { room, objects, options } = design
  const wastePct = options.wastePct ?? RATIOS.wastePct
  const ceilingAreaM2 = rectAreaM2(room.width, room.length)
  const perimeterM = rectPerimeterM(room.width, room.length)

  // Retombée geometry — sum dropped areas + their vertical faces.
  let retombeeAreaM2 = 0
  let retombeeVerticalM2 = 0
  for (const o of objects) {
    if (o.kind !== 'retombee') continue
    const area = rectAreaM2(o.width, o.height)
    retombeeAreaM2 += area
    const drop = (o.data?.drop ?? 30) / 100 // cm → m
    retombeeVerticalM2 += rectPerimeterM(o.width, o.height) * drop
  }

  const billableAreaM2 = ceilingAreaM2 + retombeeAreaM2 + retombeeVerticalM2

  // ---- Suspended ceiling materials (BA13 + profiles) ----
  const materials: MaterialLine[] = []

  const plaqueRaw =
    (billableAreaM2 * (1 + wastePct)) / (MATERIAL_DEFAULTS.plaqueBA13.unitSize ?? 3)
  materials.push(line(MATERIAL_DEFAULTS.plaqueBA13, plaqueRaw, 1, `incl. ${(wastePct * 100).toFixed(0)}% perte`))

  const fourrureRaw = billableAreaM2 * RATIOS.fourrurePerM2 * (1 + wastePct)
  materials.push(line(MATERIAL_DEFAULTS.fourrureF530, fourrureRaw, 1))

  // Perimeter rails follow room perimeter + each retombée perimeter.
  let cornierePerimeterM = perimeterM
  for (const o of objects) {
    if (o.kind === 'retombee') cornierePerimeterM += rectPerimeterM(o.width, o.height)
  }
  materials.push(line(MATERIAL_DEFAULTS.cornierePerimetrique, cornierePerimeterM * (1 + wastePct), 1))

  const suspenteRaw = billableAreaM2 * RATIOS.suspentePerM2
  materials.push(line(MATERIAL_DEFAULTS.suspente, suspenteRaw, 1))

  const visRaw = billableAreaM2 * RATIOS.visPerM2
  materials.push(
    line(
      MATERIAL_DEFAULTS.visTTPC,
      visRaw / (MATERIAL_DEFAULTS.visTTPC.unitSize ?? 1000),
      1
    )
  )

  const bandeRaw = billableAreaM2 * RATIOS.bandeJointPerM2
  materials.push(
    line(
      MATERIAL_DEFAULTS.bandeJoint,
      bandeRaw / (MATERIAL_DEFAULTS.bandeJoint.unitSize ?? 75),
      1
    )
  )

  const enduitRaw = billableAreaM2 * RATIOS.enduitKgPerM2
  materials.push(
    line(
      MATERIAL_DEFAULTS.enduitJoint,
      enduitRaw / (MATERIAL_DEFAULTS.enduitJoint.unitSize ?? 25),
      1
    )
  )

  // ---- Decorative lines (from placed objects) ----
  const decorative: DecorativeLine[] = []
  let spotCount = 0
  let ledTotalM = 0

  for (const o of objects) {
    const mod = findModule(o.moduleId)
    if (!mod) continue
    const decoEntry = decorativeFor(o, mod)
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

  // LED drivers (1 per 5 m linear)
  if (ledTotalM > 0) {
    const drivers = Math.ceil(ledTotalM / (MATERIAL_DEFAULTS.driverLED.unitSize ?? 5))
    materials.push(
      line(MATERIAL_DEFAULTS.driverLED, drivers, 1, `pour ${ledTotalM.toFixed(1)} ml`)
    )
  }
  // Spot drivers (1 per 6 spots)
  if (spotCount > 0) {
    const drivers = Math.ceil(spotCount / (MATERIAL_DEFAULTS.driverSpot.unitSize ?? 6))
    materials.push(
      line(MATERIAL_DEFAULTS.driverSpot, drivers, 1, `pour ${spotCount} spots`)
    )
  }

  // ---- Pricing ----
  const materialsHT = [...materials, ...decorative].reduce((s, l) => s + l.totalDZD, 0)
  const laborHT =
    options.flatLabor != null
      ? options.flatLabor
      : (options.laborPerM2 ?? RATIOS.laborPerM2) * billableAreaM2
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
      retombeeVerticalM2
    },
    materials,
    decorative,
    totals
  }
}

function line(
  mat: (typeof MATERIAL_DEFAULTS)[keyof typeof MATERIAL_DEFAULTS],
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
  mod: ReturnType<typeof findModule> & object
): DecorativeLine | undefined {
  if (!mod) return undefined
  let qty = 0
  let unit = mod.unit as string
  switch (o.kind) {
    case 'corniche': {
      // corniche follows the sides flagged on this object — fallback = the
      // segment defined by (width); typical UX is "drag along edge".
      qty = cmToM(o.width)
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
