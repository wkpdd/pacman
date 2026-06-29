import { useTranslation } from 'react-i18next'
import { useCanvasStore } from '@/store/canvasStore'
import { findModule, LED_COLOR_INFO } from '@/modules/faux-plafond/library'
import { LayersPanel } from './LayersPanel'
import type { LedColor } from '@/types'

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
  const toggleLock = useCanvasStore((s) => s.toggleLock)
  const bringForward = useCanvasStore((s) => s.bringForward)
  const sendBackward = useCanvasStore((s) => s.sendBackward)

  return (
    <aside className="properties-panel">
      <LayersPanel />
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
        <div className="color-row">
          <ColorPicker label="Murs" value={room.wallColor ?? '#fafafa'} onChange={(c) => setRoom({ wallColor: c })} />
          <ColorPicker label="Sol" value={room.floorColor ?? '#f1f5f9'} onChange={(c) => setRoom({ floorColor: c })} />
          <ColorPicker label="Plafond" value={room.ceilingColor ?? '#ffffff'} onChange={(c) => setRoom({ ceilingColor: c })} />
        </div>
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
          {obj.kind === 'led-strip' && (
            <>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={!!obj.data?.curved}
                  onChange={(e) => patchData(obj.id, { curved: e.target.checked })}
                />
                <span>Tracé courbe</span>
              </label>
              <label className="num-field">
                <span>Couleur</span>
                <span className="num-control">
                  <select
                    value={obj.data?.ledColor ?? 'warm'}
                    onChange={(e) => patchData(obj.id, { ledColor: e.target.value as LedColor })}
                  >
                    {Object.entries(LED_COLOR_INFO).map(([k, info]) => (
                      <option key={k} value={k}>{info.labelFr}</option>
                    ))}
                  </select>
                </span>
              </label>
              <div className="prop-grid">
                <NumField
                  label="Densité"
                  value={obj.data?.ledDensity ?? 60}
                  min={30} max={240} step={30} suffix="LED/m"
                  onChange={(v) => patchData(obj.id, { ledDensity: v })}
                />
                <NumField
                  label="Puissance"
                  value={obj.data?.ledWattagePerM ?? 9.6}
                  min={2} max={30} step={0.4} suffix="W/m"
                  onChange={(v) => patchData(obj.id, { ledWattagePerM: v })}
                />
              </div>
              <div className="led-swatch" style={{ background: LED_COLOR_INFO[obj.data?.ledColor ?? 'warm'].hex }} />
            </>
          )}
          {obj.kind === 'lamp' && (
            <div className="prop-grid">
              <NumField label="Suspension" value={obj.data?.hangHeight ?? 80} min={0} step={10} suffix="cm" onChange={(v) => patchData(obj.id, { hangHeight: v })} />
              <NumField label="Ampoules" value={obj.data?.bulbCount ?? 1} min={1} max={20} step={1} onChange={(v) => patchData(obj.id, { bulbCount: v })} />
              <NumField label="W / ampoule" value={obj.data?.bulbWattage ?? 40} min={5} step={5} suffix="W" onChange={(v) => patchData(obj.id, { bulbWattage: v })} />
              <label className="num-field">
                <span>Couleur</span>
                <span className="num-control">
                  <select
                    value={obj.data?.bulbColor ?? 'warm'}
                    onChange={(e) => patchData(obj.id, { bulbColor: e.target.value as 'warm' | 'neutral' | 'cool' })}
                  >
                    <option value="warm">Chaud</option>
                    <option value="neutral">Neutre</option>
                    <option value="cool">Froid</option>
                  </select>
                </span>
              </label>
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
          {obj.kind === 'obstacle' && (
            <label className="num-field">
              <span>Libellé</span>
              <input
                type="text"
                value={obj.data?.label ?? ''}
                onChange={(e) => patchData(obj.id, { label: e.target.value })}
                placeholder="cheminée, poutre, trappe…"
              />
            </label>
          )}
          {obj.kind === 'cloison' && (
            <>
              <div className="prop-grid">
                <NumField label="Épaisseur" value={obj.data?.thickness ?? 7} min={5} max={20} step={1} suffix="cm" onChange={(v) => patchData(obj.id, { thickness: v })} />
                <NumField label="Hauteur" value={obj.data?.wallHeight ?? room.height} min={50} step={10} suffix="cm" onChange={(v) => patchData(obj.id, { wallHeight: v })} />
              </div>
              <div className="windows-editor">
                <header className="windows-header">
                  <strong>Fenêtres</strong>
                  <button
                    className="btn-add-window"
                    onClick={() => {
                      const w = obj.data?.windows ?? []
                      patchData(obj.id, {
                        windows: [...w, { x: w.length * 100 + 20, width: 80, height: 100, sill: 100 }]
                      })
                    }}
                  >+ Ajouter</button>
                </header>
                {(obj.data?.windows ?? []).map((win, idx) => (
                  <div key={idx} className="window-row">
                    <span className="window-label">F{idx + 1}</span>
                    <NumField label="X" value={win.x} step={5} suffix="cm" onChange={(v) => {
                      const ws = [...(obj.data?.windows ?? [])]
                      ws[idx] = { ...ws[idx], x: v }
                      patchData(obj.id, { windows: ws })
                    }} />
                    <NumField label="L" value={win.width} step={5} suffix="cm" onChange={(v) => {
                      const ws = [...(obj.data?.windows ?? [])]
                      ws[idx] = { ...ws[idx], width: v }
                      patchData(obj.id, { windows: ws })
                    }} />
                    <NumField label="H" value={win.height} step={5} suffix="cm" onChange={(v) => {
                      const ws = [...(obj.data?.windows ?? [])]
                      ws[idx] = { ...ws[idx], height: v }
                      patchData(obj.id, { windows: ws })
                    }} />
                    <NumField label="Allège" value={win.sill} step={5} suffix="cm" onChange={(v) => {
                      const ws = [...(obj.data?.windows ?? [])]
                      ws[idx] = { ...ws[idx], sill: v }
                      patchData(obj.id, { windows: ws })
                    }} />
                    <button className="layer-icon-btn danger" onClick={() => {
                      const ws = (obj.data?.windows ?? []).filter((_, i) => i !== idx)
                      patchData(obj.id, { windows: ws })
                    }}>🗑</button>
                  </div>
                ))}
              </div>
            </>
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
            <button className={obj.locked ? 'on' : ''} onClick={() => toggleLock(obj.id)}>
              {obj.locked ? '🔒 Verrouillé' : '🔓 Verrouiller'}
            </button>
          </div>
          <div className="prop-actions">
            <button onClick={() => sendBackward(obj.id)} title="Reculer">⤓</button>
            <button onClick={() => bringForward(obj.id)} title="Avancer">⤒</button>
            <button className="danger" onClick={() => removeObject(obj.id)}>🗑 {t('app.delete')}</button>
          </div>
        </section>
      )}
    </aside>
  )
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="color-picker">
      <span>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
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
