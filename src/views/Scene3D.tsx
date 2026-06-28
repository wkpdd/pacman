import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useCanvasStore } from '@/store/canvasStore'
import { PLAQUE_TYPE } from '@/modules/faux-plafond/library'
import { layoutPlaques } from '@/modules/faux-plafond/plaqueLayout'
import { polylineLengthM } from '@/utils/units'
import type { PlacedObject, Room } from '@/types'

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
  const objects = useCanvasStore((s) => s.objects)
  const designName = useCanvasStore((s) => s.designName)

  useEffect(() => {
    document.title = `Vue 3D — ${designName}`
  }, [designName])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const { width, height } = mount.getBoundingClientRect()

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#e0e7ff')

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

    // Ambient + sun
    scene.add(new THREE.AmbientLight(0xffffff, 0.45))
    const sun = new THREE.DirectionalLight(0xffffff, 0.9)
    sun.position.set(room.width * 0.4, room.height * 3, room.length * 0.4)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    scene.add(sun)

    buildScene(scene, room, objects)

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
  }, [room.width, room.length, room.height, objects])

  return (
    <div className="scene3d-wrap">
      <header className="view-window-header">
        <span className="view-window-tag">⬢ Vue 3D</span>
        <strong className="view-window-name">{designName}</strong>
        <span className="muted">Glissez pour pivoter · molette pour zoomer · clic-droit pour panner</span>
      </header>
      <div ref={mountRef} className="scene3d-mount" />
    </div>
  )
}

function buildScene(scene: THREE.Scene, room: Room, objects: PlacedObject[]): void {
  const { width: W, length: L, height: H } = room
  const wallColor = 0xe2e8f0
  const ceilingColor = 0xfffbeb
  const floorColor = 0xf1f5f9

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, L),
    new THREE.MeshStandardMaterial({ color: floorColor })
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
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, side: THREE.DoubleSide })
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
    new THREE.MeshStandardMaterial({ color: ceilingColor, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
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
        const box = makeBox(
          o.width, h, t,
          o.x + o.width / 2, h / 2, o.y + t / 2,
          new THREE.MeshStandardMaterial({ color: 0xcbd5e1 })
        )
        box.rotation.y = THREE.MathUtils.degToRad(o.rotation)
        box.castShadow = true
        scene.add(box)
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
            new THREE.MeshBasicMaterial({ color: 0xfde68a })
          )
          bulb.position.set(x, H - 2, z)
          scene.add(bulb)
          const light = new THREE.PointLight(0xffe4a5, 0.6, 600, 1.6)
          light.position.set(x, H - 30, z)
          scene.add(light)
        }
        break
      }
      case 'led-strip': {
        const pts = o.data?.points ?? [{ x: 0, y: 0 }, { x: o.width, y: 0 }]
        if (pts.length < 2) break
        const curve = new THREE.CatmullRomCurve3(
          pts.map((p) => new THREE.Vector3(o.x + p.x, H - 5, o.y + p.y)),
          false,
          o.data?.curved ? 'centripetal' : 'catmullrom',
          o.data?.curved ? 0.5 : 0
        )
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, Math.max(20, pts.length * 8), 1.5, 8, false),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        )
        scene.add(tube)
        // Soft glow lights every few meters of strip
        const totalM = polylineLengthM(pts)
        const lightCount = Math.max(2, Math.min(12, Math.round(totalM / 2)))
        for (let i = 0; i <= lightCount; i++) {
          const t = i / lightCount
          const p = curve.getPoint(t)
          const light = new THREE.PointLight(0xfff7ed, 0.35, 200, 2)
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
