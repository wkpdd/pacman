import jsPDF from 'jspdf'
import type { Design, Tenant } from '@/types'
import { drawFooter, drawHeader } from './branding'
import { formatNumber } from '@/utils/units'
import type { CalcResult } from '@/modules/faux-plafond/calculations'

/**
 * Worker-facing technical plan: dimensioned plan + cut list + shopping
 * list. Printable on cheap paper, unambiguous. NO prices — workers don't
 * need them and contractors don't want them visible to clients.
 */
export function exportWorkerPlan(
  tenant: Tenant,
  design: Design,
  calc: CalcResult,
  /** PNG dataURL with dimensions overlay */
  planDataUrl: string
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawHeader(doc, tenant, 'Plan d’exécution')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(design.name || 'Faux plafond', 10, 42)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Pièce : ${(design.room.width / 100).toFixed(2)} × ${(design.room.length / 100).toFixed(2)} m  ·  H = ${(design.room.height / 100).toFixed(2)} m`,
    10,
    49
  )
  doc.text(
    `Surface plafond : ${formatNumber(calc.geometry.ceilingAreaM2, 2)} m²  ·  Périmètre : ${formatNumber(calc.geometry.perimeterM, 2)} ml`,
    10,
    55
  )
  if (calc.geometry.retombeeAreaM2 > 0) {
    doc.text(
      `Retombée : ${formatNumber(calc.geometry.retombeeAreaM2, 2)} m² horiz · ${formatNumber(calc.geometry.retombeeVerticalM2, 2)} m² vertical`,
      10,
      61
    )
  }

  // Dimensioned plan
  try {
    doc.addImage(planDataUrl, 'PNG', 10, 66, 190, 110, undefined, 'FAST')
  } catch {
    /* ignore */
  }

  // Shopping list
  let y = 184
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Liste de matériaux', 10, y)
  y += 4
  doc.setLineWidth(0.2)
  doc.line(10, y, 200, y)
  y += 5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  for (const m of calc.materials) {
    if (y > 275) { doc.addPage(); drawHeader(doc, tenant, 'Plan d’exécution'); y = 42 }
    doc.text(m.labelFr, 10, y)
    doc.text(
      `${formatNumber(m.quantity, 2)} ${m.unit}${m.note ? `  (${m.note})` : ''}`,
      200,
      y,
      { align: 'right' }
    )
    y += 5
  }

  for (const d of calc.decorative) {
    if (y > 275) { doc.addPage(); drawHeader(doc, tenant, 'Plan d’exécution'); y = 42 }
    doc.text(d.labelFr, 10, y)
    doc.text(`${formatNumber(d.quantity, 2)} ${d.unit}`, 200, y, { align: 'right' })
    y += 5
  }

  drawFooter(doc, tenant)
  doc.save(`${(design.name || 'plan').replace(/[^a-z0-9-_]+/gi, '_')}_plan.pdf`)
}
