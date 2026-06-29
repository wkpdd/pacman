import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useCanvasStore } from '@/store/canvasStore'
import { PLAQUE_TYPE, LED_COLOR_INFO } from '@/modules/faux-plafond/library'
import { layoutPlaques } from '@/modules/faux-plafond/plaqueLayout'
import { polylineLengthM } from '@/utils/units'
import type { LightingCondition, PlacedObject, Room } from '@/types'

/**
 * Real 3D scene with Three.js. Layers from bottom to top:
 *   - Floor (cosmetic reference)
 *   - 4 walls extruded to room height
 *   - Ceiling plane at room height
 *   - Per-plaque tiles on the ceiling (BA13 layout, optional)
 *   - Retombée drop-ceiling boxes
 *   - Cloison partition boxes
 *   - Corniche ribbons along perimeter
 *   - Rosace discs flush with the ceiling
 *   - Spots as glowing emissive discs + PointLights
 *   - LED strip as a TubeGeometry along the polyline
 *
 * Receives state from the canvas store (designer broadcasts via
 * BroadcastChannel; receiver hook keeps the store in sync).
 */
export function Scene3D(): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null)
  const room = useCanvasStore((s) => s.room)
  const objects = useCanvasStore((s) => s.objects).filter((o) => !o.hidden)
  const designName = useCanvasStore((s) => s.designName)
  const [lighting, setLighting] = useState<LightingCondition>('day')

  useEffect(() => {
    document.title = `Vue 3D — ${designName}`
  }, [designName])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const { width, height } = mount.getBoundingClientRect()

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(
      lighting === 'night' ? '#020617'
      : lighting === 'evening' ? '#312e81'
      : '#e0e7ff'
    )

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000)
    // Orbit around the room center; position slightly above ceiling height
    // and offset diagonally so the ceiling design is the main subject.
    const maxDim = Math.max(room.width, room.length)
    camera.position.set(
      room.width / 2 + maxDim * 0.55,
      room.height + maxDim * 0.45,
      room.length / 2 + maxDim * 0.7
    )

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    // Orbit around the ceiling — that's the design surface.
    controls.target.set(room.width / 2, room.height, room.length / 2)
    controls.enableDamping = true
    controls.minDistance = 200
    controls.maxDistance = 3000

    // Ambient + sun — driven by the lighting condition slider
    const ambientI = lighting === 'night' ? 0.05 : lighting === 'evening' ? 0.18 : 0.45
    const sunI = lighting === 'night' ? 0 : lighting === 'evening' ? 0.35 : 0.9
    scene.add(new THREE.AmbientLight(0xffffff, ambientI))
    const sun = new THREE.DirectionalLight(0xffffff, sunI)
    sun.position.set(room.width * 0.4, room.height * 3, room.length * 0.4)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    scene.add(sun)

    buildScene(scene, room, objects, lighting)

    // Ground reference grid
    const grid = new THREE.GridHelper(Math.max(room.width, room.length) * 2, 30, 0x94a3b8, 0xcbd5e1)
    grid.position.set(room.width / 2, 0, room.length / 2)
    scene.add(grid)

    let raf = 0
    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      const r = mount.getBoundingClientRect()
      camera.aspect = r.width / r.height
      camera.updateProjectionMatrix()
      renderer.setSize(r.width, r.height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      scene.traverse((o) => {
        if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose()
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m?.dispose()
      })
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [room, objects, lighting])

  return (
    <div className="scene3d-wrap">
      <header className="view-window-header">
        <span className="view-window-tag">⬢ Vue 3D</span>
        <strong className="view-window-name">{designName}</strong>
        <span className="lighting-switch">
          {(['day', 'evening', 'night'] as LightingCondition[]).map((c) => (
            <button
              key={c}
              className={lighting === c ? 'on' : ''}
              onClick={() => setLighting(c)}
            >
              {c === 'day' ? '☀ Jour' : c === 'evening' ? '🌆 Soir' : '🌙 Nuit'}
            </button>
          ))}
        </span>
        <span className="muted">Glissez · molette · clic-droit</span>
      </header>
      <div ref={mountRef} className="scene3d-mount" />
    </div>
  )
}

