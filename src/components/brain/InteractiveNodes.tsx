'use client'

import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

/* ──────────────────────────── public types ──────────────────────────── */

export interface SceneNode {
  id: string
  title: string
  category: string
  tags: string[]
}

interface InteractiveNodesProps {
  nodes: SceneNode[]
  selectedNodeId: string | null
  linkedNodeIds: Set<string>
  onNodeSelect: (id: string | null) => void
  isMobile?: boolean
  onNodeHover?: (nodeId: string | null, screenPos?: { x: number; y: number }) => void
  dbConnections?: Array<{ from: string; to: string; strength: number; source?: string }>
  nodePositionsRef?: React.RefObject<Map<string, THREE.Vector3> | null>
}

/* ──────────────────────────── constants ──────────────────────────── */

const CAT_COLORS: Record<string, string> = {
  strategy: '#ffb700',
  operations: '#00d4ff',
  research: '#9d4edd',
  systems: '#10b981',
  design: '#ff3c8e',
  general: '#94a3b8',
  compacted: '#38bdf8',
}

const DEFAULT_COLOR = '#94a3b8'

// Scalability thresholds
const MAX_VISIBLE_NODES = 300
const MAX_CONNECTIONS = 150
const INSTANCE_GLOW_THRESHOLD = 80
const CONNECTION_CURVE_SEGS_DESKTOP = 24
const CONNECTION_CURVE_SEGS_MOBILE = 8

function catColor(cat: string): string {
  return CAT_COLORS[cat] ?? DEFAULT_COLOR
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/* ──────────────────────────── helpers ──────────────────────────── */

/** Adaptive spread: grows aggressively with node count for a massive 3D field */
function adaptiveSpread(nodeCount: number): { clusterRadius: number; baseNodeSpread: number } {
  if (nodeCount <= 30)  return { clusterRadius: 25,  baseNodeSpread: 5 }
  if (nodeCount <= 100) return { clusterRadius: 50,  baseNodeSpread: 8 }
  if (nodeCount <= 300) return { clusterRadius: 85,  baseNodeSpread: 12 }
  return                     { clusterRadius: 120, baseNodeSpread: 16 }
}

/** Fibonacci-sphere distribution — true 3D, nodes spread across X/Y/Z */
function fibonacciSphere(count: number, spread: number): THREE.Vector3[] {
  if (count === 0) return []
  if (count === 1) return [new THREE.Vector3(0, 0, 0)]

  const points: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = golden * i

    points.push(new THREE.Vector3(
      radiusAtY * Math.cos(theta) * spread,
      y * spread,
      radiusAtY * Math.sin(theta) * spread,
    ))
  }
  return points
}

/** Compute per-category node spread based on proportion of total nodes */
function perClusterSpread(nodeCountInCluster: number, baseSpread: number): number {
  // Scale spread with cube root of count so large clusters get noticeably bigger
  if (nodeCountInCluster <= 1) return baseSpread * 0.5
  return baseSpread * Math.pow(nodeCountInCluster, 0.4) * 0.6
}

/** Build connections from shared tags — capped at MAX_CONNECTIONS */
function computeTagConnections(nodes: SceneNode[]): Array<{ from: string; to: string }> {
  const tagMap = new Map<string, string[]>()
  for (const n of nodes) {
    for (const tag of n.tags) {
      const ids = tagMap.get(tag)
      if (ids) ids.push(n.id)
      else tagMap.set(tag, [n.id])
    }
  }

  // Collect all pairs with a score (number of shared tags)
  const pairScores = new Map<string, number>()
  for (const ids of tagMap.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join('::')
        pairScores.set(key, (pairScores.get(key) ?? 0) + 1)
      }
    }
  }

  // Sort by score descending, take top MAX_CONNECTIONS
  const sorted = Array.from(pairScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CONNECTIONS)

  const conns: Array<{ from: string; to: string }> = []
  for (const [key] of sorted) {
    const [from, to] = key.split('::')
    conns.push({ from, to })
  }

  return conns
}

/** Merge DB connections with tag-computed connections. DB takes priority. */
function computeConnections(
  nodes: SceneNode[],
  dbConnections?: Array<{ from: string; to: string; strength: number; source?: string }>,
): Array<{ from: string; to: string; strength: number; source: string }> {
  const dbConnKeys = new Set<string>()
  const merged: Array<{ from: string; to: string; strength: number; source: string }> = []

  // 1. Add all DB connections first
  if (dbConnections && dbConnections.length > 0) {
    for (const c of dbConnections) {
      const key = [c.from, c.to].sort().join('::')
      dbConnKeys.add(key)
      merged.push({ from: c.from, to: c.to, strength: c.strength, source: c.source ?? 'db' })
    }
  }

  // 2. Add tag-computed connections (skip if already in DB)
  const tagConns = computeTagConnections(nodes)
  for (const c of tagConns) {
    const key = [c.from, c.to].sort().join('::')
    if (dbConnKeys.has(key)) continue
    merged.push({ from: c.from, to: c.to, strength: 0.5, source: 'tags' })
  }

  return merged
}

