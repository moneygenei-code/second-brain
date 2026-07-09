'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function CoreSphere() {
  const coreRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (coreRef.current) {
      // Slow rotation
      coreRef.current.rotation.y = t * 0.15
      coreRef.current.rotation.x = Math.sin(t * 0.1) * 0.2

      // Pulsing scale
      const pulse = 1 + Math.sin(t * 0.8) * 0.08
      coreRef.current.scale.setScalar(pulse)
    }

    if (glowRef.current) {
      // Glow pulses slightly out of phase
      const glowPulse = 1 + Math.sin(t * 0.6 + 1) * 0.12
      glowRef.current.scale.setScalar(glowPulse)
    }
  })

  return (
    <group>
      {/* Core icosahedron */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.8, 2]} />
        <meshStandardMaterial
          color="#0d9488"
          emissive="#14b8a6"
          emissiveIntensity={1.5}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Outer glow mesh */}
      <mesh ref={glowRef}>
        <icosahedronGeometry args={[2.8, 1]} />
        <meshBasicMaterial
          color="#14b8a6"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Secondary glow layer */}
      <mesh>
        <icosahedronGeometry args={[3.5, 0]} />
        <meshBasicMaterial
          color="#0d9488"
          transparent
          opacity={0.03}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}