import type { Tenant } from '@/types'
import type jsPDF from 'jspdf'

/** Draws the contractor header band on the current page. */
export function drawHeader(doc: jsPDF, tenant: Tenant, title: string): void {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, W, 28, 'F')
  if (tenant.logoDataUrl) {
    try {
      doc.addImage(tenant.logoDataUrl, 'PNG', 10, 6, 16, 16)
    } catch {
      /* ignore — bad logo data */
    }
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(tenant.name || 'Atelier', 32, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${tenant.address} ${tenant.city}`.trim(), 32, 20)
  doc.text(tenant.phone, 32, 25)

  doc.setTextColor(245, 158, 11)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(title, W - 10, 18, { align: 'right' })
  doc.setTextColor(0, 0, 0)
}

export function drawFooter(doc: jsPDF, tenant: Tenant): void {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  doc.setDrawColor(200)
  doc.line(10, H - 18, W - 10, H - 18)
  doc.setFontSize(8)
  doc.setTextColor(80)
  const legal: string[] = []
  if (tenant.legal?.rc) legal.push(`RC ${tenant.legal.rc}`)
  if (tenant.legal?.nif) legal.push(`NIF ${tenant.legal.nif}`)
  if (tenant.legal?.nis) legal.push(`NIS ${tenant.legal.nis}`)
  if (tenant.legal?.ai) legal.push(`AI ${tenant.legal.ai}`)
  doc.text(legal.join(' · '), 10, H - 12)
  doc.text(`${tenant.name} — ${tenant.phone}`, W - 10, H - 12, { align: 'right' })
  doc.setTextColor(0, 0, 0)
}
