'use client'

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

interface PostEffectsProps {
  bloomIntensity: number
}

export function PostEffects({ bloomIntensity }: PostEffectsProps) {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.3}
        luminanceSmoothing={0.9}
        mipmapBlur
        intensity={bloomIntensity}
      />
      <Vignette offset={0.3} darkness={0.7} />
    </EffectComposer>
  )
}