import { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Line, Group, Text, Transformer, Circle, Path } from 'react-konva'
import type Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { useContainerSize, fitScale } from './viewport'
import { snap } from './snapping'
import type { PlacedObject } from '@/types'
import { polylineLengthM } from '@/utils/units'

const GRID_STEP_CM = 10
const SNAP_THRESHOLD_CM = 8 // generous on touch — forgiving hit areas

interface StageProps {
  onContextRequest: (info: { objectId: string; screenX: number; screenY: number }) => void
}

export function CanvasStage({ onContextRequest }: StageProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: vw, height: vh } = useContainerSize(containerRef)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  const room = useCanvasStore((s) => s.room)
  const objects = useCanvasStore((s) => s.objects)
  const selectionId = useCanvasStore((s) => s.selectionId)
  const select = useCanvasStore((s) => s.select)
  const updateObject = useCanvasStore((s) => s.updateObject)

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [guides, setGuides] = useState<Array<{ kind: 'v' | 'h'; pos: number }>>([])
  const [showGrid, setShowGrid] = useState(true)
  const [showDims, setShowDims] = useState(true)

  // Expose the stage + view-mode setters so the PDF exporter can swap
  // the canvas between "clean client render" and "dimensioned plan".
  useEffect(() => {
    const w = window as unknown as {
      __decorStage?: Konva.Stage | null
      __decorViewMode?: (m: 'client' | 'plan') => void
    }
    w.__decorStage = stageRef.current
    w.__decorViewMode = (m) => {
      setShowDims(m === 'plan')
      setShowGrid(m === 'plan')
    }
    return () => {
      w.__decorStage = null
      w.__decorViewMode = undefined
    }
  }, [])

  // Refit when the viewport or room dimensions change (room edits should
  // never leave the design half off-screen).
  const lastRoomRef = useRef({ w: room.width, l: room.length })
  useEffect(() => {
    if (vw === 0 || vh === 0) return
    const roomChanged =
      lastRoomRef.current.w !== room.width || lastRoomRef.current.l !== room.length
    const firstRun = scale === 1 && offset.x === 0 && offset.y === 0
    if (firstRun || roomChanged) {
      const s = fitScale(room.width, room.length, vw, vh)
      setScale(s)
      setOffset({
        x: (vw - room.width * s) / 2,
        y: (vh - room.length * s) / 2
      })
      lastRoomRef.current = { w: room.width, l: room.length }
    }
    // intentionally narrow deps: don't refit on every offset/scale tweak the user makes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vw, vh, room.width, room.length])

  // Attach transformer to selected node — but LED polylines and corniche
  // in perimeter mode aren't resized via handles (their geometry is their data).
  useEffect(() => {
    const tr = transformerRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    const sel = objects.find((o) => o.id === selectionId)
    const usesTransformer = sel && sel.kind !== 'led-strip' && !(sel.kind === 'corniche' && sel.data?.perimeter !== false)
    if (!selectionId || !usesTransformer) {
      tr.nodes([])
      tr.getLayer()?.batchDraw()
      return
    }
    const node = stage.findOne(`#obj-${selectionId}`)
    if (node) {
      tr.nodes([node])
      tr.getLayer()?.batchDraw()
    }
  }, [selectionId, objects])

  // Two-finger pinch zoom + pan
  const lastDist = useRef<number | null>(null)
  const lastCenter = useRef<{ x: number; y: number } | null>(null)
  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches
      if (touches.length === 2) {
        e.evt.preventDefault()
        const [t1, t2] = [touches[0], touches[1]]
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 }
        if (lastDist.current != null && lastCenter.current != null) {
          const scaleFactor = dist / lastDist.current
          const newScale = Math.max(0.05, Math.min(8, scale * scaleFactor))
          const stage = stageRef.current
          if (stage) {
            const rect = stage.container().getBoundingClientRect()
            const px = center.x - rect.left
            const py = center.y - rect.top
            const worldX = (px - offset.x) / scale
            const worldY = (py - offset.y) / scale
            const newOffset = {
              x: px - worldX * newScale + (center.x - lastCenter.current.x),
              y: py - worldY * newScale + (center.y - lastCenter.current.y)
            }
            setScale(newScale)
            setOffset(newOffset)
          }
        }
        lastDist.current = dist
        lastCenter.current = center
      }
    },
    [scale, offset]
  )
  const handleTouchEnd = useCallback(() => {
    lastDist.current = null
    lastCenter.current = null
  }, [])

  // Wheel zoom (desktop)
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1
      const newScale = Math.max(0.05, Math.min(8, scale * factor))
      const worldX = (pointer.x - offset.x) / scale
      const worldY = (pointer.y - offset.y) / scale
      setOffset({
        x: pointer.x - worldX * newScale,
        y: pointer.y - worldY * newScale
      })
      setScale(newScale)
    },
    [scale, offset]
  )

  // Empty-canvas tap deselects; pan when no selection target
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) {
        select(null)
      }
    },
    [select]
  )

  // Drag-pan the stage (one finger / mouse on empty area)
  const handleStageDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const stage = e.target.getStage()
      if (!stage) return
      setOffset({ x: stage.x(), y: stage.y() })
      stage.position({ x: 0, y: 0 })
    },
    []
  )

  const fitAll = useCallback(() => {
    if (vw === 0 || vh === 0) return
    const s = fitScale(room.width, room.length, vw, vh)
    setScale(s)
    setOffset({ x: (vw - room.width * s) / 2, y: (vh - room.length * s) / 2 })
  }, [vw, vh, room.width, room.length])

  return (
    <div ref={containerRef} className="canvas-host">
      <Stage
        ref={stageRef}
        width={vw}
        height={vh}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onMouseDown={handleStageClick}
        onTouchStart={handleStageClick}
        onDragEnd={handleStageDragEnd}
        x={offset.x}
        y={offset.y}
        scaleX={scale}
        scaleY={scale}
        draggable
        style={{ touchAction: 'none' }}
      >
        {/* ---- Static layer: room + grid ---- */}
        <Layer listening={false}>
          <Rect x={0} y={0} width={room.width} height={room.length} fill="#fef3c7" stroke="#0f172a" strokeWidth={2 / scale} />
          {showGrid && <GridLines room={room} step={GRID_STEP_CM} scale={scale} />}
        </Layer>

        {/* ---- Object layer ---- */}
        <Layer>
          {objects.map((o) => (
            <ObjectShape
              key={o.id}
              obj={o}
              selected={o.id === selectionId}
              onSelect={() => select(o.id)}
              onChange={(patch) => updateObject(o.id, patch)}
              setGuides={setGuides}
              allObjects={objects}
              room={room}
              scale={scale}
              onContext={(screenX, screenY) => {
                select(o.id)
                onContextRequest({ objectId: o.id, screenX, screenY })
              }}
            />
          ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio={false}
            anchorSize={Math.max(14, 22 / scale)}
            anchorStroke="#0f172a"
            anchorFill="#f59e0b"
            borderStroke="#0f172a"
            borderStrokeWidth={1.5 / scale}
          />
        </Layer>

        {/* ---- Dimension annotations ---- */}
        {showDims && (
          <Layer listening={false}>
            <DimensionsOverlay
              room={room}
              scale={scale}
              selected={objects.find((o) => o.id === selectionId) ?? null}
            />
          </Layer>
        )}

        {/* ---- Guides layer ---- */}
        <Layer listening={false}>
          {guides.map((g, i) =>
            g.kind === 'v' ? (
              <Line
                key={`v-${i}`}
                points={[g.pos, -1000, g.pos, room.length + 1000]}
                stroke="#ef4444"
                strokeWidth={1 / scale}
                dash={[6 / scale, 4 / scale]}
              />
            ) : (
              <Line
                key={`h-${i}`}
                points={[-1000, g.pos, room.width + 1000, g.pos]}
                stroke="#ef4444"
                strokeWidth={1 / scale}
                dash={[6 / scale, 4 / scale]}
              />
            )
          )}
        </Layer>
      </Stage>

      <div className="canvas-overlay-tools">
        <button onClick={fitAll} title="Adapter">⤢</button>
        <button onClick={() => setScale((s) => Math.min(8, s * 1.2))}>＋</button>
        <button onClick={() => setScale((s) => Math.max(0.05, s / 1.2))}>−</button>
        <button onClick={() => setShowGrid((g) => !g)} className={showGrid ? 'on' : ''} title="Grille">#</button>
        <button onClick={() => setShowDims((d) => !d)} className={showDims ? 'on' : ''} title="Cotes">⊟</button>
      </div>
    </div>
  )
}

function GridLines({ room, step, scale }: { room: { width: number; length: number }; step: number; scale: number }) {
  const lines: React.JSX.Element[] = []
  for (let x = step; x < room.width; x += step) {
    lines.push(
      <Line
        key={`gx${x}`}
        points={[x, 0, x, room.length]}
        stroke="#fde68a"
        strokeWidth={(x % 100 === 0 ? 0.6 : 0.3) / scale}
      />
    )
  }
  for (let y = step; y < room.length; y += step) {
    lines.push(
      <Line
        key={`gy${y}`}
        points={[0, y, room.width, y]}
        stroke="#fde68a"
        strokeWidth={(y % 100 === 0 ? 0.6 : 0.3) / scale}
      />
    )
  }
  return <>{lines}</>
}

function DimensionsOverlay({
  room,
  scale,
  selected
}: {
  room: { width: number; length: number; height: number }
  scale: number
  selected: PlacedObject | null
}) {
  const fs = Math.max(11, 13 / scale)
  const off = 18 / scale
  const tick = 8 / scale
  const stroke = 1 / scale
  const dims: React.JSX.Element[] = []

  // Room width arrow (above room)
  dims.push(
    <Line key="rw" points={[0, -off, room.width, -off]} stroke="#0f172a" strokeWidth={stroke} />,
    <Line key="rwl" points={[0, -off - tick, 0, -off + tick]} stroke="#0f172a" strokeWidth={stroke} />,
    <Line key="rwr" points={[room.width, -off - tick, room.width, -off + tick]} stroke="#0f172a" strokeWidth={stroke} />,
    <Text
      key="rwt"
      x={room.width / 2 - 30}
      y={-off - fs * 1.4}
      text={`${(room.width / 100).toFixed(2)} m`}
      fontSize={fs}
      fill="#0f172a"
    />
  )
  // Room length arrow (left of room)
  dims.push(
    <Line key="rl" points={[-off, 0, -off, room.length]} stroke="#0f172a" strokeWidth={stroke} />,
    <Line key="rlt" points={[-off - tick, 0, -off + tick, 0]} stroke="#0f172a" strokeWidth={stroke} />,
    <Line key="rlb" points={[-off - tick, room.length, -off + tick, room.length]} stroke="#0f172a" strokeWidth={stroke} />,
    <Text
      key="rlt2"
      x={-off - fs * 4}
      y={room.length / 2}
      text={`${(room.length / 100).toFixed(2)} m`}
      fontSize={fs}
      fill="#0f172a"
      rotation={-90}
    />
  )

  if (selected) {
    const o = selected
    const so = 8 / scale
    dims.push(
      <Line key="sw" points={[o.x, o.y - so, o.x + o.width, o.y - so]} stroke="#ef4444" strokeWidth={stroke} />,
      <Text
        key="swt"
        x={o.x + o.width / 2 - 20}
        y={o.y - so - fs * 1.4}
        text={`${(o.width / 100).toFixed(2)} m`}
        fontSize={fs}
        fill="#ef4444"
      />,
      <Line key="sh" points={[o.x - so, o.y, o.x - so, o.y + o.height]} stroke="#ef4444" strokeWidth={stroke} />,
      <Text
        key="sht"
        x={o.x - so - fs * 3.4}
        y={o.y + o.height / 2}
        text={`${(o.height / 100).toFixed(2)} m`}
        fontSize={fs}
        fill="#ef4444"
        rotation={-90}
      />
    )
  }

  return <>{dims}</>
}

interface ObjectProps {
  obj: PlacedObject
  selected: boolean
  scale: number
  onSelect: () => void
  onChange: (p: Partial<PlacedObject>) => void
  setGuides: React.Dispatch<React.SetStateAction<Array<{ kind: 'v' | 'h'; pos: number }>>>
  allObjects: PlacedObject[]
  room: { width: number; length: number; height: number }
  onContext: (screenX: number, screenY: number) => void
}

function ObjectShape({
  obj,
  selected,
  scale,
  onSelect,
  onChange,
  setGuides,
  allObjects,
  room,
  onContext
}: ObjectProps): React.JSX.Element {
  // Long-press → context menu (mobile). On desktop, native right-click works.
  const longPressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)
  const startLongPress = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const t = e.evt.touches[0]
    if (!t) return
    longPressFired.current = false
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      onContext(t.clientX, t.clientY)
    }, 550)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  const onCtx = (e: Konva.KonvaEventObject<PointerEvent | MouseEvent>) => {
    e.evt.preventDefault()
    const evt = e.evt as PointerEvent
    onContext(evt.clientX ?? 0, evt.clientY ?? 0)
  }
  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target
    const tentative: PlacedObject = { ...obj, x: node.x(), y: node.y() }
    const snapped = snap(tentative, allObjects, room, {
      threshold: SNAP_THRESHOLD_CM,
      gridStep: GRID_STEP_CM
    })
    node.x(snapped.x)
    node.y(snapped.y)
    setGuides(snapped.guides)
  }
  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setGuides([])
    onChange({ x: e.target.x(), y: e.target.y() })
  }
  const onTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target
    const sx = node.scaleX()
    const sy = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)
    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, obj.width * sx),
      height: Math.max(5, obj.height * sy),
      rotation: node.rotation()
    })
  }
  const common = {
    id: `obj-${obj.id}`,
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
    draggable: !obj.locked,
    onDragMove,
    onDragEnd,
    onTransformEnd,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (longPressFired.current) return
      onSelect()
      // also surface right-click context
      if ((e.evt as MouseEvent).button === 2) onCtx(e as Konva.KonvaEventObject<MouseEvent>)
    },
    onTap: () => { if (!longPressFired.current) onSelect() },
    onContextMenu: onCtx,
    onTouchStart: startLongPress,
    onTouchEnd: cancelLongPress,
    onTouchMove: cancelLongPress
  } satisfies Konva.NodeConfig & { id: string }

  // Spotlight (single)
  if (obj.kind === 'spotlight') {
    return (
      <Group {...common}>
        <Circle x={obj.width / 2} y={obj.height / 2} radius={obj.width / 2} fill="#fffbeb" stroke="#0f172a" strokeWidth={1.2 / scale} />
        <Circle x={obj.width / 2} y={obj.height / 2} radius={obj.width / 4} fill="#f59e0b" />
      </Group>
    )
  }

  // Spotlight grid — auto-distribute spots
  if (obj.kind === 'spotlight-grid') {
    const rows = obj.data?.rows ?? 3
    const cols = obj.data?.cols ?? 3
    const spots: React.JSX.Element[] = []
    const cellW = obj.width / cols
    const cellH = obj.height / rows
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        spots.push(
          <Circle
            key={`${r}-${c}`}
            x={cellW * (c + 0.5)}
            y={cellH * (r + 0.5)}
            radius={Math.min(cellW, cellH) * 0.18}
            fill="#f59e0b"
            stroke="#0f172a"
            strokeWidth={0.8 / scale}
          />
        )
    return (
      <Group {...common}>
        <Rect width={obj.width} height={obj.height} fill={selected ? 'rgba(245,158,11,0.08)' : 'transparent'} stroke="#0f172a" strokeWidth={0.8 / scale} dash={[6 / scale, 4 / scale]} />
        {spots}
      </Group>
    )
  }

  // LED strip (polyline) — drag endpoints, double-tap a segment to add a waypoint
  if (obj.kind === 'led-strip') {
    const pts = obj.data?.points ?? [{ x: 0, y: 0 }, { x: obj.width, y: 0 }]
    const flat = pts.flatMap((p) => [p.x, p.y])
    const ml = polylineLengthM(pts).toFixed(2)
    const moveHandle = (i: number, nx: number, ny: number) => {
      const next = pts.map((p, k) => (k === i ? { x: nx, y: ny } : p))
      onChange({ data: { ...obj.data, points: next } })
    }
    const addWaypoint = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage()
      if (!stage) return
      const pos = stage.getPointerPosition()
      if (!pos) return
      const localX = (pos.x - stage.x()) / stage.scaleX() - obj.x
      const localY = (pos.y - stage.y()) / stage.scaleY() - obj.y
      // Insert at end nearest to click
      let bestIdx = pts.length
      let bestD = Infinity
      for (let i = 1; i < pts.length; i++) {
        const mx = (pts[i - 1].x + pts[i].x) / 2
        const my = (pts[i - 1].y + pts[i].y) / 2
        const d = Math.hypot(localX - mx, localY - my)
        if (d < bestD) { bestD = d; bestIdx = i }
      }
      const next = [...pts.slice(0, bestIdx), { x: localX, y: localY }, ...pts.slice(bestIdx)]
      onChange({ data: { ...obj.data, points: next } })
    }
    return (
      <Group {...common} onDblClick={addWaypoint} onDblTap={addWaypoint}>
        <Line points={flat} stroke="#f59e0b" strokeWidth={Math.max(3, 6 / scale)} lineCap="round" lineJoin="round" />
        {selected && pts.map((p, i) => (
          <Circle
            key={i}
            x={p.x}
            y={p.y}
            radius={Math.max(8, 12 / scale)}
            fill="#fff"
            stroke="#0f172a"
            strokeWidth={1.5 / scale}
            draggable
            onDragMove={(e) => moveHandle(i, e.target.x(), e.target.y())}
            onDragEnd={(e) => moveHandle(i, e.target.x(), e.target.y())}
            onDblClick={(e) => {
              e.cancelBubble = true
              if (pts.length <= 2) return
              const next = pts.filter((_, k) => k !== i)
              onChange({ data: { ...obj.data, points: next } })
            }}
            onDblTap={(e) => {
              e.cancelBubble = true
              if (pts.length <= 2) return
              const next = pts.filter((_, k) => k !== i)
              onChange({ data: { ...obj.data, points: next } })
            }}
          />
        ))}
        {selected && <Text x={pts[0].x} y={pts[0].y - 20} text={`${ml} ml`} fontSize={14 / scale} fill="#0f172a" />}
      </Group>
    )
  }

  // Retombée rectangle
  if (obj.kind === 'retombee') {
    return (
      <Group {...common}>
        <Rect width={obj.width} height={obj.height} fill="rgba(15,23,42,0.05)" stroke="#0f172a" strokeWidth={1.2 / scale} dash={[8 / scale, 4 / scale]} />
        <Rect x={obj.width * 0.1} y={obj.height * 0.1} width={obj.width * 0.8} height={obj.height * 0.8} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1 / scale} />
        {selected && (
          <Text
            x={4}
            y={4}
            text={`Retombée ${obj.data?.drop ?? 25} cm`}
            fontSize={12 / scale}
            fill="#0f172a"
          />
        )}
      </Group>
    )
  }

  // Corniche — perimeter mode draws ribbons along the room's flagged sides
  if (obj.kind === 'corniche') {
    if (obj.data?.perimeter !== false) {
      const sides = obj.data?.sides ?? ['top', 'right', 'bottom', 'left']
      const t = Math.max(6, obj.height) // ribbon thickness in world cm
      const rs: React.JSX.Element[] = []
      if (sides.includes('top')) rs.push(<Rect key="t" x={0} y={0} width={room.width} height={t} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1 / scale} />)
      if (sides.includes('bottom')) rs.push(<Rect key="b" x={0} y={room.length - t} width={room.width} height={t} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1 / scale} />)
      if (sides.includes('left')) rs.push(<Rect key="l" x={0} y={0} width={t} height={room.length} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1 / scale} />)
      if (sides.includes('right')) rs.push(<Rect key="r" x={room.width - t} y={0} width={t} height={room.length} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1 / scale} />)
      // Render in stage coordinates (not under the moving group) so dragging
      // wouldn't offset them. Use an absolute Group anchored at 0,0.
      return (
        <Group id={`obj-${obj.id}`} onClick={onSelect} onTap={onSelect}>
          {rs}
          {selected && (
            <Rect x={0} y={0} width={room.width} height={room.length} listening={false} stroke="#f59e0b" strokeWidth={1.5 / scale} dash={[8 / scale, 4 / scale]} />
          )}
        </Group>
      )
    }
    return (
      <Group {...common}>
        <Rect width={obj.width} height={obj.height} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1 / scale} />
        <Rect x={2} y={2} width={obj.width - 4} height={obj.height - 4} stroke="#94a3b8" strokeWidth={0.5 / scale} />
      </Group>
    )
  }

  // Rosace
  if (obj.kind === 'rosace') {
    return (
      <Group {...common}>
        <Circle x={obj.width / 2} y={obj.height / 2} radius={obj.width / 2} fill="#fef3c7" stroke="#0f172a" strokeWidth={1.2 / scale} />
        <Circle x={obj.width / 2} y={obj.height / 2} radius={obj.width / 3.5} fill="none" stroke="#0f172a" strokeWidth={0.8 / scale} />
        <Circle x={obj.width / 2} y={obj.height / 2} radius={obj.width / 8} fill="#0f172a" />
      </Group>
    )
  }

  // Multi-level / cloud
  if (obj.kind === 'multi-level') {
    const w = obj.width
    const h = obj.height
    const path = `M ${w * 0.2} ${h * 0.6} Q ${w * 0.2} ${h * 0.3}, ${w * 0.4} ${h * 0.3} Q ${w * 0.5} ${h * 0.1}, ${w * 0.65} ${h * 0.2} Q ${w * 0.9} ${h * 0.15}, ${w * 0.9} ${h * 0.5} Q ${w} ${h * 0.75}, ${w * 0.75} ${h * 0.75} L ${w * 0.25} ${h * 0.75} Q ${w * 0.1} ${h * 0.75}, ${w * 0.2} ${h * 0.6} Z`
    return (
      <Group {...common}>
        <Path data={path} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.2 / scale} />
      </Group>
    )
  }

  return <Group {...common}><Rect width={obj.width} height={obj.height} fill="#e2e8f0" stroke="#0f172a" /></Group>
}
