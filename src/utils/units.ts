/** Internal canvas unit is the centimeter. UI may display cm or m. */

export const CM_PER_M = 100

export function cmToM(cm: number): number {
  return cm / CM_PER_M
}

export function mToCm(m: number): number {
  return m * CM_PER_M
}

/** Area of a rectangle in m², input in cm. */
export function rectAreaM2(widthCm: number, lengthCm: number): number {
  return cmToM(widthCm) * cmToM(lengthCm)
}

/** Perimeter of a rectangle in ml, input in cm. */
export function rectPerimeterM(widthCm: number, lengthCm: number): number {
  return 2 * (cmToM(widthCm) + cmToM(lengthCm))
}

/** Length of a polyline (cm points) in ml. */
export function polylineLengthM(points: { x: number; y: number }[]): number {
  if (points.length < 2) return 0
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    total += Math.hypot(dx, dy)
  }
  return cmToM(total)
}

/** Round up to a purchasable quantum (e.g. plaques sold by unit). */
export function ceilTo(value: number, quantum = 1): number {
  return Math.ceil(value / quantum) * quantum
}

/** Algerian DZD formatter — no decimals, ASCII spaces for jsPDF compat. */
const dzd = new Intl.NumberFormat('fr-FR', {
  style: 'decimal',
  maximumFractionDigits: 0
})

/**
 * Intl's "fr-FR" formatter emits U+202F (narrow no-break space) as the
 * thousands separator. The default Helvetica font shipped with jsPDF has
 * no glyph for it and renders a "/", which looks like a typo on the
 * client PDF. Normalize narrow + regular no-break spaces to ASCII space
 * for both the DOM and the PDFs.
 */
function normalizeSpaces(s: string): string {
  return s.replace(/[  ]/g, ' ')
}

export function formatDZD(value: number): string {
  return `${normalizeSpaces(dzd.format(Math.round(value)))} DA`
}

export function formatNumber(value: number, digits = 2): string {
  return normalizeSpaces(
    new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0
    }).format(value)
  )
}
