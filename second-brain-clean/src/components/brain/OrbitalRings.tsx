'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const RINGS = [
  { radius: 22, tube: 0.025, color: '#06b6d4', rotation: [0.4, 0, 0], speed: 0.12 },
  { radius: 30, tube: 0.02, color: '#8b5cf6', rotation: [1.2, 0.5, 0.3], speed: -0.08 },
  { radius: 38, tube: 0.022, color: '#a855f7', rotation: [2.1, 0.8, -0.2], speed: 0.06 },
] as const

export default function OrbitalRings() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime

    groupRef.current.children.forEach((child, i) => {
      const ring = child as THREE.Mesh
      const speed = RINGS[i].speed
      ring.rotation.z += speed * delta
      // Subtle oscillation on x
      ring.rotation.x = RINGS[i].rotation[0] + Math.sin(t * speed * 2) * 0.05
    })
  })

  return (
    <group ref={groupRef}>
      {RINGS.map((ring, i) => (
        <mesh key={i} rotation={ring.rotation as unknown as [number, number, number]}>
          <torusGeometry args={[ring.radius, ring.tube, 16, 128]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}