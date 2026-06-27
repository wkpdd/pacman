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

/** Algerian DZD formatter — no decimals, thin space group separator. */
const dzd = new Intl.NumberFormat('fr-FR', {
  style: 'decimal',
  maximumFractionDigits: 0
})

export function formatDZD(value: number): string {
  return `${dzd.format(Math.round(value))} DA`
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  }).format(value)
}
