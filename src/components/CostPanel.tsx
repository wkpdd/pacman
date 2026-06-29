import { useTranslation } from 'react-i18next'
import { useCanvasStore } from '@/store/canvasStore'
import { useTenantStore } from '@/store/tenantStore'
import { calculate } from '@/modules/faux-plafond/calculations'
import { formatDZD, formatNumber } from '@/utils/units'
import { useMemo, useState } from 'react'
import type { ClientInfo, Design, PaymentMode, PlaqueType } from '@/types'
import { RATIOS } from '@/modules/faux-plafond/defaults'
import { PLAQUE_TYPE } from '@/modules/faux-plafond/library'

export function useCalc() {
  const room = useCanvasStore((s) => s.room)
  const objects = useCanvasStore((s) => s.objects)
  const designId = useCanvasStore((s) => s.designId)
  const designName = useCanvasStore((s) => s.designName)
  const tenant = useTenantStore((s) => s.tenant)
  const [options, setOptions] = useState<Design['options']>({
    wastePct: RATIOS.wastePct,
    laborPerM2: RATIOS.laborPerM2,
    paymentMode: 'cash',
    plaqueType: 'standard',
    doubleLayer: false
  })
  const [client, setClient] = useState<ClientInfo>({ name: '' })

  const design: Design = useMemo(
    () => ({
      id: designId,
      tenantId: tenant?.id ?? '',
      name: designName,
      status: 'draft',
      client,
      room,
      objects,
      options,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }),
    [designId, tenant?.id, designName, client, room, objects, options]
  )

  const result = useMemo(() => calculate(design), [design])

  return { design, result, options, setOptions, client, setClient }
}

interface Props {
  result: ReturnType<typeof calculate>
  options: Design['options']
  setOptions: (o: Design['options']) => void
  client: ClientInfo
  setClient: (c: ClientInfo) => void
}

export function CostPanel({ result, options, setOptions, client, setClient }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const { totals, geometry, materials, decorative } = result
  return (
    <section className="cost-panel">
      <header className="cost-header">
        <strong className="cost-total">{formatDZD(totals.totalTTC)}</strong>
        <span className="cost-area">
          {formatNumber(geometry.ceilingAreaM2, 2)} m² · {formatNumber(geometry.perimeterM, 2)} ml
        </span>
      </header>

      <section className="panel-section">
        <h3>{t('client.title')}</h3>
        <input className="text-field" placeholder={t('client.name')} value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
        <input className="text-field" placeholder={t('client.phone')} value={client.phone ?? ''} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
        <input className="text-field" placeholder={t('client.address')} value={client.address ?? ''} onChange={(e) => setClient({ ...client, address: e.target.value })} />
        <input className="text-field" placeholder={t('client.city')} value={client.city ?? ''} onChange={(e) => setClient({ ...client, city: e.target.value })} />
      </section>

      <section className="panel-section">
        <h3>{t('pricing.subtotalHT')}</h3>
        <Row label={t('pricing.materialsHT')} value={formatDZD(totals.materialsHT)} />
        <Row label={t('pricing.laborHT')} value={formatDZD(totals.laborHT)} />
        <Row label={t('pricing.subtotalHT')} value={formatDZD(totals.subtotalHT)} strong />
        <Row label={t('pricing.tva')} value={formatDZD(totals.tva)} />
        {totals.timbre > 0 && <Row label={t('pricing.timbre')} value={formatDZD(totals.timbre)} />}
        <Row label={t('pricing.total')} value={formatDZD(totals.totalTTC)} strong />

        <div className="cost-opts">
          <label>
            <span>{t('pricing.waste')}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={50}
              step={1}
              value={Math.round((options.wastePct ?? 0.1) * 100)}
              onChange={(e) => setOptions({ ...options, wastePct: parseFloat(e.target.value) / 100 })}
            />
          </label>
          <label>
            <span>{t('pricing.laborPerM2')}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={50}
              value={options.laborPerM2}
              onChange={(e) => setOptions({ ...options, laborPerM2: parseFloat(e.target.value) })}
            />
          </label>
          <label>
            <span>{t('pricing.payment')}</span>
            <select
              value={options.paymentMode}
              onChange={(e) => setOptions({ ...options, paymentMode: e.target.value as PaymentMode })}
            >
              <option value="cash">{t('pricing.paymentCash')}</option>
              <option value="bank">{t('pricing.paymentBank')}</option>
              <option value="cheque">{t('pricing.paymentCheque')}</option>
            </select>
          </label>
          <label>
            <span>Type plaque</span>
            <select
              value={options.plaqueType ?? 'standard'}
              onChange={(e) => setOptions({ ...options, plaqueType: e.target.value as PlaqueType })}
            >
              {Object.entries(PLAQUE_TYPE).map(([key, info]) => (
                <option key={key} value={key}>{info.labelFr}</option>
              ))}
            </select>
          </label>
          <label className="toggle wide">
            <input
              type="checkbox"
              checked={!!options.doubleLayer}
              onChange={(e) => setOptions({ ...options, doubleLayer: e.target.checked })}
            />
            <span>2 couches BA13 (BA25)</span>
          </label>
        </div>
      </section>

      <section className="panel-section">
        <h3>Métrés placo</h3>
        <Row label="Surface plafond" value={`${formatNumber(geometry.ceilingAreaM2, 2)} m²`} />
        {geometry.obstacleAreaM2 > 0 && (
          <Row label="− Obstacles" value={`${formatNumber(geometry.obstacleAreaM2, 2)} m²`} />
        )}
        {geometry.retombeeAreaM2 > 0 && (
          <Row label="+ Retombée" value={`${formatNumber(geometry.retombeeAreaM2 + geometry.retombeeVerticalM2, 2)} m²`} />
        )}
        {geometry.cloisonAreaM2 > 0 && (
          <Row label="+ Cloisons (2 faces)" value={`${formatNumber(geometry.cloisonAreaM2, 2)} m²`} />
        )}
        <Row label="Surface facturée" value={`${formatNumber(geometry.billableM2, 2)} m²`} strong />
        <Row
          label="Plaques (layout)"
          value={`${result.plaqueLayout.fullPlaquesNeeded} plaques fraîches · ${result.plaqueLayout.naivePlaqueCount} cellules${result.plaqueLayout.naivePlaqueCount !== result.plaqueLayout.fullPlaquesNeeded ? ` (économie : ${result.plaqueLayout.naivePlaqueCount - result.plaqueLayout.fullPlaquesNeeded})` : ''}`}
        />
      </section>

      <section className="panel-section scroll-section">
        <h3>{t('pdf.shopping')}</h3>
        <ul className="lines">
          {materials.map((m) => (
            <li key={m.id}>
              <span className="line-label">{m.labelFr}</span>
              <span className="line-qty">{formatNumber(m.quantity, 2)} {m.unit}</span>
              <span className="line-total">{formatDZD(m.totalDZD)}</span>
            </li>
          ))}
          {decorative.map((d) => (
            <li key={d.id}>
              <span className="line-label">{d.labelFr}</span>
              <span className="line-qty">{formatNumber(d.quantity, 2)} {d.unit}</span>
              <span className="line-total">{formatDZD(d.totalDZD)}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'row row-strong' : 'row'}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
