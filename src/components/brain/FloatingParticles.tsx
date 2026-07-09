'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FloatingParticlesProps {
  count?: number
}

export default function FloatingParticles({ count = 100 }: FloatingParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const radius = 110

    for (let i = 0; i < count; i++) {
      // Random positions within a sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * Math.cbrt(Math.random()) // cube root for uniform distribution

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)

      // Small random velocities for drifting
      vel[i * 3] = (Math.random() - 0.5) * 0.02
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02
    }

    velocitiesRef.current = vel
    return pos
  }, [count])

  // Reset velocities ref when count changes
  useEffect(() => {
    if (!velocitiesRef.current) {
      const vel = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        vel[i * 3] = (Math.random() - 0.5) * 0.02
        vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02
      }
      velocitiesRef.current = vel
    }
  }, [count])

  useFrame(() => {
    if (!pointsRef.current || !velocitiesRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    const vel = velocitiesRef.current
    const radius = 110

    for (let i = 0; i < count; i++) {
      // Drift
      arr[i * 3] += vel[i * 3]
      arr[i * 3 + 1] += vel[i * 3 + 1]
      arr[i * 3 + 2] += vel[i * 3 + 2]

      // Distance from center
      const dist = Math.sqrt(
        arr[i * 3] ** 2 + arr[i * 3 + 1] ** 2 + arr[i * 3 + 2] ** 2
      )

      // Bounce back if too far
      if (dist > radius) {
        arr[i * 3] *= 0.98
        arr[i * 3 + 1] *= 0.98
        arr[i * 3 + 2] *= 0.98
        vel[i * 3] *= -0.5
        vel[i * 3 + 1] *= -0.5
        vel[i * 3 + 2] *= -0.5
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#94a3b8"
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}