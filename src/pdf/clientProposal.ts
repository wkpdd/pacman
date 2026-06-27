import jsPDF from 'jspdf'
import type { Design, Tenant } from '@/types'
import { drawFooter, drawHeader } from './branding'
import { formatDZD, formatNumber } from '@/utils/units'
import type { CalcResult } from '@/modules/faux-plafond/calculations'

/**
 * Client-facing proposal: hero render + simple total. No cost basis, no
 * waste %, no internal line counts. The client must see beauty and one
 * number.
 */
export function exportClientProposal(
  tenant: Tenant,
  design: Design,
  calc: CalcResult,
  /** PNG dataURL exported from the Konva stage at print resolution */
  renderDataUrl: string
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const isInvoice = !!design.invoiceNumber
  drawHeader(doc, tenant, isInvoice ? `Facture ${design.invoiceNumber}` : 'Proposition')

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(design.name || 'Faux plafond', 10, 42)

  // Client block
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  let y = 52
  if (design.client.name) {
    doc.text(`Client : ${design.client.name}`, 10, y); y += 5
  }
  if (design.client.phone) {
    doc.text(`Tél : ${design.client.phone}`, 10, y); y += 5
  }
  if (design.client.address || design.client.city) {
    doc.text(`Adresse : ${[design.client.address, design.client.city].filter(Boolean).join(', ')}`, 10, y); y += 5
  }
  doc.text(`Surface : ${formatNumber(calc.geometry.ceilingAreaM2, 2)} m²`, 10, y); y += 5

  // Hero render
  const imgY = Math.max(y + 4, 80)
  try {
    doc.addImage(renderDataUrl, 'PNG', 10, imgY, 190, 110, undefined, 'FAST')
  } catch {
    /* ignore — render failed */
  }

  // Big total
  const totalY = imgY + 122
  doc.setDrawColor(245, 158, 11)
  doc.setLineWidth(0.8)
  doc.rect(10, totalY, 190, 28)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Total TTC', 16, totalY + 10)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(formatDZD(calc.totals.totalTTC), 194, totalY + 18, { align: 'right' })
  doc.setTextColor(120)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Sous-total HT ${formatDZD(calc.totals.subtotalHT)}  ·  TVA 19% ${formatDZD(calc.totals.tva)}${calc.totals.timbre > 0 ? `  ·  Timbre ${formatDZD(calc.totals.timbre)}` : ''}`,
    16,
    totalY + 24
  )

  // Validity + thanks
  doc.setTextColor(0)
  doc.setFontSize(10)
  const validUntil = new Date(Date.now() + 14 * 24 * 3600 * 1000)
  doc.text(`Devis valable jusqu’au ${validUntil.toLocaleDateString('fr-FR')}.`, 10, totalY + 38)
  doc.setFont('helvetica', 'italic')
  doc.text('Merci de votre confiance.', 10, totalY + 44)

  drawFooter(doc, tenant)
  doc.save(`${(design.name || 'devis').replace(/[^a-z0-9-_]+/gi, '_')}_client.pdf`)
}
