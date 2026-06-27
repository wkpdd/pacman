import { describe, expect, it } from 'vitest'
import {
  ceilTo,
  cmToM,
  formatDZD,
  formatNumber,
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
    expect(formatDZD(12345)).toBe('12 345 DA')
    expect(formatDZD(0)).toBe('0 DA')
    expect(formatDZD(1234.7)).toBe('1 235 DA') // rounds, no decimals
  })

  it('formatDZD uses ASCII space — jsPDF Helvetica has no glyph for U+202F', () => {
    const s = formatDZD(148_266)
    // Regression: Intl fr-FR emits U+202F (narrow nbsp) and U+00A0 nbsp;
    // both render as "/" in jsPDF and look like a typo on the client PDF.
    expect(s).not.toMatch(/[  ]/)
    expect(s).toBe('148 266 DA')
  })

  it('formatNumber also avoids narrow no-break spaces', () => {
    const s = formatNumber(1234567.89, 2)
    expect(s).not.toMatch(/[  ]/)
    expect(s).toBe('1 234 567,89')
  })
})
