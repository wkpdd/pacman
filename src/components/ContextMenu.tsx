import type { PlacedObject } from '@/types'
import { useCanvasStore } from '@/store/canvasStore'

interface Props {
  x: number
  y: number
  obj: PlacedObject
  onClose: () => void
}

/**
 * Touch-friendly context menu. Opened on long-press of an object or
 * right-click on desktop. Big targets so fat fingers hit cleanly.
 */
export function ContextMenu({ x, y, obj, onClose }: Props): React.JSX.Element {
  const duplicate = useCanvasStore((s) => s.duplicateObject)
  const remove = useCanvasStore((s) => s.removeObject)
  const toggleLock = useCanvasStore((s) => s.toggleLock)
  const bringForward = useCanvasStore((s) => s.bringForward)
  const sendBackward = useCanvasStore((s) => s.sendBackward)

  const act = (fn: () => void) => () => { fn(); onClose() }

  // Clamp to viewport so it never opens off-screen
  const left = Math.min(x, window.innerWidth - 220)
  const top = Math.min(y, window.innerHeight - 280)

  return (
    <>
      <div className="ctx-backdrop" onClick={onClose} onTouchStart={onClose} />
      <ul className="ctx-menu" style={{ left, top }} role="menu">
        <li><button onClick={act(() => duplicate(obj.id))}>⧉ Dupliquer</button></li>
        <li>
          <button onClick={act(() => toggleLock(obj.id))}>
            {obj.locked ? '🔓 Déverrouiller' : '🔒 Verrouiller'}
          </button>
        </li>
        <li><button onClick={act(() => bringForward(obj.id))}>⤒ Avancer</button></li>
        <li><button onClick={act(() => sendBackward(obj.id))}>⤓ Reculer</button></li>
        <li><button className="danger" onClick={act(() => remove(obj.id))}>🗑 Supprimer</button></li>
      </ul>
    </>
  )
}
