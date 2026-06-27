import { useTranslation } from 'react-i18next'
import { useCanvasStore } from '@/store/canvasStore'
import { findModule } from '@/modules/faux-plafond/library'

export function PropertiesPanel(): React.JSX.Element {
  const { t } = useTranslation()
  const room = useCanvasStore((s) => s.room)
  const setRoom = useCanvasStore((s) => s.setRoom)
  const selectionId = useCanvasStore((s) => s.selectionId)
  const obj = useCanvasStore((s) => s.objects.find((o) => o.id === selectionId))
  const updateObject = useCanvasStore((s) => s.updateObject)
  const patchData = useCanvasStore((s) => s.patchObjectData)
  const removeObject = useCanvasStore((s) => s.removeObject)
  const duplicateObject = useCanvasStore((s) => s.duplicateObject)

  return (
    <aside className="properties-panel">
      <section className="panel-section">
        <h3>{t('room.title')}</h3>
        <NumField
          label={t('room.width')}
          value={room.width}
          step={10}
          min={50}
          onChange={(v) => setRoom({ width: v })}
          suffix="cm"
        />
        <NumField
          label={t('room.length')}
          value={room.length}
          step={10}
          min={50}
          onChange={(v) => setRoom({ length: v })}
          suffix="cm"
        />
        <NumField
          label={t('room.height')}
          value={room.height}
          step={5}
          min={200}
          onChange={(v) => setRoom({ height: v })}
          suffix="cm"
        />
      </section>

      {obj && (
        <section className="panel-section">
          <h3>{findModule(obj.moduleId)?.labelFr ?? obj.kind}</h3>
          <div className="prop-grid">
            <NumField label="X" value={Math.round(obj.x)} step={5} onChange={(v) => updateObject(obj.id, { x: v })} suffix="cm" />
            <NumField label="Y" value={Math.round(obj.y)} step={5} onChange={(v) => updateObject(obj.id, { y: v })} suffix="cm" />
            <NumField label="W" value={Math.round(obj.width)} step={5} onChange={(v) => updateObject(obj.id, { width: v })} suffix="cm" />
            <NumField label="H" value={Math.round(obj.height)} step={5} onChange={(v) => updateObject(obj.id, { height: v })} suffix="cm" />
            <NumField label="↻" value={Math.round(obj.rotation)} step={5} onChange={(v) => updateObject(obj.id, { rotation: v })} suffix="°" />
          </div>

          {obj.kind === 'spotlight-grid' && (
            <div className="prop-grid">
              <NumField label="Lignes" value={obj.data?.rows ?? 3} min={1} max={20} step={1} onChange={(v) => patchData(obj.id, { rows: v })} />
              <NumField label="Colonnes" value={obj.data?.cols ?? 3} min={1} max={20} step={1} onChange={(v) => patchData(obj.id, { cols: v })} />
            </div>
          )}
          {obj.kind === 'retombee' && (
            <NumField
              label="Hauteur retombée"
              value={obj.data?.drop ?? 25}
              min={5}
              step={5}
              suffix="cm"
              onChange={(v) => patchData(obj.id, { drop: v })}
            />
          )}
          {obj.kind === 'corniche' && (
            <div className="corniche-controls">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={obj.data?.perimeter !== false}
                  onChange={(e) => patchData(obj.id, { perimeter: e.target.checked })}
                />
                <span>Suivre le périmètre</span>
              </label>
              {obj.data?.perimeter !== false && (
                <div className="side-toggles" aria-label="Côtés">
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                    const active = (obj.data?.sides ?? ['top', 'right', 'bottom', 'left']).includes(side)
                    return (
                      <button
                        key={side}
                        className={active ? `side side-${side} on` : `side side-${side}`}
                        onClick={() => {
                          const cur = obj.data?.sides ?? ['top', 'right', 'bottom', 'left']
                          const next = active ? cur.filter((s) => s !== side) : [...cur, side]
                          patchData(obj.id, { sides: next })
                        }}
                        title={side}
                      >
                        {side === 'top' ? '▔' : side === 'bottom' ? '▁' : side === 'left' ? '▏' : '▕'}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="prop-actions">
            <button onClick={() => duplicateObject(obj.id)}>⧉ {t('app.duplicate')}</button>
            <button className="danger" onClick={() => removeObject(obj.id)}>🗑 {t('app.delete')}</button>
          </div>
        </section>
      )}
    </aside>
  )
}

function NumField({
  label,
  value,
  step = 1,
  min,
  max,
  onChange,
  suffix
}: {
  label: string
  value: number
  step?: number
  min?: number
  max?: number
  onChange: (v: number) => void
  suffix?: string
}) {
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