/* ──────────────────────────── Scalable Connections (single draw call) ──────────────────────────── */

function ConnectionLines({
  nodePositions,
  connections,
  nodes,
  selectedNodeId,
  isMobile,
}: {
  nodePositions: Map<string, THREE.Vector3>
  connections: Array<{ from: string; to: string; strength: number; source: string }>
  nodes: SceneNode[]
  selectedNodeId: string | null
  isMobile: boolean
}) {
  const lineRef = useRef<THREE.LineSegments>(null)

  const { positions, colors: lineColors } = useMemo(() => {
    const segs = isMobile ? CONNECTION_CURVE_SEGS_MOBILE : CONNECTION_CURVE_SEGS_DESKTOP
    const totalVerts = connections.length * (segs + 1) * 2 // 2 vertices per segment line
    const pos = new Float32Array(totalVerts * 3)
    const col = new Float32Array(totalVerts * 3)
    let idx = 0

    for (const conn of connections) {
      const start = nodePositions.get(conn.from)
      const end = nodePositions.get(conn.to)
      if (!start || !end) continue

      const isActive =
        selectedNodeId !== null &&
        (conn.from === selectedNodeId || conn.to === selectedNodeId)

      const isDbConn = conn.source === 'db'
      const targetNode = nodes.find(
        (n) => n.id === (conn.from === selectedNodeId ? conn.to : conn.from)
      )
      const baseColor = isActive && targetNode
        ? hexToRgb(catColor(targetNode.category))
        : isActive
          ? [0.4, 0.6, 0.8]
          : isDbConn
            ? [0.45, 0.45, 0.5]  // DB connections slightly brighter when idle
            : [0.3, 0.3, 0.35]

      let pts: THREE.Vector3[]
      if (isMobile) {
        pts = [start, end]
      } else {
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        mid.y += start.distanceTo(end) * 0.25
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
        pts = curve.getPoints(segs)
      }

      const alpha = isActive
        ? (isDbConn ? 0.7 : 0.5)     // DB connections brighter when active
        : (isDbConn ? 0.15 : 0.07)     // DB connections slightly brighter when idle

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]
        const b = pts[i + 1]
        pos[idx * 3] = a.x; pos[idx * 3 + 1] = a.y; pos[idx * 3 + 2] = a.z
        col[idx * 3] = baseColor[0] * alpha; col[idx * 3 + 1] = baseColor[1] * alpha; col[idx * 3 + 2] = baseColor[2] * alpha
        idx++
        pos[idx * 3] = b.x; pos[idx * 3 + 1] = b.y; pos[idx * 3 + 2] = b.z
        col[idx * 3] = baseColor[0] * alpha; col[idx * 3 + 1] = baseColor[1] * alpha; col[idx * 3 + 2] = baseColor[2] * alpha
        idx++
      }
    }

    return { positions: pos.slice(0, idx * 3), colors: col.slice(0, idx * 3) }
  }, [nodePositions, connections, nodes, selectedNodeId, isMobile])

  // Pulse active connections
  useFrame((state) => {
    if (!lineRef.current || selectedNodeId === null) return
    const mat = lineRef.current.material as THREE.LineBasicMaterial
    mat.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 3) * 0.15
  })

  if (positions.length === 0) return null

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[lineColors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={selectedNodeId !== null ? 0.5 : 0.07}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  )
}

/* ──────────────────────────── Scalable Node Instances ──────────────────────────── */

