import { describe, expect, it } from 'vitest'
import type { Design } from '@/types'
import { calculate } from './calculations'
import { sampleSalon } from './sample'
import { RATIOS } from './defaults'

function blankDesign(over: Partial<Design> = {}): Design {
  return {
    id: 'test',
    tenantId: 't',
    name: 'test',
    status: 'draft',
    client: { name: '' },
    room: { width: 400, length: 500, height: 270 },
    objects: [],
    options: {
      wastePct: RATIOS.wastePct,
      laborPerM2: RATIOS.laborPerM2,
      paymentMode: 'bank'
    },
    createdAt: 0,
    updatedAt: 0,
    ...over
  }
}

describe('calculate — empty room', () => {
  const calc = calculate(blankDesign())

  it('reports correct geometry for a 4 × 5 m room', () => {
    expect(calc.geometry.ceilingAreaM2).toBe(20)
    expect(calc.geometry.perimeterM).toBe(18)
    expect(calc.geometry.retombeeAreaM2).toBe(0)
  })

  it('plaque count comes from the smart layout, not a per-cell count', () => {
    const plaque = calc.materials.find((m) => m.id === 'ba13')!
    // 4 × 5 m room: naive grid is 4 cols × 2 rows = 8 cells.
    // Smart count: 6 full + 1 plaque covering both 0.40×2.50 strips = 7.
    // With 10% safety: ceil(7 × 1.10) = 8 plaques.
    expect(plaque.quantity).toBe(8)
    expect(calc.plaqueLayout.plaques.length).toBe(8)
    expect(calc.plaqueLayout.naivePlaqueCount).toBe(8)
    expect(calc.plaqueLayout.fullPlaquesNeeded).toBe(7)
  })

  it('computes labor by m² when no flat rate set', () => {
    expect(calc.totals.laborHT).toBe(20 * RATIOS.laborPerM2)
  })

  it('honors a flat labor override', () => {
    const c = calculate(
      blankDesign({ options: { wastePct: 0.1, laborPerM2: 0, flatLabor: 5_000, paymentMode: 'bank' } })
    )
    expect(c.totals.laborHT).toBe(5_000)
  })
})

describe('calculate — sample salon', () => {
  const { room, objects } = sampleSalon()
  const calc = calculate(blankDesign({ room, objects }))

  it('includes a perimeter corniche line equal to room perimeter', () => {
    const corniche = calc.decorative.find((d) => d.kind === 'corniche')
    expect(corniche).toBeDefined()
    expect(corniche!.quantity).toBeCloseTo(18, 2)
  })

  it('the 2 × 4 spotlight grid contributes 8 spots', () => {
    const grid = calc.decorative.find((d) => d.kind === 'spotlight-grid')
    expect(grid?.quantity).toBe(8)
  })

  it('orders spot drivers (1 per 6 spots) — 8 spots → 2 drivers', () => {
    const driver = calc.materials.find((m) => m.id === 'driver-spot')
    expect(driver?.quantity).toBe(2)
  })

  it('LED driver count comes from total wattage (60 W per driver)', () => {
    const led = calc.decorative.find((d) => d.kind === 'led-strip')
    const driver = calc.materials.find((m) => m.id === 'driver-led')
    // sample salon LED loops 340+440+340+440 cm = 15.6 m
    // × 9.6 W/m = 150 W → ceil(150/60) = 3 drivers
    expect(led?.quantity).toBeGreaterThan(15)
    expect(driver?.quantity).toBe(3)
  })

  it('totals are positive and timbre = 0 by default (bank payment)', () => {
    expect(calc.totals.totalTTC).toBeGreaterThan(0)
    expect(calc.totals.timbre).toBe(0)
  })
})

