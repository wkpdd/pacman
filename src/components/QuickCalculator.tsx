import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Design } from '@/types'
import { calculate } from '@/modules/faux-plafond/calculations'
import { newId } from '@/utils/id'
import { useTenantStore } from '@/store/tenantStore'
import { formatDZD, formatNumber } from '@/utils/units'
import { RATIOS } from '@/modules/faux-plafond/defaults'

interface Props { onClose: () => void; onPromoteToCanvas: (room: { width: number; length: number; height: number }) => void }

/**
 * Form-only calculator — the lead magnet. No canvas required. Contractor
 * types room size + a couple of options and sees the full price + material
 * list. Designed to pull users into the product; the "Open in canvas"
 * action promotes them to the full designer.
 */
export function QuickCalculator({ onClose, onPromoteToCanvas }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const tenant = useTenantStore((s) => s.tenant)
  const [w, setW] = useState<number>(400) // cm
  const [l, setL] = useState<number>(500)
  const [h, setH] = useState<number>(270)
  const [withPerimeterCorniche, setWithCorniche] = useState(true)
  const [withCentralRosace, setWithRosace] = useState(false)
  const [spotCount, setSpotCount] = useState<number>(6)
  const [ledLengthM, setLedLengthM] = useState<number>(0)
  const [wastePct, setWastePct] = useState<number>(RATIOS.wastePct * 100)
  const [laborPerM2, setLaborPerM2] = useState<number>(RATIOS.laborPerM2)
  const [paymentCash, setPaymentCash] = useState(true)

  const design: Design = useMemo(() => {
    const objects: Design['objects'] = []
    if (withPerimeterCorniche) {
      objects.push({
        id: newId(),
        kind: 'corniche',
        moduleId: 'corniche-classic-8',
        x: 0, y: 0, width: 200, height: 8, rotation: 0,
        data: { perimeter: true, sides: ['top', 'right', 'bottom', 'left'] }
      })
    }
    if (withCentralRosace) {
      objects.push({
        id: newId(),
        kind: 'rosace',
        moduleId: 'rosace-d60',
        x: w / 2 - 30, y: l / 2 - 30, width: 60, height: 60, rotation: 0
      })
    }
    if (spotCount > 0) {
      const cols = Math.max(1, Math.round(Math.sqrt(spotCount * (w / l))))
      const rows = Math.max(1, Math.ceil(spotCount / cols))
      objects.push({
        id: newId(),
        kind: 'spotlight-grid',
        moduleId: 'spot-grid',
        x: 30, y: 30, width: w - 60, height: l - 60, rotation: 0,
        data: { rows, cols }
      })
    }
    if (ledLengthM > 0) {
      objects.push({
        id: newId(),
        kind: 'led-strip',
        moduleId: 'led-strip-warm',
        x: 0, y: 0, width: ledLengthM * 100, height: 1, rotation: 0,
        data: { points: [{ x: 0, y: 0 }, { x: ledLengthM * 100, y: 0 }] }
      })
    }
    return {
      id: 'calc',
      tenantId: tenant?.id ?? '',
      name: 'Calculateur rapide',
      status: 'draft',
      client: { name: '' },
      room: { width: w, length: l, height: h },
      objects,
      options: {
        wastePct: wastePct / 100,
        laborPerM2,
        paymentMode: paymentCash ? 'cash' : 'bank'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }, [w, l, h, withPerimeterCorniche, withCentralRosace, spotCount, ledLengthM, wastePct, laborPerM2, paymentCash, tenant?.id])

  const calc = calculate(design)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal calc-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Calculateur rapide — faux plafond</h2>
          <button onClick={onClose}>✕</button>
        </header>
        <div className="modal-body calc-body">
          <div className="calc-form">
            <h3>Pièce</h3>
            <div className="row-grid">
              <Num label={t('room.width')} value={w} step={10} min={50} suffix="cm" onChange={setW} />
              <Num label={t('room.length')} value={l} step={10} min={50} suffix="cm" onChange={setL} />
            </div>
            <Num label={t('room.height')} value={h} step={5} min={200} suffix="cm" onChange={setH} />

            <h3>Éléments</h3>
            <label className="toggle">
              <input type="checkbox" checked={withPerimeterCorniche} onChange={(e) => setWithCorniche(e.target.checked)} />
              <span>Corniche périmètre</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={withCentralRosace} onChange={(e) => setWithRosace(e.target.checked)} />
              <span>Rosace centrale Ø60</span>
            </label>
            <Num label="Nombre de spots" value={spotCount} min={0} max={50} step={1} onChange={setSpotCount} />
            <Num label="Longueur LED" value={ledLengthM} min={0} step={0.5} suffix="ml" onChange={setLedLengthM} />

            <h3>Tarif</h3>
            <div className="row-grid">
              <Num label={t('pricing.waste')} value={wastePct} min={0} max={50} step={1} onChange={setWastePct} />
              <Num label={t('pricing.laborPerM2')} value={laborPerM2} min={0} step={50} suffix="DA" onChange={setLaborPerM2} />
            </div>
            <label className="toggle">
              <input type="checkbox" checked={paymentCash} onChange={(e) => setPaymentCash(e.target.checked)} />
              <span>Paiement espèces (droit de timbre 1 %)</span>
            </label>
          </div>

          <aside className="calc-summary">
            <strong className="calc-total">{formatDZD(calc.totals.totalTTC)}</strong>
            <p className="muted">
              {formatNumber(calc.geometry.ceilingAreaM2, 2)} m² · périmètre {formatNumber(calc.geometry.perimeterM, 2)} ml
            </p>
            <div className="row"><span>{t('pricing.materialsHT')}</span><span>{formatDZD(calc.totals.materialsHT)}</span></div>
            <div className="row"><span>{t('pricing.laborHT')}</span><span>{formatDZD(calc.totals.laborHT)}</span></div>
            <div className="row row-strong"><span>{t('pricing.subtotalHT')}</span><span>{formatDZD(calc.totals.subtotalHT)}</span></div>
            <div className="row"><span>{t('pricing.tva')}</span><span>{formatDZD(calc.totals.tva)}</span></div>
            {calc.totals.timbre > 0 && (
              <div className="row"><span>{t('pricing.timbre')}</span><span>{formatDZD(calc.totals.timbre)}</span></div>
            )}
            <div className="row row-strong"><span>{t('pricing.total')}</span><span>{formatDZD(calc.totals.totalTTC)}</span></div>
            <ul className="lines">
              {[...calc.materials, ...calc.decorative].map((l) => (
                <li key={l.id}>
                  <span className="line-label">{l.labelFr}</span>
                  <span className="line-qty">{formatNumber(l.quantity, 2)} {l.unit}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
        <footer className="modal-footer">
          <button className="btn-primary" onClick={() => { onPromoteToCanvas({ width: w, length: l, height: h }); onClose() }}>
            ✏️ Ouvrir dans le designer
          </button>
        </footer>
      </div>
    </div>
  )
}

function Num({
  label, value, step = 1, min, max, onChange, suffix
}: { label: string; value: number; step?: number; min?: number; max?: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="num-field">
      <span>{label}</span>
      <span className="num-control">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (Number.isFinite(v)) onChange(v)
          }}
        />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  )
}
