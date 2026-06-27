import { describe, expect, it } from 'vitest'
import { TIMBRE_CAP, computeTotals } from './fiscal'

describe('computeTotals — Algerian fiscal rules', () => {
  it('applies TVA 19 % on the HT subtotal', () => {
    const t = computeTotals({ materialsHT: 100_000, laborHT: 20_000, paymentMode: 'bank' })
    expect(t.subtotalHT).toBe(120_000)
    expect(t.tva).toBeCloseTo(22_800, 5)
    expect(t.timbre).toBe(0)
    expect(t.totalTTC).toBeCloseTo(142_800, 5)
  })

  it('applies 1 % droit de timbre on cash payments', () => {
    const t = computeTotals({ materialsHT: 100_000, laborHT: 20_000, paymentMode: 'cash' })
    expect(t.timbre).toBeCloseTo(1_428, 5) // 1% of 142 800
    expect(t.totalTTC).toBeCloseTo(144_228, 5)
  })

  it('caps droit de timbre at 10 000 DA', () => {
    const t = computeTotals({ materialsHT: 50_000_000, laborHT: 0, paymentMode: 'cash' })
    expect(t.timbre).toBe(TIMBRE_CAP)
  })

  it('exempts non-cash from timbre', () => {
    for (const mode of ['bank', 'cheque'] as const) {
      const t = computeTotals({ materialsHT: 100_000, laborHT: 20_000, paymentMode: mode })
      expect(t.timbre).toBe(0)
    }
  })

  it('marginPct = 0 when no cost basis given (never expose stale margins)', () => {
    const t = computeTotals({ materialsHT: 100_000, laborHT: 20_000, paymentMode: 'bank' })
    expect(t.marginPct).toBe(0)
  })

  it('marginPct computed against cost basis', () => {
    const t = computeTotals({
      materialsHT: 100_000,
      laborHT: 20_000,
      paymentMode: 'bank',
      costBasis: 80_000
    })
    // (120k - 80k) / 120k * 100 = 33.33…
    expect(t.marginPct).toBeCloseTo(33.333, 2)
  })
})
