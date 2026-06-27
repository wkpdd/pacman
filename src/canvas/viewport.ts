import { useEffect, useState } from 'react'

export interface Viewport {
  width: number
  height: number
  /** zoom = pixels per cm */
  scale: number
  offsetX: number
  offsetY: number
}

export function useContainerSize(ref: React.RefObject<HTMLElement | null>): {
  width: number
  height: number
} {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight })
    })
    ro.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [ref])
  return size
}

/** Compute initial scale so the room fits the viewport with a 5% margin. */
export function fitScale(roomW: number, roomL: number, viewW: number, viewH: number): number {
  if (viewW <= 0 || viewH <= 0) return 1
  const sx = (viewW * 0.92) / roomW
  const sy = (viewH * 0.92) / roomL
  return Math.min(sx, sy)
}