function buildScene(scene: THREE.Scene, room: Room, objects: PlacedObject[], lighting: LightingCondition): void {
  const { width: W, length: L, height: H } = room
  const wallColor = new THREE.Color(room.wallColor ?? '#e2e8f0')
  const ceilingColor = new THREE.Color(room.ceilingColor ?? '#fffbeb')
  const floorColor = new THREE.Color(room.floorColor ?? '#f1f5f9')
  // In night mode, decoration emissives crank up so the ceiling visibly glows.
  const emissiveBoost = lighting === 'night' ? 2.2 : lighting === 'evening' ? 1.3 : 1.0

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, L),
    new THREE.MeshStandardMaterial({ color: floorColor.clone() })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(W / 2, 0, L / 2)
  floor.receiveShadow = true
  scene.add(floor)

  // Walls — render only a low stub (1/3 of room height) so the camera can
  // look into the room from above without the walls blocking the view of
  // the ceiling layers.
  const wallStubH = Math.min(80, H / 3)
  const wallT = 4
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor.clone(), side: THREE.DoubleSide })
  scene.add(makeBox(W + wallT * 2, wallStubH, wallT, W / 2, wallStubH / 2, -wallT / 2, wallMat))
  scene.add(makeBox(W + wallT * 2, wallStubH, wallT, W / 2, wallStubH / 2, L + wallT / 2, wallMat))
  scene.add(makeBox(wallT, wallStubH, L, -wallT / 2, wallStubH / 2, L / 2, wallMat))
  scene.add(makeBox(wallT, wallStubH, L, W + wallT / 2, wallStubH / 2, L / 2, wallMat))

  // Ceiling-height edge ring — slim rails marking the actual ceiling height
  // so the 3D viewer perceives the room volume without occlusion.
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
  const edgeT = 2
  scene.add(makeBox(W + wallT * 2, edgeT, edgeT, W / 2, H, -wallT / 2, edgeMat))
  scene.add(makeBox(W + wallT * 2, edgeT, edgeT, W / 2, H, L + wallT / 2, edgeMat))
  scene.add(makeBox(edgeT, edgeT, L, -wallT / 2, H, L / 2, edgeMat))
  scene.add(makeBox(edgeT, edgeT, L, W + wallT / 2, H, L / 2, edgeMat))

  // No ceiling cap — the ceiling layers (plaques, rosace, spots, LED) are
  // their own meshes and we want them visible from above. A faint backing
  // disk underneath the ceiling height anchors the room visually without
  // occluding the layers.
  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(W, L),
    new THREE.MeshStandardMaterial({ color: ceilingColor.clone(), side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  )
  backing.rotation.x = -Math.PI / 2
  backing.position.set(W / 2, H - 6, L / 2)
  backing.renderOrder = -1
  scene.add(backing)

  // ---- Optional: BA13 plaque tiles on the ceiling for the placo lens
  const obstacles = objects.filter((o) => o.kind === 'obstacle')
  const layout = layoutPlaques(room, obstacles)
  const plaqueColor = new THREE.Color(PLAQUE_TYPE.standard.color)
  for (const p of layout.plaques) {
    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(p.w * 0.97, p.h * 0.97),
      new THREE.MeshStandardMaterial({ color: plaqueColor, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    )
    tile.rotation.x = Math.PI / 2
    tile.position.set(p.x + p.w / 2, H - 1, p.y + p.h / 2)
    scene.add(tile)
  }

  // ---- Per-object layers
  for (const o of objects) {
    switch (o.kind) {
      case 'retombee': {
        const drop = o.data?.drop ?? 25
        const box = makeBox(
          o.width, drop, o.height,
          o.x + o.width / 2, H - drop / 2, o.y + o.height / 2,
          new THREE.MeshStandardMaterial({ color: 0xe5e7eb })
        )
        box.castShadow = true
        scene.add(box)
        break
      }
      case 'cloison': {
        const t = o.data?.thickness ?? 7
        const h = o.data?.wallHeight ?? H
        const windows = o.data?.windows ?? []
        // For a partition with windows: split the wall into rectangular
        // segments around each opening so the openings actually look cut.
        // Simplification: render the wall as N short box pieces — one per
        // gap between window edges, plus a sill strip below and lintel
        // strip above each window.
        const fullMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1 })
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x60a5fa, transparent: true, opacity: 0.35, emissive: 0x60a5fa, emissiveIntensity: 0.2
        })
        const sortedWins = [...windows].sort((a, b) => a.x - b.x)
        const segments: Array<[number, number]> = [] // [startX, endX] of solid wall pieces
        let cursor = 0
        for (const w of sortedWins) {
          if (w.x > cursor) segments.push([cursor, w.x])
          cursor = w.x + w.width
        }
        if (cursor < o.width) segments.push([cursor, o.width])
        const cloisonGroup = new THREE.Group()
        // Solid pieces (full height)
        for (const [x0, x1] of segments) {
          const segW = x1 - x0
          cloisonGroup.add(makeBox(segW, h, t, x0 + segW / 2, h / 2, t / 2, fullMat))
        }
        // Sill (below window) and lintel (above window)
        for (const w of sortedWins) {
          if (w.sill > 0) cloisonGroup.add(makeBox(w.width, w.sill, t, w.x + w.width / 2, w.sill / 2, t / 2, fullMat))
          const lintelStart = w.sill + w.height
          if (h > lintelStart) {
            cloisonGroup.add(makeBox(w.width, h - lintelStart, t, w.x + w.width / 2, (h + lintelStart) / 2, t / 2, fullMat))
          }
          // Glass pane
          cloisonGroup.add(makeBox(w.width, w.height, t * 0.4, w.x + w.width / 2, w.sill + w.height / 2, t / 2, glassMat))
        }
        cloisonGroup.position.set(o.x, 0, o.y)
        cloisonGroup.rotation.y = THREE.MathUtils.degToRad(o.rotation)
        scene.add(cloisonGroup)
        break
      }
      case 'lamp': {
        const cx = o.x + o.width / 2
        const cz = o.y + o.height / 2
        const hang = o.data?.hangHeight ?? 80
        const top = H
        const bulbCol = o.data?.bulbColor === 'cool' ? 0xbfdbfe
          : o.data?.bulbColor === 'neutral' ? 0xfef3c7
          : 0xfbbf24
        const wattage = (o.data?.bulbCount ?? 1) * (o.data?.bulbWattage ?? 40)
        // Hanging wire
        if (hang > 0) {
          const wire = makeBox(0.6, hang, 0.6, cx, top - hang / 2, cz, new THREE.MeshStandardMaterial({ color: 0x0f172a }))
          scene.add(wire)
        }
        const fixtureY = top - hang
        // Shade — vary by kind
        const kind = o.data?.lampKind ?? 'pendant'
        const r = o.width / 2
        if (kind === 'chandelier') {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(r * 0.9, r * 0.06, 8, 24),
            new THREE.MeshStandardMaterial({ color: 0xa16207, metalness: 0.6 })
          )
          ring.rotation.x = Math.PI / 2
          ring.position.set(cx, fixtureY - 4, cz)
          scene.add(ring)
          // Multiple bulbs on the ring
          const n = o.data?.bulbCount ?? 5
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2
            const bx = cx + Math.cos(a) * r * 0.9
            const bz = cz + Math.sin(a) * r * 0.9
            const bulb = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.18, 12, 12),
              new THREE.MeshStandardMaterial({ color: bulbCol, emissive: bulbCol, emissiveIntensity: 1.2 * emissiveBoost })
            )
            bulb.position.set(bx, fixtureY - 8, bz)
            scene.add(bulb)
          }
        } else if (kind === 'plafonnier') {
          const dome = new THREE.Mesh(
            new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: bulbCol, emissive: bulbCol, emissiveIntensity: 0.6 * emissiveBoost, side: THREE.DoubleSide })
          )
          dome.rotation.x = Math.PI
          dome.position.set(cx, top - 2, cz)
          scene.add(dome)
        } else if (kind === 'sconce') {
          const shade = new THREE.Mesh(
            new THREE.ConeGeometry(r, r * 1.2, 16, 1, true),
            new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: bulbCol, emissiveIntensity: 0.5 * emissiveBoost, side: THREE.DoubleSide })
          )
          shade.position.set(cx, fixtureY, cz)
          scene.add(shade)
        } else {
          // Pendant
          const shade = new THREE.Mesh(
            new THREE.ConeGeometry(r, r * 1.5, 24, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x7c3aed, side: THREE.DoubleSide })
          )
          shade.position.set(cx, fixtureY, cz)
          scene.add(shade)
          const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(r * 0.4, 16, 16),
            new THREE.MeshStandardMaterial({ color: bulbCol, emissive: bulbCol, emissiveIntensity: 1.4 * emissiveBoost })
          )
          bulb.position.set(cx, fixtureY - r * 0.4, cz)
          scene.add(bulb)
        }
        // Actual light source
        const light = new THREE.PointLight(bulbCol, Math.min(1.6, wattage / 80) * emissiveBoost, 800, 1.4)
        light.position.set(cx, fixtureY - 5, cz)
        scene.add(light)
        break
      }
      case 'corniche': {
        if (o.data?.perimeter === false) break
        const sides = o.data?.sides ?? ['top', 'right', 'bottom', 'left']
        const isLED = o.moduleId.includes('led')
        const corniceMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9 })
        const t = 8
        const h = isLED ? 12 : 8
        if (sides.includes('top'))
          scene.add(makeBox(W, h, t, W / 2, H - h / 2, t / 2, corniceMat))
        if (sides.includes('bottom'))
          scene.add(makeBox(W, h, t, W / 2, H - h / 2, L - t / 2, corniceMat))
        if (sides.includes('left'))
          scene.add(makeBox(t, h, L, t / 2, H - h / 2, L / 2, corniceMat))
        if (sides.includes('right'))
          scene.add(makeBox(t, h, L, W - t / 2, H - h / 2, L / 2, corniceMat))
        if (isLED) {
          const ledMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
          const ledT = 3
          const dropOff = 2
          if (sides.includes('top'))
            scene.add(makeBox(W, ledT, ledT, W / 2, H - h + dropOff, t + ledT / 2, ledMat))
          if (sides.includes('bottom'))
            scene.add(makeBox(W, ledT, ledT, W / 2, H - h + dropOff, L - t - ledT / 2, ledMat))
          if (sides.includes('left'))
            scene.add(makeBox(ledT, ledT, L, t + ledT / 2, H - h + dropOff, L / 2, ledMat))
          if (sides.includes('right'))
            scene.add(makeBox(ledT, ledT, L, W - t - ledT / 2, H - h + dropOff, L / 2, ledMat))
        }
        break
      }
      case 'rosace': {
        const r = o.width / 2
        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r * 0.95, 4, 32),
          new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0x442200, emissiveIntensity: 0.05 })
        )
        disc.position.set(o.x + r, H - 2, o.y + r)
        scene.add(disc)
        const inner = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.18, r * 0.18, 6, 24),
          new THREE.MeshStandardMaterial({ color: 0xa16207 })
        )
        inner.position.set(o.x + r, H - 1, o.y + r)
        scene.add(inner)
        break
      }
      case 'spotlight':
      case 'spotlight-grid': {
        const positions: [number, number][] = []
        if (o.kind === 'spotlight') {
          positions.push([o.x + o.width / 2, o.y + o.height / 2])
        } else {
          const rows = o.data?.rows ?? 3
          const cols = o.data?.cols ?? 3
          const cellW = o.width / cols
          const cellH = o.height / rows
          for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
              positions.push([o.x + cellW * (c + 0.5), o.y + cellH * (r + 0.5)])
        }
        for (const [x, z] of positions) {
          const r = 4.5
          const ring = new THREE.Mesh(
            new THREE.CylinderGeometry(r, r, 2, 16),
            new THREE.MeshStandardMaterial({ color: 0xfffbeb })
          )
          ring.position.set(x, H - 1, z)
          scene.add(ring)
          const bulb = new THREE.Mesh(
            new THREE.CylinderGeometry(r * 0.55, r * 0.55, 2.2, 16),
            new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfde68a, emissiveIntensity: 1.0 * emissiveBoost })
          )
          bulb.position.set(x, H - 2, z)
          scene.add(bulb)
          const light = new THREE.PointLight(0xffe4a5, 0.6 * emissiveBoost, 600, 1.6)
          light.position.set(x, H - 30, z)
          scene.add(light)
        }
        break
      }
      case 'led-strip': {
        const pts = o.data?.points ?? [{ x: 0, y: 0 }, { x: o.width, y: 0 }]
        if (pts.length < 2) break
        const ledInfo = LED_COLOR_INFO[o.data?.ledColor ?? 'warm']
        const ledHex = new THREE.Color(ledInfo.hex)
        const ledEmissive = new THREE.Color(ledInfo.emissive)
        const curve = new THREE.CatmullRomCurve3(
          pts.map((p) => new THREE.Vector3(o.x + p.x, H - 5, o.y + p.y)),
          false,
          o.data?.curved ? 'centripetal' : 'catmullrom',
          o.data?.curved ? 0.5 : 0
        )
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, Math.max(20, pts.length * 8), 1.5, 8, false),
          new THREE.MeshStandardMaterial({
            color: ledHex.clone(),
            emissive: ledEmissive.clone(),
            emissiveIntensity: 1.6 * emissiveBoost
          })
        )
        scene.add(tube)
        // Soft glow point lights along the strip
        const totalM = polylineLengthM(pts)
        const lightCount = Math.max(2, Math.min(16, Math.round(totalM / 1.5)))
        for (let i = 0; i <= lightCount; i++) {
          const t = i / lightCount
          const p = curve.getPoint(t)
          const light = new THREE.PointLight(ledEmissive.getHex(), 0.45 * emissiveBoost, 220, 2)
          light.position.copy(p).setY(H - 25)
          scene.add(light)
        }
        break
      }
      case 'multi-level': {
        const box = makeBox(
          o.width, 6, o.height,
          o.x + o.width / 2, H - 3, o.y + o.height / 2,
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
        )
        scene.add(box)
        break
      }
      case 'obstacle': {
        // A floor-to-ceiling column rendered slightly inset so it doesn't
        // poke through the ceiling backing.
        const box = makeBox(
          o.width, H - 2, o.height,
          o.x + o.width / 2, (H - 2) / 2, o.y + o.height / 2,
          new THREE.MeshStandardMaterial({ color: 0x0f172a })
        )
        scene.add(box)
        // Cap label at the ceiling so it's clearly identified from above
        const cap = new THREE.Mesh(
          new THREE.PlaneGeometry(o.width * 0.9, o.height * 0.9),
          new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
        )
        cap.rotation.x = Math.PI / 2
        cap.position.set(o.x + o.width / 2, H - 0.5, o.y + o.height / 2)
        scene.add(cap)
        break
      }
    }
  }
}

function makeBox(
  w: number, h: number, d: number,
  cx: number, cy: number, cz: number,
  mat: THREE.Material
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(cx, cy, cz)
  return m
}
