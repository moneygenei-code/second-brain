'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function BoundarySphere() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.01
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.05
    }
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[160, 3]} />
      <meshBasicMaterial
        color="#1e293b"
        transparent
        opacity={0.04}
        wireframe
        depthWrite={false}
      />
    </mesh>
  )
}