function NodeInstances({
  nodes,
  nodePositions,
  selectedNodeId,
  linkedNodeIds,
  onNodeSelect,
  isMobile,
  onNodeHover,
}: {
  nodes: SceneNode[]
  nodePositions: Map<string, THREE.Vector3>
  selectedNodeId: string | null
  linkedNodeIds: Set<string>
  onNodeSelect: (id: string | null) => void
  isMobile: boolean
  onNodeHover?: (nodeId: string | null, screenPos?: { x: number; y: number }) => void
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const glowRef = useRef<THREE.InstancedMesh>(null)
  const { raycaster, camera } = useThree()

  const count = nodes.length
  const showGlow = count <= INSTANCE_GLOW_THRESHOLD && !isMobile

  // Shared geometries
  const nodeGeo = useMemo(() => new THREE.IcosahedronGeometry(0.7, isMobile ? 0 : 1), [isMobile])
  const glowGeo = useMemo(() => new THREE.SphereGeometry(1.1, 12, 12), [])

  // Build per-instance data
  const { idMap, baseColors, emissiveColors } = useMemo(() => {
    const n = nodes.length
    const idMap = new Map<number, string>() // instance index → node id
    const baseColors = new Float32Array(n * 3)
    const emissiveColors = new Float32Array(n * 3)

    for (let i = 0; i < n; i++) {
      const node = nodes[i]
      idMap.set(i, node.id)
      const [r, g, b] = hexToRgb(catColor(node.category))
      baseColors[i * 3] = r / 255
      baseColors[i * 3 + 1] = g / 255
      baseColors[i * 3 + 2] = b / 255
      emissiveColors[i * 3] = r / 255
      emissiveColors[i * 3 + 1] = g / 255
      emissiveColors[i * 3 + 2] = b / 255
    }

    return { idMap, baseColors, emissiveColors }
  }, [nodes])

  // Hover tracking
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const pointer = useRef(new THREE.Vector2())

  // Click detection via raycaster
  const handleClick = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!meshRef.current) return
      // e.point is the intersection point — find nearest instance
      const idx = meshRef.current.userData['lastHoveredIdx'] as number | null
      if (idx !== null && idx >= 0 && idx < count) {
        const nodeId = idMap.get(idx)
        if (nodeId) {
          onNodeSelect(nodeId)
        }
      }
    },
    [idMap, count, onNodeSelect]
  )

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!meshRef.current) return
      // Project node position to screen for tooltip
      const idx = meshRef.current.userData['lastHoveredIdx'] as number | null
      if (idx !== null && idx >= 0 && idx < count && onNodeHover) {
        const nodeId = idMap.get(idx)
        const pos = nodePositions.get(nodeId || '')
        if (pos && nodeId) {
          const projected = pos.clone().project(camera)
          const screenX = (projected.x * 0.5 + 0.5) * window.innerWidth
          const screenY = (-projected.y * 0.5 + 0.5) * window.innerHeight
          onNodeHover(nodeId, { x: screenX, y: screenY })
        }
      }
    },
    [idMap, count, nodePositions, camera, onNodeHover]
  )

  const handlePointerOut = useCallback(() => {
    setHoveredIdx(null)
    onNodeHover?.(null)
  }, [onNodeHover])

  // Update instance matrices and colors every frame
  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const dummy = new THREE.Object3D()
    const hasSelection = selectedNodeId !== null
    const color = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const pos = nodePositions.get(nodes[i].id)
      if (!pos) continue

      dummy.position.copy(pos)

      const isSelected = nodes[i].id === selectedNodeId
      const isLinked = linkedNodeIds.has(nodes[i].id)
      const isHovered = i === hoveredIdx
      const isDimmed = hasSelection && !isSelected && !isLinked

      const scale = isSelected ? 1.4 : isHovered ? 1.2 : 1
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      // Color/emissive
      const [r, g, b] = hexToRgb(catColor(nodes[i].category))
      const dimFactor = isDimmed ? 0.3 : 1
      const emIntensity = isSelected ? 2.5 : isLinked ? 1.8 : isHovered ? 2.0 : 1.0

      color.setRGB(
        (r / 255) * dimFactor,
        (g / 255) * dimFactor,
        (b / 255) * dimFactor
      )
      meshRef.current.setColorAt(i, color)

      // Emissive intensity via vertex color brightness trick — we store it separately
      // Since InstancedMesh only has one material, we modulate the emissive color
      const emColor = new THREE.Color()
      emColor.setRGB(
        (r / 255) * emIntensity * dimFactor,
        (g / 255) * emIntensity * dimFactor,
        (b / 255) * emIntensity * dimFactor
      )
      // We can't set per-instance emissive, so we'll handle it via opacity
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true

    // Update glow instances
    if (showGlow && glowRef.current) {
      for (let i = 0; i < count; i++) {
        const pos = nodePositions.get(nodes[i].id)
        if (!pos) continue
        const isDimmed = hasSelection && nodes[i].id !== selectedNodeId && !linkedNodeIds.has(nodes[i].id)
        dummy.position.copy(pos)
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        glowRef.current.setMatrixAt(i, dummy.matrix)

        const [r, g, b] = hexToRgb(catColor(nodes[i].category))
        const alpha = isDimmed ? 0.02 : 0.08
        color.setRGB((r / 255) * alpha, (g / 255) * alpha, (b / 255) * alpha)
        glowRef.current.setColorAt(i, color)
      }
      glowRef.current.instanceMatrix.needsUpdate = true
      if (glowRef.current.instanceColor) glowRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Main node instances */}
      <instancedMesh
        ref={meshRef}
        args={[nodeGeo, undefined, count]}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          toneMapped={false}
          transparent
          depthWrite={false}
        />
      </instancedMesh>

      {/* Glow aura instances (only for smaller node counts) */}
      {showGlow && (
        <instancedMesh ref={glowRef} args={[glowGeo, undefined, count]}>
          <meshBasicMaterial
            transparent
            opacity={0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </instancedMesh>
      )}
    </group>
  )
}

