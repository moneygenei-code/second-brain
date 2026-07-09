'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Circle, Hash } from 'lucide-react'
import { CATEGORY_COLORS } from '@/lib/types'

interface SceneLegendProps {
  categories: { name: string; count: number }[]
  totalNodes: number
  activeCategories: Set<string>
  onToggleCategory: (category: string) => void
  onClearAll: () => void
}

export default function SceneLegend({
  categories,
  totalNodes,
  activeCategories,
  onToggleCategory,
  onClearAll,
}: SceneLegendProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Sorted by count desc; only categories with at least 1 node
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => b.count - a.count),
    [categories]
  )

  const visibleCount = useMemo(() => {
    if (activeCategories.size === 0) return totalNodes
    return categories
      .filter((c) => activeCategories.has(c.name))
      .reduce((sum, c) => sum + c.count, 0)
  }, [activeCategories, categories, totalNodes])

  const isFiltered = activeCategories.size > 0

  return (
    <div className="absolute left-4 top-16 z-10 w-52">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="overflow-hidden rounded-xl border border-white/[0.05] bg-black/40 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      >
        {/* Header */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-between gap-2 border-b border-white/[0.04] px-3.5 py-2.5 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2">
            <Circle className="h-3 w-3 text-cyan-400/70" fill="currentColor" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">
              Legend
            </span>
          </div>
          {collapsed ? (
            <ChevronDown className="h-3 w-3 text-slate-600" />
          ) : (
            <ChevronUp className="h-3 w-3 text-slate-600" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="px-3.5 py-3">
                {/* Category rows */}
                <div className="space-y-1">
                  {sortedCategories.map((cat) => {
                    const color = CATEGORY_COLORS[cat.name] ?? '#94a3b8'
                    const isActive = activeCategories.has(cat.name)
                    const dimmed = isFiltered && !isActive
                    const pct = totalNodes > 0 ? (cat.count / totalNodes) * 100 : 0
                    return (
                      <button
                        key={cat.name}
                        onClick={() => onToggleCategory(cat.name)}
                        className="group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-white/[0.03]"
                        title={`${cat.count} node${cat.count !== 1 ? 's' : ''} · click to ${isActive ? 'hide' : 'show'}`}
                      >
                        {/* Color swatch */}
                        <span
                          className="relative h-2.5 w-2.5 shrink-0 rounded-full transition-all"
                          style={{
                            backgroundColor: color,
                            boxShadow: dimmed ? 'none' : `0 0 8px ${color}66`,
                            opacity: dimmed ? 0.3 : 1,
                          }}
                        >
                          {isActive && (
                            <motion.span
                              layoutId={`legend-glow-${cat.name}`}
                              className="absolute inset-0 rounded-full"
                              style={{ boxShadow: `0 0 10px ${color}` }}
                            />
                          )}
                        </span>
                        {/* Label */}
                        <span
                          className={`flex-1 text-left font-mono text-[10px] capitalize transition-colors ${
                            dimmed ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          {cat.name}
                        </span>
                        {/* Count + bar */}
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-8 overflow-hidden rounded-full bg-white/[0.04]">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: color,
                                opacity: dimmed ? 0.2 : 0.8,
                              }}
                            />
                          </div>
                          <span
                            className={`w-4 text-right font-mono text-[9px] tabular-nums transition-colors ${
                              dimmed ? 'text-slate-700' : 'text-slate-400'
                            }`}
                          >
                            {cat.count}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Footer: visible count + clear */}
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3 text-slate-600" />
                    <span className="font-mono text-[9px] text-slate-500">
                      <span className="text-slate-300 tabular-nums">{visibleCount}</span>
                      <span className="text-slate-600"> / {totalNodes} visible</span>
                    </span>
                  </div>
                  {isFiltered && (
                    <button
                      onClick={onClearAll}
                      className="rounded font-mono text-[8px] uppercase tracking-[0.15em] text-cyan-400/70 transition-colors hover:text-cyan-300"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
