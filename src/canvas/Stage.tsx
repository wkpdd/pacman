import { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Line, Group, Text, Transformer, Circle, Path } from 'react-konva'
import type Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { useContainerSize, fitScale } from './viewport'
import { snap } from './snapping'
import type { PlacedObject } from '@/types'
import { polylineLengthM } from '@/utils/units'
import { layoutPlaques } from '@/modules/faux-plafond/plaqueLayout'

const GRID_STEP_CM = 10
const SNAP_THRESHOLD_CM = 8 // generous on touch — forgiving hit areas

interface StageProps {
  onContextRequest: (info: { objectId: string; screenX: number; screenY: number }) => void
  /** optional view-mode locks: filter visible objects and force overlay state */
  viewSpec?: import('@/views/viewMode').ViewSpec
}

export function CanvasStage({ onContextRequest, viewSpec }: StageProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: vw, height: vh } = useContainerSize(containerRef)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  const room = useCanvasStore((s) => s.room)
  const allObjects = useCanvasStore((s) => s.objects)
  const objects = viewSpec?.visibleKinds
    ? allObjects.filter((o) => viewSpec.visibleKinds!.includes(o.kind))
    : allObjects
  const selectionId = useCanvasStore((s) => s.selectionId)
  const select = useCanvasStore((s) => s.select)
  const updateObject = useCanvasStore((s) => s.updateObject)

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [guides, setGuides] = useState<Array<{ kind: 'v' | 'h'; pos: number }>>([])
  const [showGrid, setShowGrid] = useState(viewSpec?.showGrid ?? true)
  const [showDims, setShowDims] = useState(viewSpec?.showDimensions ?? true)
  const [showPlaqueLayout, setShowPlaqueLayout] = useState(viewSpec?.showPlaqueLayout ?? false)
  const [showSupportGrid, setShowSupportGrid] = useState(viewSpec?.showSupportGrid ?? false)
  const [iso3d, setIso3d] = useState(false)
  const readOnly = viewSpec?.editable === false

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
      setShowPlaqueLayout(m === 'plan')
      setShowSupportGrid(m === 'plan')
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
    <div ref={containerRef} className={iso3d ? 'canvas-host iso3d' : 'canvas-host'}>
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
          {showSupportGrid && <SupportGrid room={room} scale={scale} />}
          {showPlaqueLayout && <PlaqueLayoutOverlay room={room} objects={objects} scale={scale} />}
        </Layer>

        {/* ---- Object layer ---- */}
        <Layer>
          {objects.map((o) => (
            <ObjectShape
              key={o.id}
              obj={o}
              selected={o.id === selectionId}
              onSelect={() => !readOnly && select(o.id)}
              onChange={(patch) => updateObject(o.id, patch)}
              setGuides={setGuides}
              allObjects={objects}
              room={room}
              scale={scale}
              readOnly={readOnly}
              onContext={(screenX, screenY) => {
                if (readOnly) return
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
        <button onClick={() => setShowPlaqueLayout((p) => !p)} className={showPlaqueLayout ? 'on' : ''} title="Layout BA13">▦</button>
        <button onClick={() => setShowSupportGrid((g) => !g)} className={showSupportGrid ? 'on' : ''} title="Fourrures + suspentes">⫼</button>
        <button onClick={() => setIso3d((i) => !i)} className={iso3d ? 'on' : ''} title="Vue 3D (isométrique)">⬢</button>
      </div>
    </div>
  )
}

/**
 * Fourrures F530 every 60 cm parallel to the shorter axis; suspentes at
 * 1 m intervals along each fourrure. Reads as the structural skeleton
 * the placo worker actually installs.
 */
function SupportGrid({ room, scale }: { room: { width: number; length: number }; scale: number }) {
  const FOURRURE_SPACING = 60 // cm
  const SUSPENTE_SPACING = 100 // cm along the fourrure
  const els: React.JSX.Element[] = []
  // Run fourrures along the longer axis so each fourrure stays continuous.
  const horizontal = room.width >= room.length
  if (horizontal) {
    for (let y = FOURRURE_SPACING / 2; y < room.length; y += FOURRURE_SPACING) {
      els.push(<Line key={`f${y}`} points={[0, y, room.width, y]} stroke="#475569" strokeWidth={1.4 / scale} opacity={0.85} />)
      for (let x = SUSPENTE_SPACING / 2; x < room.width; x += SUSPENTE_SPACING) {
        els.push(<Rect key={`s${x}-${y}`} x={x - 3 / scale} y={y - 3 / scale} width={6 / scale} height={6 / scale} fill="#0f172a" />)
      }
    }
  } else {
    for (let x = FOURRURE_SPACING / 2; x < room.width; x += FOURRURE_SPACING) {
      els.push(<Line key={`f${x}`} points={[x, 0, x, room.length]} stroke="#475569" strokeWidth={1.4 / scale} opacity={0.85} />)
      for (let y = SUSPENTE_SPACING / 2; y < room.length; y += SUSPENTE_SPACING) {
        els.push(<Rect key={`s${x}-${y}`} x={x - 3 / scale} y={y - 3 / scale} width={6 / scale} height={6 / scale} fill="#0f172a" />)
      }
    }
  }
  return <>{els}</>
}

/**
 * BA13 1.20 × 2.50 m plaque layout overlay. Picks the lower-waste
 * orientation, numbers each plaque, marks cut plaques with diagonal hatching,
 * highlights obstacle cutouts in red.
 */
function PlaqueLayoutOverlay({
  room,
  objects,
  scale
}: {
  room: { width: number; length: number; height: number }
  objects: PlacedObject[]
  scale: number
}) {
  const obstacles = objects.filter((o) => o.kind === 'obstacle')
  const layout = layoutPlaques(room, obstacles)
  const fs = Math.max(10, 14 / scale)
  return (
    <>
      {layout.plaques.map((p) => (
        <Group key={p.n}>
          <Rect
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            fill={p.cut ? 'rgba(245,158,11,0.10)' : 'rgba(15,118,110,0.08)'}
            stroke="#0f172a"
            strokeWidth={1.1 / scale}
          />
          <Text
            x={p.x + 6 / scale}
            y={p.y + 6 / scale}
            text={`#${p.n}`}
            fontSize={fs}
            fontStyle="bold"
            fill="#0f172a"
          />
          <Text
            x={p.x + 6 / scale}
            y={p.y + p.h - fs * 1.3}
            text={`${(p.w / 100).toFixed(2)} × ${(p.h / 100).toFixed(2)} m${p.cut ? ' ✂' : ''}`}
            fontSize={fs * 0.85}
            fill="#0f172a"
          />
          {p.cutouts?.map((c, i) => (
            <Rect
              key={i}
              x={p.x + c.x}
              y={p.y + c.y}
              width={c.w}
              height={c.h}
              fill="rgba(239,68,68,0.35)"
              stroke="#ef4444"
              strokeWidth={1.1 / scale}
              dash={[4 / scale, 3 / scale]}
            />
          ))}
        </Group>
      ))}
    </>
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
  readOnly?: boolean
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
  onContext,
  readOnly
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
    draggable: !obj.locked && !readOnly,
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

  // Spotlight (single) — warm halo + bezel + bright core
  if (obj.kind === 'spotlight') {
    const cx = obj.width / 2
    const cy = obj.height / 2
    const r = obj.width / 2
    return (
      <Group {...common}>
        <Circle x={cx} y={cy} radius={r * 2.2} fill="#fbbf24" opacity={0.18} />
        <Circle x={cx} y={cy} radius={r * 1.4} fill="#fde68a" opacity={0.35} />
        <Circle x={cx} y={cy} radius={r} fill="#fffbeb" stroke="#a16207" strokeWidth={0.8 / scale} />
        <Circle x={cx} y={cy} radius={r * 0.55} fill="#f59e0b" />
        <Circle x={cx} y={cy} radius={r * 0.28} fill="#fff7ed" />
      </Group>
    )
  }

  // Spotlight grid — auto-distribute spots, each with a warm halo
  if (obj.kind === 'spotlight-grid') {
    const rows = obj.data?.rows ?? 3
    const cols = obj.data?.cols ?? 3
    const cellW = obj.width / cols
    const cellH = obj.height / rows
    const spotR = Math.min(cellW, cellH) * 0.18
    const halos: React.JSX.Element[] = []
    const bulbs: React.JSX.Element[] = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = cellW * (col + 0.5)
        const y = cellH * (row + 0.5)
        halos.push(
          <Circle key={`h${row}-${col}`} x={x} y={y} radius={spotR * 2.2} fill="#fbbf24" opacity={0.14} />,
          <Circle key={`m${row}-${col}`} x={x} y={y} radius={spotR * 1.4} fill="#fde68a" opacity={0.3} />
        )
        bulbs.push(
          <Circle key={`b${row}-${col}`} x={x} y={y} radius={spotR} fill="#fffbeb" stroke="#a16207" strokeWidth={0.6 / scale} />,
          <Circle key={`c${row}-${col}`} x={x} y={y} radius={spotR * 0.55} fill="#f59e0b" />
        )
      }
    }
    return (
      <Group {...common}>
        <Rect width={obj.width} height={obj.height} fill={selected ? 'rgba(245,158,11,0.06)' : 'transparent'} stroke="#0f172a" strokeWidth={0.8 / scale} dash={[6 / scale, 4 / scale]} />
        {halos}
        {bulbs}
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
    const tension = obj.data?.curved ? 0.5 : 0
    return (
      <Group {...common} onDblClick={addWaypoint} onDblTap={addWaypoint}>
        {/* Soft glow stack — three blurred strokes give the LED an aura */}
        <Line points={flat} tension={tension} stroke="#fde68a" strokeWidth={Math.max(14, 22 / scale)} opacity={0.35} lineCap="round" lineJoin="round" />
        <Line points={flat} tension={tension} stroke="#fbbf24" strokeWidth={Math.max(8, 12 / scale)} opacity={0.55} lineCap="round" lineJoin="round" />
        <Line points={flat} tension={tension} stroke="#f59e0b" strokeWidth={Math.max(3, 6 / scale)} lineCap="round" lineJoin="round" />
        <Line points={flat} tension={tension} stroke="#fff7ed" strokeWidth={Math.max(1, 2 / scale)} opacity={0.9} lineCap="round" lineJoin="round" />
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
    const hasLED = obj.moduleId.includes('led')
    if (obj.data?.perimeter !== false) {
      const sides = obj.data?.sides ?? ['top', 'right', 'bottom', 'left']
      const t = Math.max(6, obj.height) // ribbon thickness in world cm
      const ribbon = (x: number, y: number, w: number, h: number, side: 'top' | 'right' | 'bottom' | 'left') => {
        const parts: React.JSX.Element[] = []
        // outer band — plaster body
        parts.push(<Rect key={`${side}-b`} x={x} y={y} width={w} height={h} fill="#f1f5f9" stroke="#475569" strokeWidth={1 / scale} />)
        // inner shadow line
        parts.push(<Rect key={`${side}-s`} x={x + 1 / scale} y={y + 1 / scale} width={w - 2 / scale} height={h - 2 / scale} fill="none" stroke="#94a3b8" strokeWidth={0.4 / scale} />)
        if (hasLED) {
          // LED glow ribbon on the inner edge facing the room interior
          const glowT = Math.max(2, h * 0.25)
          let gx = x, gy = y, gw = w, gh = glowT
          if (side === 'top') { gy = y + h - glowT }
          else if (side === 'bottom') { gy = y }
          else if (side === 'left') { gx = x + w - glowT; gw = glowT; gh = h }
          else { gx = x; gw = glowT; gh = h }
          parts.push(<Rect key={`${side}-glow1`} x={gx - 4 / scale} y={gy - 4 / scale} width={gw + 8 / scale} height={gh + 8 / scale} fill="#fbbf24" opacity={0.25} />)
          parts.push(<Rect key={`${side}-glow2`} x={gx} y={gy} width={gw} height={gh} fill="#f59e0b" opacity={0.85} />)
        }
        return parts
      }
      const all: React.JSX.Element[] = []
      if (sides.includes('top')) all.push(...ribbon(0, 0, room.width, t, 'top'))
      if (sides.includes('bottom')) all.push(...ribbon(0, room.length - t, room.width, t, 'bottom'))
      if (sides.includes('left')) all.push(...ribbon(0, 0, t, room.length, 'left'))
      if (sides.includes('right')) all.push(...ribbon(room.width - t, 0, t, room.length, 'right'))
      return (
        <Group id={`obj-${obj.id}`} onClick={onSelect} onTap={onSelect}>
          {all}
          {selected && (
            <Rect x={0} y={0} width={room.width} height={room.length} listening={false} stroke="#f59e0b" strokeWidth={1.5 / scale} dash={[8 / scale, 4 / scale]} />
          )}
        </Group>
      )
    }
    return (
      <Group {...common}>
        <Rect width={obj.width} height={obj.height} fill="#f1f5f9" stroke="#475569" strokeWidth={1 / scale} />
        <Rect x={2} y={2} width={obj.width - 4} height={obj.height - 4} stroke="#94a3b8" strokeWidth={0.5 / scale} />
        {hasLED && <Rect x={2} y={obj.height * 0.7} width={obj.width - 4} height={Math.max(2, obj.height * 0.18)} fill="#f59e0b" opacity={0.85} />}
      </Group>
    )
  }

  // Rosace — ornate plaster rosace with petals + concentric rings
  if (obj.kind === 'rosace') {
    const cx = obj.width / 2
    const cy = obj.height / 2
    const r = obj.width / 2
    const petals: React.JSX.Element[] = []
    const petalCount = 12
    for (let i = 0; i < petalCount; i++) {
      const a = (i / petalCount) * Math.PI * 2
      const px = cx + Math.cos(a) * r * 0.72
      const py = cy + Math.sin(a) * r * 0.72
      petals.push(
        <Circle key={`p${i}`} x={px} y={py} radius={r * 0.16} fill="#fef3c7" stroke="#a16207" strokeWidth={0.6 / scale} />
      )
    }
    return (
      <Group {...common}>
        <Circle x={cx} y={cy} radius={r} fill="#fffbeb" stroke="#a16207" strokeWidth={1.2 / scale} />
        <Circle x={cx} y={cy} radius={r * 0.92} fill="none" stroke="#a16207" strokeWidth={0.5 / scale} />
        {petals}
        <Circle x={cx} y={cy} radius={r * 0.42} fill="#fef3c7" stroke="#a16207" strokeWidth={0.7 / scale} />
        <Circle x={cx} y={cy} radius={r * 0.32} fill="none" stroke="#a16207" strokeWidth={0.4 / scale} />
        <Circle x={cx} y={cy} radius={r * 0.16} fill="#a16207" />
        <Circle x={cx} y={cy} radius={r * 0.06} fill="#fffbeb" />
      </Group>
    )
  }

  // Obstacle (chimney / opening / column to cut around)
  if (obj.kind === 'obstacle') {
    return (
      <Group {...common}>
        <Rect width={obj.width} height={obj.height} fill="#0f172a" stroke="#ef4444" strokeWidth={1.5 / scale} />
        <Line points={[0, 0, obj.width, obj.height]} stroke="#ef4444" strokeWidth={1.5 / scale} />
        <Line points={[obj.width, 0, 0, obj.height]} stroke="#ef4444" strokeWidth={1.5 / scale} />
        {selected && (
          <Text
            x={4 / scale}
            y={-(14 / scale)}
            text={obj.data?.label ?? 'obstacle'}
            fontSize={12 / scale}
            fill="#ef4444"
            fontStyle="bold"
          />
        )}
      </Group>
    )
  }

  // Cloison (interior wall partition — viewed in plan as a thick line)
  if (obj.kind === 'cloison') {
    const t = Math.max(6, obj.data?.thickness ?? 7)
    return (
      <Group {...common}>
        <Rect width={obj.width} height={t} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.4 / scale} />
        {/* studs every 60 cm */}
        {Array.from({ length: Math.floor(obj.width / 60) + 1 }, (_, i) => (
          <Line
            key={i}
            points={[i * 60, 0, i * 60, t]}
            stroke="#475569"
            strokeWidth={1 / scale}
          />
        ))}
        {selected && (
          <Text
            x={0}
            y={t + 6 / scale}
            text={`Cloison ${(obj.width / 100).toFixed(2)} m × H ${((obj.data?.wallHeight ?? room.height) / 100).toFixed(2)} m`}
            fontSize={12 / scale}
            fill="#0f172a"
          />
        )}
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