/* ──────────────────────────── Selection Ring (single mesh, always rendered) ──────────────────────────── */

function SelectionRing({
  nodePositions,
  selectedNodeId,
}: {
  nodePositions: Map<string, THREE.Vector3>
  selectedNodeId: string | null
}) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ringRef.current || !selectedNodeId) return
    const pos = nodePositions.get(selectedNodeId)
    if (!pos) return
    ringRef.current.position.copy(pos)
    ringRef.current.rotation.z = state.clock.elapsedTime * 1.5
    const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
    ringRef.current.scale.setScalar(scale)
  })

  if (!selectedNodeId) return null

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.1, 0.04, 8, 48]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

/* ──────────────────────────── InteractiveNodes (main) ──────────────────────────── */

export default function InteractiveNodes({
  nodes,
  selectedNodeId,
  linkedNodeIds,
  onNodeSelect,
  isMobile = false,
  onNodeHover,
  dbConnections,
  nodePositionsRef,
}: InteractiveNodesProps) {
  const groupRef = useRef<THREE.Group>(null)
  const pauseTimer = useRef(0)

  // Cap visible nodes
  const visibleNodes = useMemo(
    () => (nodes.length > MAX_VISIBLE_NODES ? nodes.slice(0, MAX_VISIBLE_NODES) : nodes),
    [nodes]
  )
  const isCapped = nodes.length > MAX_VISIBLE_NODES

  const { clusterRadius, baseNodeSpread } = useMemo(
    () => adaptiveSpread(visibleNodes.length),
    [visibleNodes.length]
  )

  /* ── Compute node positions by category clustering in 3D ── */
  const nodePositions = useMemo(() => {
    const byCategory = new Map<string, SceneNode[]>()
    for (const n of visibleNodes) {
      const arr = byCategory.get(n.category)
      if (arr) arr.push(n)
      else byCategory.set(n.category, [n])
    }

    const categories = Array.from(byCategory.keys())
    const positions = new Map<string, THREE.Vector3>()

    // Place category CENTERS on a fibonacci sphere so they're spread in true 3D
    const catCenters = fibonacciSphere(categories.length, clusterRadius)

    categories.forEach((cat, catIdx) => {
      const catNodes = byCategory.get(cat)!
      const center = catCenters[catIdx]

      // Scale node spread based on how many nodes are in this cluster
      const spread = perClusterSpread(catNodes.length, baseNodeSpread)
      const catPositions = fibonacciSphere(catNodes.length, spread)

      catNodes.forEach((node, i) => {
        const p = catPositions[i]
        positions.set(node.id, new THREE.Vector3(
          p.x + center.x,
          p.y + center.y,
          p.z + center.z,
        ))
      })
    })

    return positions
  }, [visibleNodes, clusterRadius, baseNodeSpread])

  // Sync computed positions to the external ref (used by CameraFocusController)
  useEffect(() => {
    if (nodePositionsRef && 'current' in nodePositionsRef) {
      nodePositionsRef.current = nodePositions
    }
  }, [nodePositions, nodePositionsRef])

  /* ── Connections (capped) ── */
  const connections = useMemo(() => computeConnections(visibleNodes, dbConnections), [visibleNodes, dbConnections])

  const hasSelection = selectedNodeId !== null

  /* ── Group rotation with pause on selection ── */
  useFrame((_, delta) => {
    if (!groupRef.current) return

    if (hasSelection) {
      pauseTimer.current += delta
      if (pauseTimer.current < 8) return
    } else {
      pauseTimer.current = 0
    }

    groupRef.current.rotation.y += delta * 0.03
  })

  /* ── Empty state ── */
  if (visibleNodes.length === 0) return null

  return (
    <group ref={groupRef}>
      {/* Connection lines — single draw call */}
      <ConnectionLines
        nodePositions={nodePositions}
        connections={connections}
        nodes={visibleNodes}
        selectedNodeId={selectedNodeId}
        isMobile={isMobile}
      />

      {/* Node instances — single draw call */}
      <NodeInstances
        nodes={visibleNodes}
        nodePositions={nodePositions}
        selectedNodeId={selectedNodeId}
        linkedNodeIds={linkedNodeIds}
        onNodeSelect={onNodeSelect}
        isMobile={isMobile}
        onNodeHover={onNodeHover}
      />

      {/* Selection ring — single mesh */}
      <SelectionRing
        nodePositions={nodePositions}
        selectedNodeId={selectedNodeId}
      />
    </group>
  )
}