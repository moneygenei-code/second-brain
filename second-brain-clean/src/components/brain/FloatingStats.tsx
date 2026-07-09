'use client'

import { useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Stats } from '@/lib/types'

interface FloatingStatsProps {
  stats: Stats | null
}

function formatKnowledgeSize(totalCharacters: number): string {
  const kb = totalCharacters / 1024
  return `${kb.toFixed(1)} KB`
}

function PulsingDot() {
  return (
    <span className="relative flex h-[4px] w-[4px] shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
      <span className="relative inline-flex h-[4px] w-[4px] rounded-full bg-emerald-400" />
    </span>
  )
}

function AnimatedValue({ value, duration = 600 }: { value: number | string; duration?: number }) {
  const displayRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value))
  const isFloat = String(value).includes('.')

  const refCallback = useCallback(
    (node: HTMLSpanElement | null) => {
      displayRef.current = node
    },
    []
  )

  useEffect(() => {
    const node = displayRef.current
    if (!node) return

    const target = numericValue
    const currentText = node.textContent || ''
    const start = parseFloat(currentText) || target

    if (start === target || isNaN(target) || isNaN(start)) {
      node.textContent = String(value)
      return
    }

    cancelAnimationFrame(rafRef.current)
    const startTime = performance.now()
    const diff = target - start

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + diff * eased
      node.textContent = isFloat ? current.toFixed(1) : String(Math.round(current))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [numericValue, duration, isFloat, value])

  return <span ref={refCallback} className="min-w-[1.5ch] font-mono text-xs font-semibold tabular-nums text-slate-300">{value}</span>
}

const STAT_ACCENT_COLORS = [
  'border-l-cyan-500/60',
  'border-l-purple-500/60',
  'border-l-emerald-500/60',
  'border-l-amber-500/60',
]

function StatSegment({
  label,
  value,
  accentIndex,
  title,
}: {
  label: string
  value: string | number
  accentIndex: number
  title?: string
}) {
  return (
    <span
      title={title}
      className={`group/seg inline-flex items-center gap-1.5 border-l-[2px] pl-2 transition-colors duration-150 hover:border-opacity-100 ${STAT_ACCENT_COLORS[accentIndex] || STAT_ACCENT_COLORS[0]}`}
    >
      <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600 transition-colors group-hover/seg:text-slate-400">
        {label}
      </span>
      <AnimatedValue value={value} />
    </span>
  )
}

function Divider() {
  return <span className="text-[8px] text-slate-700 select-none">&middot;</span>
}

export default function FloatingStats({ stats }: FloatingStatsProps) {
  return (
    <div className="absolute right-4 top-4 z-10">
      <AnimatePresence mode="wait">
        {stats && (
          <motion.div
            key={stats.nodeCount}
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="group flex items-center gap-2.5 rounded-full border border-white/5 bg-black/50 px-3.5 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-colors duration-200 hover:border-white/10"
          >
            <PulsingDot />

            {/* ── Mobile: only node count ── */}
            <span className="flex items-center gap-1.5 sm:hidden">
              <span className="border-l-[2px] border-l-cyan-500/60 pl-2">
                <AnimatedValue value={stats.nodeCount} />
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
                nodes
              </span>
            </span>

            {/* ── Desktop: full stats bar ── */}
            <span className="hidden items-center gap-2 sm:inline-flex">
              <StatSegment label="nodes" value={stats.nodeCount} accentIndex={0} title={`${stats.nodeCount} knowledge nodes`} />
              <Divider />
              <StatSegment label="cats" value={stats.categories.length} accentIndex={1} title={`${stats.categories.length} categories`} />
              <Divider />
              <StatSegment label="links" value={stats.connectionCount} accentIndex={2} title={`${stats.connectionCount} connections`} />
              <Divider />
              <StatSegment label="size" value={formatKnowledgeSize(stats.totalCharacters)} accentIndex={3} title={`${stats.totalCharacters.toLocaleString()} characters total`} />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}