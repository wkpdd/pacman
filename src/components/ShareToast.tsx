import { useEffect } from 'react'
import type { ClientInfo, Tenant, Totals } from '@/types'
import { formatDZD } from '@/utils/units'

interface Props {
  tenant: Tenant
  client: ClientInfo
  totals: Totals
  designName: string
  onClose: () => void
}

/**
 * Toast pop-up shown after a PDF export. Composes a WhatsApp deep-link
 * with the quote summary so the contractor sends the price to the client
 * with one tap. wa.me works on Android + iOS + desktop without setup.
 */
export function ShareToast({ tenant, client, totals, designName, onClose }: Props): React.JSX.Element {
  useEffect(() => {
    const id = window.setTimeout(onClose, 12_000)
    return () => window.clearTimeout(id)
  }, [onClose])

  // Strip phone to digits; wa.me wants an international number with no plus
  const phoneDigits = (client.phone ?? '').replace(/[^\d]/g, '')
  const message = [
    `Bonjour ${client.name || ''}`.trim() + ',',
    `Voici le devis pour : ${designName}.`,
    `Total : ${formatDZD(totals.totalTTC)} (TVA incluse${totals.timbre > 0 ? ', timbre inclus' : ''}).`,
    `Devis valable 14 jours.`,
    ``,
    `— ${tenant.name}`,
    tenant.phone
  ].filter(Boolean).join('\n')

  const href = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`

  return (
    <div className="toast" role="status">
      <span>📄 PDF généré.</span>
      <a className="toast-wa" href={href} target="_blank" rel="noopener noreferrer">
        💬 Envoyer sur WhatsApp
      </a>
      <button className="toast-close" onClick={onClose} aria-label="Fermer">✕</button>
    </div>
  )
}
