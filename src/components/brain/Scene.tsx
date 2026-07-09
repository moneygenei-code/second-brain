'use client'

import { useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { PostEffects } from './PostEffects'
import StarField from './StarField'
import CoreSphere from './CoreSphere'
import OrbitalRings from './OrbitalRings'
import BoundarySphere from './BoundarySphere'
import FloatingParticles from './FloatingParticles'
import InteractiveNodes, { type SceneNode } from './InteractiveNodes'

/* ──────────────────────────── types ──────────────────────────── */

interface SceneProps {
  nodes: SceneNode[]
  selectedNodeId: string | null
  linkedNodeIds: Set<string>
  onNodeSelect: (id: string | null) => void
  onNodeHover?: (nodeId: string | null, screenPos?: { x: number; y: number }) => void
  bloomIntensity?: number
  particleCount?: number
  autoRotate?: boolean
  isMobile?: boolean
  dbConnections?: Array<{ from: string; to: string; strength: number }>
}

/* ──────────────────────────── Camera focus controller ──────────────────────────── */

function CameraFocusController({
  selectedNodeId,
  nodes,
  nodePositionsRef,
}: {
  selectedNodeId: string | null
  nodes: SceneNode[]
  nodePositionsRef: React.RefObject<Map<string, THREE.Vector3> | null>
}) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3(0, 20, 65))
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))

  useFrame(() => {
    if (!selectedNodeId || !nodePositionsRef.current) {
      // Lerp back to default
      currentLookAt.current.lerp(new THREE.Vector3(0, 0, 0), 0.02)
    } else {
      const nodePos = nodePositionsRef.current.get(selectedNodeId)
      if (nodePos) {
        currentLookAt.current.lerp(nodePos, 0.05)
      }
    }
    camera.lookAt(currentLookAt.current)
  })

  return null
}

/* ──────────────────────────── Scene inner content ──────────────────────────── */

function SceneContent({
  nodes,
  selectedNodeId,
  linkedNodeIds,
  onNodeSelect,
  onNodeHover,
  bloomIntensity,
  particleCount,
  autoRotate,
  isMobile,
  enableBloom,
  dbConnections,
}: {
  nodes: SceneNode[]
  selectedNodeId: string | null
  linkedNodeIds: Set<string>
  onNodeSelect: (id: string | null) => void
  onNodeHover?: (nodeId: string | null, screenPos?: { x: number; y: number }) => void
  bloomIntensity: number
  particleCount: number
  autoRotate: boolean
  isMobile: boolean
  enableBloom: boolean
  dbConnections?: Array<{ from: string; to: string; strength: number }>
}) {
  // Click on empty space to deselect
  const handleMissed = useCallback(() => {
    onNodeSelect(null)
  }, [onNodeSelect])

  // Build a ref-able positions map for CameraFocusController
  const nodePositionsRef = useRef<Map<string, THREE.Vector3>>(new Map())

  return (
    <>
      {/* Ambient light (dim) */}
      <ambientLight intensity={0.15} />

      {/* Point lights — cyan, purple, rose */}
      <pointLight position={[50, 40, 30]} color="#06b6d4" intensity={1.0} />
      <pointLight position={[-40, -25, 50]} color="#8b5cf6" intensity={0.8} />
      <pointLight position={[0, -50, -40]} color="#f43f5e" intensity={0.5} />

      {/* Background elements */}
      <StarField count={isMobile ? 1000 : 4000} />
      <BoundarySphere />
      <CoreSphere />
      <OrbitalRings />

      {/* Interactive nodes + connections */}
      <InteractiveNodes
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        linkedNodeIds={linkedNodeIds}
        onNodeSelect={onNodeSelect}
        isMobile={isMobile}
        onNodeHover={onNodeHover}
        dbConnections={dbConnections}
        nodePositionsRef={nodePositionsRef}
      />

      {/* Floating particles */}
      <FloatingParticles count={particleCount} />

      {/* Camera controller */}
      <CameraFocusController
        selectedNodeId={selectedNodeId}
        nodes={nodes}
        nodePositionsRef={nodePositionsRef}
      />

      {/* Orbit controls */}
      <OrbitControls
        dampingFactor={0.05}
        enableDamping
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
        minDistance={30}
        maxDistance={300}
      />

      {/* Postprocessing effects */}
      {enableBloom && <PostEffects bloomIntensity={bloomIntensity} />}
    </>
  )
}

/* ──────────────────────────── Scene (exported) ──────────────────────────── */

export default function Scene({
  nodes,
  selectedNodeId,
  linkedNodeIds,
  onNodeSelect,
  onNodeHover,
  bloomIntensity = 1.2,
  particleCount,
  autoRotate = true,
  isMobile = false,
  dbConnections,
}: SceneProps) {
  const effectiveParticleCount = isMobile ? 30 : particleCount ?? 100
  const enableBloom = !isMobile

  return (
    <Canvas
      camera={{ position: [0, 35, 140], fov: 55, near: 0.1, far: 800 }}
      dpr={isMobile ? [1, 1] : [1, 1.5]}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: !isMobile, alpha: false }}
      onPointerMissed={() => onNodeSelect(null)}
    >
      <color attach="background" args={['#050509']} />
      <fog attach="fog" args={['#050509', 150, 600]} />

      <SceneContent
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        linkedNodeIds={linkedNodeIds}
        onNodeSelect={onNodeSelect}
        bloomIntensity={bloomIntensity}
        particleCount={effectiveParticleCount}
        autoRotate={autoRotate}
        isMobile={isMobile}
        enableBloom={enableBloom}
        dbConnections={dbConnections}
      />
    </Canvas>
  )
}