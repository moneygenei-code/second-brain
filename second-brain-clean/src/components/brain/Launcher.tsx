'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LauncherProps {
  onLaunch: () => void
}

const PARTICLE_COUNT = 40

export default function Launcher({ onLaunch }: LauncherProps) {
  const [exiting, setExiting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 3,
      drift: Math.random() * 30 + 10,
    }))
  }, [])

  const handleLaunch = () => {
    setExiting(true)
    setTimeout(onLaunch, 500)
  }

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#050509]"
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Animated grid background */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="h-[200%] w-[200%] animate-grid-scroll"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />
          </div>

          {/* Radial glow effects */}
          <div className="pointer-events-none absolute top-1/3 left-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-1/3 right-1/3 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-purple-500/10 blur-[120px]" />

          {/* Floating particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="pointer-events-none absolute rounded-full bg-white/30"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
              }}
              animate={{
                opacity: [0, 0.6, 0],
                y: [0, -p.drift],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Logo icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={mounted ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl"
          >
            {/* Rotating rings */}
            <motion.div
              className="absolute h-14 w-14 rounded-full border border-cyan-500/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute h-10 w-10 rounded-full border border-purple-500/30"
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
            {/* Sparkle icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cyan-400"
            >
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
            </svg>
          </motion.div>

          {/* Title with glow */}
          <div className="relative mb-3">
            {/* Soft glow behind title */}
            <div className="pointer-events-none absolute inset-0 -inset-x-8 -inset-y-4 flex items-center justify-center">
              <div className="h-24 w-64 rounded-full bg-cyan-500/20 blur-[60px] sm:h-28 sm:w-80" />
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative font-mono text-4xl font-bold tracking-tight sm:text-5xl"
            >
              <span className="animate-glitch inline-block bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                Second Brain
              </span>
            </motion.h1>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8 max-w-md text-center font-mono text-xs tracking-[0.15em] text-slate-500 sm:text-sm"
          >
            Knowledge mesh with AI-powered storage, analysis &amp; search
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-10 flex flex-wrap justify-center gap-2"
          >
            {['3D Visualization', 'AI Chat', 'Smart Search', 'Auto-Compact'].map((pill, i) => {
              const delays = [0.6, 0.7, 0.8, 0.9]
              return (
                <motion.div
                  key={pill}
                  initial={{ opacity: 0, y: 10 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: delays[i] || 0.6 }}
                  whileHover={{ scale: 1.05 }}
                  className="inline-block rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 transition-all hover:border-cyan-500/25 hover:bg-cyan-500/[0.04] hover:text-slate-300 hover:shadow-[0_0_12px_rgba(0,243,255,0.08)]"
                >
                  {pill}
                </motion.div>
              )
            })}
          </motion.div>

          {/* Launch button with shimmer */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            onClick={handleLaunch}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group relative overflow-hidden rounded-full border border-cyan-500/30 bg-black/40 px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-slate-300 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/60 hover:text-white hover:shadow-[0_0_24px_rgba(0,243,255,0.15),inset_0_0_24px_rgba(0,243,255,0.05)]"
          >
            {/* Shimmer shine sweep */}
            <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {/* Subtle inner glow */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-b from-cyan-500/[0.06] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center gap-2">
              Launch
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </motion.button>

          {/* Version footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="absolute bottom-6 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600"
          >
            v1.0.0 // Neural Mesh Engine
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}