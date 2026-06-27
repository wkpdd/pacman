import { describe, expect, it } from 'vitest'
import {
  ceilTo,
  cmToM,
  formatDZD,
  mToCm,
  polylineLengthM,
  rectAreaM2,
  rectPerimeterM
} from './units'

describe('units', () => {
  it('converts cm ↔ m', () => {
    expect(cmToM(250)).toBe(2.5)
    expect(mToCm(2.5)).toBe(250)
  })

  it('rectAreaM2: 4×5 m room is 20 m²', () => {
    expect(rectAreaM2(400, 500)).toBe(20)
  })

  it('rectPerimeterM: 4×5 m room is 18 ml', () => {
    expect(rectPerimeterM(400, 500)).toBe(18)
  })

  it('polylineLengthM: closed rectangle path length', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 0 }
    ]
    expect(polylineLengthM(square)).toBe(4)
  })

  it('polylineLengthM: degenerate inputs', () => {
    expect(polylineLengthM([])).toBe(0)
    expect(polylineLengthM([{ x: 0, y: 0 }])).toBe(0)
  })

  it('ceilTo rounds up to purchasable quantum', () => {
    expect(ceilTo(7.1, 1)).toBe(8)
    expect(ceilTo(7.0, 1)).toBe(7)
    expect(ceilTo(7.1, 5)).toBe(10)
  })

  it('formatDZD has no decimals and DA suffix', () => {
    // Intl uses U+202F (narrow no-break space) as the group separator
    expect(formatDZD(12345)).toMatch(/12[\s ]345\s*DA/)
    expect(formatDZD(0)).toMatch(/^0\s*DA$/)
    expect(formatDZD(1234.7)).toMatch(/1[\s ]235\s*DA/) // rounds, no decimals
  })
})
