'use client'

import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { SettingsMap } from '@/lib/types'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

interface SettingsPanelProps {
  settings: SettingsMap | null
  isLoading: boolean
  onUpdateSetting: (key: string, value: string) => void
  onExport: () => void
  onClose: () => void
}

export default function SettingsPanel({
  settings,
  isLoading,
  onUpdateSetting,
  onExport,
  onClose,
}: SettingsPanelProps) {
  const settingsMap = useMemo(() => {
    if (!settings) return {} as Record<string, string>
    const mapped: Record<string, string> = {}
    for (const [key, val] of Object.entries(settings)) {
      mapped[key] = val.value
    }
    return mapped
  }, [settings])

  const getSetting = useCallback(
    (key: string, fallback: string) => {
      return settingsMap[key] ?? fallback
    },
    [settingsMap]
  )

  const handleSliderChange = (key: string, value: number[]) => {
    const strVal = String(value[0])
    onUpdateSetting(key, strVal)
  }

  const handleSwitchChange = (key: string, checked: boolean) => {
    const strVal = checked ? 'true' : 'false'
    onUpdateSetting(key, strVal)
  }

  const bloomIntensity = parseFloat(getSetting('bloomIntensity', '1.0'))
  const particleDensity = parseInt(getSetting('particleDensity', '100'), 10)
  const autoRotate = getSetting('autoRotate', 'true') === 'true'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 flex h-[60vh] max-w-lg w-full flex-col rounded-xl border border-white/5 bg-black/50 backdrop-blur-xl"
      >
        {/* Header */}
        <motion.div
          variants={item}
          className="flex items-center justify-between border-b border-white/5 px-5 py-4"
        >
          <h2 className="font-mono text-sm font-semibold tracking-[0.1em] text-slate-300 uppercase">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </motion.div>

        {/* Settings body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
            </div>
          ) : (
            <motion.div variants={item} className="flex flex-col gap-6">
              {/* Visualization section */}
              <div>
                <p className="mb-4 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                  Visualization
                </p>

                {/* Bloom Intensity */}
                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400">
                      Bloom Intensity
                    </span>
                    <span className="font-mono text-[10px] text-cyan-400">
                      {bloomIntensity.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    value={[bloomIntensity]}
                    onValueChange={(v) => handleSliderChange('bloomIntensity', v)}
                    className="[&_[data-slot=slider-track]]:bg-white/5 [&_[data-slot=slider-range]]:bg-cyan-500/50 [&_[data-slot=slider-thumb]]:border-cyan-500"
                  />
                </div>

                {/* Particle Density */}
                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400">
                      Particle Density
                    </span>
                    <span className="font-mono text-[10px] text-cyan-400">
                      {particleDensity}
                    </span>
                  </div>
                  <Slider
                    min={10}
                    max={300}
                    step={10}
                    value={[particleDensity]}
                    onValueChange={(v) => handleSliderChange('particleDensity', v)}
                    className="[&_[data-slot=slider-track]]:bg-white/5 [&_[data-slot=slider-range]]:bg-cyan-500/50 [&_[data-slot=slider-thumb]]:border-cyan-500"
                  />
                </div>

                {/* Auto Rotate */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">
                    Auto Rotate
                  </span>
                  <Switch
                    checked={autoRotate}
                    onCheckedChange={(v) => handleSwitchChange('autoRotate', v)}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className="w-full font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400 hover:bg-white/5 hover:text-slate-300"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Data
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}