describe('calculate — retombée adds vertical face', () => {
  const calc = calculate(
    blankDesign({
      objects: [
        {
          id: 'r1',
          kind: 'retombee',
          moduleId: 'retombee-rect',
          x: 100, y: 100, width: 200, height: 200, rotation: 0,
          data: { drop: 30 }
        }
      ]
    })
  )

  it('reports horizontal and vertical retombée areas', () => {
    expect(calc.geometry.retombeeAreaM2).toBe(4)
    // perimeter 8 m × 0.3 m drop = 2.4 m²
    expect(calc.geometry.retombeeVerticalM2).toBeCloseTo(2.4, 5)
  })

  it('the retombée increases plaque demand', () => {
    const calcNo = calculate(blankDesign())
    const calcWith = calc
    const plaqueNo = calcNo.materials.find((m) => m.id === 'ba13')!
    const plaqueWith = calcWith.materials.find((m) => m.id === 'ba13')!
    expect(plaqueWith.quantity).toBeGreaterThan(plaqueNo.quantity)
  })
})

describe('calculate — obstacles, layers, plaque types', () => {
  it('obstacle subtracts from billable area but adds cutout perimeter', () => {
    const calc = calculate(
      blankDesign({
        objects: [
          {
            id: 'o1',
            kind: 'obstacle',
            moduleId: 'obstacle-cheminee',
            x: 100, y: 100, width: 60, height: 60, rotation: 0,
            data: { label: 'cheminée' }
          }
        ]
      })
    )
    expect(calc.geometry.obstacleAreaM2).toBeCloseTo(0.36, 5)
    expect(calc.geometry.billableM2).toBeCloseTo(20 - 0.36, 5)
    // Cornière now has 4 × 0.6 m extra around the cutout (2.4 m)
    const corniere = calc.materials.find((m) => m.id === 'corniere')!
    const ref = calculate(blankDesign()).materials.find((m) => m.id === 'corniere')!
    expect(corniere.quantity).toBeGreaterThan(ref.quantity)
  })

  it('double layer doubles the plaque count and bumps screws', () => {
    const single = calculate(blankDesign())
    const double = calculate(blankDesign({ options: { wastePct: 0.1, laborPerM2: 1200, paymentMode: 'bank', doubleLayer: true } }))
    const ps = single.materials.find((m) => m.id === 'ba13')!
    const pd = double.materials.find((m) => m.id === 'ba13')!
    expect(pd.quantity).toBe(ps.quantity * 2)
    const vs = single.materials.find((m) => m.id === 'vis')!
    const vd = double.materials.find((m) => m.id === 'vis')!
    // Raw screw count doubles even when the rounded box count doesn't.
    expect(vd.rawQuantity).toBeCloseTo(vs.rawQuantity * 2, 3)
  })

  it('hydrofuge plaque type bumps unit price ~45%', () => {
    const std = calculate(blankDesign())
    const hyd = calculate(blankDesign({ options: { wastePct: 0.1, laborPerM2: 1200, paymentMode: 'bank', plaqueType: 'hydrofuge' } }))
    const pStd = std.materials.find((m) => m.id === 'ba13')!
    const pHyd = hyd.materials.find((m) => m.id === 'ba13')!
    expect(pHyd.unitPriceDZD).toBeGreaterThan(pStd.unitPriceDZD)
    expect(pHyd.unitPriceDZD / pStd.unitPriceDZD).toBeCloseTo(1.45, 1)
  })

  it('obstacle spanning multiple plaques marks every plaque it crosses', () => {
    // Place a 200 × 50 cm obstacle straddling the boundary between plaques
    // #1 (col0/row0) and #2 (col1/row0) in a 400 × 500 room.
    const calc = calculate(
      blankDesign({
        objects: [
          {
            id: 'big-obstacle',
            kind: 'obstacle',
            moduleId: 'obstacle-cheminee',
            x: 110, y: 100, width: 200, height: 50, rotation: 0,
            data: { label: 'poutre' }
          }
        ]
      })
    )
    const plaquesWithCutouts = calc.plaqueLayout.plaques.filter((p) => p.cutouts?.length)
    expect(plaquesWithCutouts.length).toBeGreaterThanOrEqual(2)
    // Total cutout area across all affected plaques must equal the obstacle area (200*50 = 10000 cm² = 1 m²)
    const totalCutoutM2 = plaquesWithCutouts.reduce(
      (sum, p) => sum + (p.cutouts ?? []).reduce((s, c) => s + (c.w * c.h) / 10_000, 0),
      0
    )
    expect(totalCutoutM2).toBeCloseTo(1, 3)
    // Billable surface drops by exactly the obstacle footprint
    expect(calc.geometry.billableM2).toBeCloseTo(20 - 1, 3)
    // Cornière now wraps the obstacle perimeter (2*(2+0.5) = 5 m extra)
    const corniere = calc.materials.find((m) => m.id === 'corniere')!
    const ref = calculate(blankDesign()).materials.find((m) => m.id === 'corniere')!
    expect(corniere.rawQuantity - ref.rawQuantity).toBeCloseTo(5 * 1.10, 1)
  })

  it('smart count: 3.50 × 6.00 m room — 9 cells but 8 fresh plaques (user scenario)', () => {
    // Real plâtrier scenario: 3 cols × 3 rows = 9 cells.
    // - 4 full plaques (rows 1-2, cols 1-2)
    // - 2 column strips (1.10 × 2.50) — can't combine, so 2 fresh plaques
    // - 2 row strips (1.20 × 1.00) — 2.00 m total along 2.50 → ONE plaque
    // - 1 corner cut (1.10 × 1.00) — 1 plaque
    // Total = 4 + 2 + 1 + 1 = 8.
    const calc = calculate(
      blankDesign({
        room: { width: 350, length: 600, height: 270 }
      })
    )
    expect(calc.plaqueLayout.plaques.length).toBe(9)
    expect(calc.plaqueLayout.naivePlaqueCount).toBe(9)
    expect(calc.plaqueLayout.fullPlaquesNeeded).toBe(8)
    const plaque = calc.materials.find((m) => m.id === 'ba13')!
    // 8 × 1.10 waste = 8.8 → 9 plaques shopping list (not 10).
    expect(plaque.quantity).toBe(9)
  })

  it('cloison plaque count uses the smart layout per face, not area/3', () => {
    // 3 m × 2.70 m cloison, both faces.
    // Per face (300 × 270 cm) smart layout:
    //   cols: 300/120 = 2.5 → 3 cols (last is 60 cm wide)
    //   rows: 270/250 = 1.08 → 2 rows (last is 20 cm tall)
    //   3 × 2 = 6 cells. Smart count:
    //     - (0,0), (1,0): full → 2 plaques
    //     - (0,1), (1,1): length strips 120 × 20 → ceil(40/250)=1 plaque
    //     - (2,0): width strip 60 × 250 → ceil(60/120)=1 plaque
    //     - (2,1): corner 60 × 20 → 1 plaque
    //   Per face = 5 plaques → both faces = 10
    // Plus 10% waste = 11 plaques for the cloison alone.
    const calc = calculate(
      blankDesign({
        objects: [
          {
            id: 'wall',
            kind: 'cloison',
            moduleId: 'cloison-standard',
            x: 50, y: 200, width: 300, height: 7, rotation: 0,
            data: { thickness: 7, wallHeight: 270 }
          }
        ]
      })
    )
    // Ceiling (4×5 m) needs 7 fresh + 10% waste → 8 plaques.
    // Cloison adds 11. Total → 19 plaques on the BA13 line.
    const plaque = calc.materials.find((m) => m.id === 'ba13')!
    expect(plaque.quantity).toBe(8 + 11)
  })

  it('cloison adds both faces to billable area', () => {
    const calc = calculate(
      blankDesign({
        objects: [
          {
            id: 'c1',
            kind: 'cloison',
            moduleId: 'cloison-standard',
            x: 100, y: 100, width: 300, height: 7, rotation: 0,
            data: { thickness: 7, wallHeight: 270 }
          }
        ]
      })
    )
    // 3 m × 2.7 m × 2 sides = 16.2 m²
    expect(calc.geometry.cloisonAreaM2).toBeCloseTo(16.2, 2)
    expect(calc.geometry.billableM2).toBeCloseTo(20 + 16.2, 2)
  })
})
