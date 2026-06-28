import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import type { PlacedObject, Room } from '@/types'

interface DesignSnapshot {
  designId: string
  name: string
  room: Room
  objects: PlacedObject[]
  /** monotonic counter so a stale message doesn't overwrite newer state */
  seq: number
}

const CHANNEL = 'decor-design'

/**
 * Multi-window design sync via BroadcastChannel + IndexedDB fallback.
 *
 * - In `broadcaster` mode (the designer): subscribes to the canvas store
 *   and broadcasts a debounced snapshot on every committed change.
 * - In `receiver` mode (the read-only views): listens for snapshots and
 *   updates the local store via the no-dirty path.
 *
 * Falls back to a localStorage poll when BroadcastChannel is missing
 * (e.g. older Safari).
 */
export function useDesignSync(role: 'broadcaster' | 'receiver'): void {
  const seqRef = useRef(0)
  const lastReceivedSeqRef = useRef(-1)

  useEffect(() => {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null

    if (role === 'broadcaster') {
      let timer: number | null = null
      const send = () => {
        const s = useCanvasStore.getState()
        const snap: DesignSnapshot = {
          designId: s.designId,
          name: s.designName,
          room: s.room,
          objects: s.objects,
          seq: ++seqRef.current
        }
        try {
          channel?.postMessage(snap)
          localStorage.setItem('decor:last-snapshot', JSON.stringify(snap))
        } catch { /* ignore quota / serialization errors */ }
      }
      const unsub = useCanvasStore.subscribe((_state, _prev) => {
        if (timer != null) window.clearTimeout(timer)
        timer = window.setTimeout(send, 80)
      })
      // Send immediately on mount so newly-opened views catch up
      send()
      return () => {
        if (timer) window.clearTimeout(timer)
        unsub()
        channel?.close()
      }
    }

    // Receiver
    const apply = (snap: DesignSnapshot) => {
      if (snap.seq <= lastReceivedSeqRef.current) return
      lastReceivedSeqRef.current = snap.seq
      const store = useCanvasStore.getState()
      // Use loadDesign so isDirty stays false (read-only window must not autosave).
      store.loadDesign({
        id: snap.designId,
        tenantId: '',
        name: snap.name,
        status: 'draft',
        client: { name: '' },
        room: snap.room,
        objects: snap.objects,
        options: { wastePct: 0.1, laborPerM2: 1200, paymentMode: 'cash' },
        createdAt: 0,
        updatedAt: 0
      })
    }
    const onMessage = (e: MessageEvent<DesignSnapshot>) => apply(e.data)
    channel?.addEventListener('message', onMessage)

    // Pull whatever snapshot is already in localStorage so the view paints
    // immediately even before the broadcaster sends its first message.
    const cached = localStorage.getItem('decor:last-snapshot')
    if (cached) {
      try { apply(JSON.parse(cached)) } catch { /* ignore bad cache */ }
    }
    // Storage-event fallback for when BroadcastChannel is unavailable.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'decor:last-snapshot' || !e.newValue) return
      try { apply(JSON.parse(e.newValue)) } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      channel?.removeEventListener('message', onMessage)
      channel?.close()
      window.removeEventListener('storage', onStorage)
    }
  }, [role])
}
