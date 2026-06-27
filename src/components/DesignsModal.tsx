import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Design } from '@/types'
import { listDesigns, deleteDesign } from '@/store/db'
import { useTenantStore } from '@/store/tenantStore'
import { useCanvasStore } from '@/store/canvasStore'
import { formatDZD } from '@/utils/units'

interface Props { onClose: () => void }

export function DesignsModal({ onClose }: Props): React.JSX.Element | null {
  const { t } = useTranslation()
  const tenant = useTenantStore((s) => s.tenant)
  const loadDesign = useCanvasStore((s) => s.loadDesign)
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!tenant) return
      const list = await listDesigns(tenant.id)
      if (!cancelled) {
        setDesigns(list)
        setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [tenant])

  const onLoad = (d: Design) => {
    loadDesign(d)
    onClose()
  }

  const onDelete = async (id: string) => {
    await deleteDesign(id)
    setDesigns((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal designs-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{t('app.open')}</h2>
          <button onClick={onClose}>✕</button>
        </header>
        <div className="modal-body">
          {loading && <p className="muted">…</p>}
          {!loading && designs.length === 0 && (
            <p className="muted">Aucun devis enregistré pour l'instant.</p>
          )}
          <ul className="designs-list">
            {designs.map((d) => (
              <li key={d.id} className="design-row">
                <button className="design-open" onClick={() => onLoad(d)}>
                  <strong className="design-name-row">{d.name || '(sans nom)'}</strong>
                  <span className="design-meta">
                    {d.client.name && <em>{d.client.name}</em>}
                    <span>{new Date(d.updatedAt).toLocaleDateString('fr-FR')} · {d.objects.length} obj.</span>
                  </span>
                  {d.totals && <span className="design-total">{formatDZD(d.totals.totalTTC)}</span>}
                </button>
                <button className="design-del" onClick={() => onDelete(d.id)} title={t('app.delete')}>🗑</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
