import type { PaymentMode, Totals } from '@/types'

/** Algerian VAT, 19 % standard rate. */
export const TVA_RATE = 0.19

/**
 * Droit de timbre on cash payments — 1 % of TTC, capped at 10 000 DA per
 * receipt under current rules. Bank/cheque payments are exempt. We model
 * the rate + cap; callers can override per-tenant if rules shift.
 */
export const TIMBRE_RATE = 0.01
export const TIMBRE_CAP = 10_000

export interface ComputeTotalsInput {
  materialsHT: number
  laborHT: number
  paymentMode: PaymentMode
  /** estimated cost basis for margin reporting (never printed to client) */
  costBasis?: number
}

export function computeTotals({
  materialsHT,
  laborHT,
  paymentMode,
  costBasis
}: ComputeTotalsInput): Totals {
  const subtotalHT = materialsHT + laborHT
  const tva = subtotalHT * TVA_RATE
  const ttcBeforeTimbre = subtotalHT + tva
  const timbre =
    paymentMode === 'cash'
      ? Math.min(ttcBeforeTimbre * TIMBRE_RATE, TIMBRE_CAP)
      : 0
  const totalTTC = ttcBeforeTimbre + timbre
  const marginPct =
    costBasis && costBasis > 0
      ? ((subtotalHT - costBasis) / subtotalHT) * 100
      : 0
  return {
    materialsHT,
    laborHT,
    subtotalHT,
    tva,
    timbre,
    totalTTC,
    marginPct
  }
}
