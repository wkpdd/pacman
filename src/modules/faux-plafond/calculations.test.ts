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

  it('rounds plaque BA13 up to whole plaques with 10 % waste', () => {
    const plaque = calc.materials.find((m) => m.id === 'ba13')!
    // 20 m² × 1.10 / 3 m² = 7.33 → 8 plaques
    expect(plaque.quantity).toBe(8)
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

  it('LED driver count matches the polyline length / 5 m', () => {
    const led = calc.decorative.find((d) => d.kind === 'led-strip')
    const driver = calc.materials.find((m) => m.id === 'driver-led')
    // sample salon LED loops 340+440+340+440 cm = 15.6 m -> ceil(15.6/5) = 4 drivers
    expect(led?.quantity).toBeGreaterThan(15)
    expect(driver?.quantity).toBe(4)
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
