import { useState } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { findModule, KIND_COLOR } from '@/modules/faux-plafond/library'
import type { ObjectKind, PlacedObject } from '@/types'

const KIND_ICON: Record<ObjectKind, string> = {
  corniche: '▭',
  rosace: '◉',
  spotlight: '●',
  'spotlight-grid': '⊞',
  'led-strip': '〰',
  retombee: '▢',
  'multi-level': '☁',
  obstacle: '⨯',
  cloison: '∥',
  lamp: '💡'
}

/**
 * Photoshop-style layers panel. Each object gets a row with:
 *   - visibility toggle (eye)
 *   - lock toggle
 *   - kind icon + name + position
 *   - click row → selects the object on the canvas
 *   - drag a row → reorders the z-stack (last = top)
 *
 * Solves the "hard to select small/overlapping objects on the canvas" pain.
 */
export function LayersPanel(): React.JSX.Element {
  const objects = useCanvasStore((s) => s.objects)
  const selectionId = useCanvasStore((s) => s.selectionId)
  const select = useCanvasStore((s) => s.select)
  const toggleHidden = useCanvasStore((s) => s.toggleHidden)
  const toggleLock = useCanvasStore((s) => s.toggleLock)
  const removeObject = useCanvasStore((s) => s.removeObject)
  const duplicateObject = useCanvasStore((s) => s.duplicateObject)
  const reorder = useCanvasStore((s) => s.reorder)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  // Render top of stack first — matches the "topmost layer at the top of the list" mental model
  const rows = [...objects].map((o, i) => ({ obj: o, i })).reverse()

  const onDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setOverIdx(idx)
  }
  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx == null || dragIdx === idx) {
      setDragIdx(null); setOverIdx(null); return
    }
    reorder(dragIdx, idx)
    setDragIdx(null); setOverIdx(null)
  }
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  return (
    <section className="layers-panel">
      <header className="layers-header">
        <h3>Calques</h3>
        <span className="layers-count">{objects.length}</span>
      </header>
      {objects.length === 0 && (
        <p className="muted layers-empty">Aucun objet — glissez depuis la bibliothèque.</p>
      )}
      <ul className="layers-list">
        {rows.map(({ obj, i }) => (
          <LayerRow
            key={obj.id}
            obj={obj}
            idx={i}
            selected={obj.id === selectionId}
            beingDragged={dragIdx === i}
            dropTarget={overIdx === i && dragIdx !== null && dragIdx !== i}
            onSelect={() => select(obj.id)}
            onToggleHidden={() => toggleHidden(obj.id)}
            onToggleLock={() => toggleLock(obj.id)}
            onDelete={() => removeObject(obj.id)}
            onDuplicate={() => duplicateObject(obj.id)}
            onDragStart={(e) => onDragStart(e, i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDrop={(e) => onDrop(e, i)}
            onDragEnd={onDragEnd}
          />
        ))}
      </ul>
    </section>
  )
}

interface RowProps {
  obj: PlacedObject
  idx: number
  selected: boolean
  beingDragged: boolean
  dropTarget: boolean
  onSelect: () => void
  onToggleHidden: () => void
  onToggleLock: () => void
  onDelete: () => void
  onDuplicate: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function LayerRow({
  obj, idx, selected, beingDragged, dropTarget,
  onSelect, onToggleHidden, onToggleLock, onDelete, onDuplicate,
  onDragStart, onDragOver, onDrop, onDragEnd
}: RowProps) {
  const mod = findModule(obj.moduleId)
  const name = mod?.labelFr ?? obj.kind
  const cls = [
    'layer-row',
    selected && 'on',
    beingDragged && 'dragging',
    dropTarget && 'drop-target',
    obj.hidden && 'hidden'
  ].filter(Boolean).join(' ')
  return (
    <li
      className={cls}
      draggable
      onClick={onSelect}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      title={`#${idx + 1} · ${name}`}
      style={{ ['--kind-color' as string]: KIND_COLOR[obj.kind] }}
    >
      <button
        className="layer-icon-btn"
        onClick={(e) => { e.stopPropagation(); onToggleHidden() }}
        title={obj.hidden ? 'Afficher' : 'Masquer'}
        aria-label="visibility"
      >
        {obj.hidden ? '⊘' : '👁'}
      </button>
      <button
        className="layer-icon-btn"
        onClick={(e) => { e.stopPropagation(); onToggleLock() }}
        title={obj.locked ? 'Déverrouiller' : 'Verrouiller'}
        aria-label="lock"
      >
        {obj.locked ? '🔒' : '🔓'}
      </button>
      <span className="layer-kind-icon">{KIND_ICON[obj.kind]}</span>
      <span className="layer-name">{name}</span>
      <span className="layer-pos">{Math.round(obj.x)}, {Math.round(obj.y)}</span>
      <button
        className="layer-icon-btn"
        onClick={(e) => { e.stopPropagation(); onDuplicate() }}
        title="Dupliquer"
      >⧉</button>
      <button
        className="layer-icon-btn danger"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        title="Supprimer"
      >🗑</button>
    </li>
  )
}
