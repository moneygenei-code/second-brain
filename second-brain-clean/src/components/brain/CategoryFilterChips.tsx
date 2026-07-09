'use client'

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Star } from 'lucide-react'
import { CATEGORY_COLORS } from '@/lib/types'

interface CategoryFilterChipsProps {
  categories: { name: string; count: number }[]
  activeCategories: Set<string>
  onToggleCategory: (category: string) => void
  onClearAll: () => void
  bookmarkedCount?: number
  isBookmarkedActive?: boolean
  onToggleBookmarked?: () => void
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function CategoryFilterChips({
  categories,
  activeCategories,
  onToggleCategory,
  onClearAll,
  bookmarkedCount = 0,
  isBookmarkedActive = false,
  onToggleBookmarked,
}: CategoryFilterChipsProps) {
  if (categories.length === 0) return null

  const allActive = activeCategories.size === 0

  return (
    <div className="absolute bottom-[4.5rem] left-1/2 z-20 w-full max-w-[90vw] -translate-x-1/2 sm:max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex items-center gap-1 overflow-x-auto px-2 pb-1 scrollbar-thin sm:justify-center sm:overflow-visible sm:px-0"
      >
        <LayoutGroup>
          {/* "All" chip */}
          <motion.button
            layout
            onClick={onClearAll}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className={`group relative flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all duration-200 sm:shrink ${
              allActive && !isBookmarkedActive
                ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.1)]'
                : 'border-white/5 bg-black/40 text-slate-500 hover:border-white/10 hover:text-slate-300'
            }`}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80" />
            <span className="font-mono text-[8px] uppercase tracking-[0.2em]">
              All
            </span>
            <span
              className={`font-mono text-[7px] tabular-nums ${
                allActive && !isBookmarkedActive ? 'text-cyan-500/70' : 'text-slate-600'
              }`}
            >
              {categories.reduce((sum, c) => sum + c.count, 0)}
            </span>
          </motion.button>

          {/* "Bookmarked" chip */}
          {onToggleBookmarked && bookmarkedCount > 0 && (
            <motion.button
              layout
              onClick={onToggleBookmarked}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className={`group relative flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all duration-200 sm:shrink ${
                isBookmarkedActive
                  ? 'border-amber-500/30 bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                  : 'border-white/5 bg-black/40 text-slate-500 hover:border-white/10 hover:text-slate-300'
              }`}
            >
              <Star className={`h-2.5 w-2.5 shrink-0 ${isBookmarkedActive ? 'fill-amber-400' : ''}`} />
              <span className="font-mono text-[8px] uppercase tracking-[0.2em]">
                Bookmarked
              </span>
              <span
                className={`font-mono text-[7px] tabular-nums ${
                  isBookmarkedActive ? 'text-amber-500/70' : 'text-slate-600'
                }`}
              >
                {bookmarkedCount}
              </span>
            </motion.button>
          )}

          <AnimatePresence mode="popLayout">
            {categories.map((cat) => {
              const isActive = activeCategories.has(cat.name)
              const color = CATEGORY_COLORS[cat.name] || CATEGORY_COLORS.general

              return (
                <motion.button
                  key={cat.name}
                  layout
                  onClick={() => onToggleCategory(cat.name)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  className={`group relative flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all duration-200 sm:shrink ${
                    isActive
                      ? 'shadow-[0_0_12px_rgba(0,0,0,0.2)]'
                      : 'border-white/5 bg-black/40 text-slate-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-300'
                  }`}
                  style={
                    isActive
                      ? {
                          borderColor: hexToRgba(color, 0.4),
                          backgroundColor: hexToRgba(color, 0.15),
                          color: color,
                          boxShadow: `0 0 12px ${hexToRgba(color, 0.1)}`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full transition-transform duration-200"
                    style={{
                      backgroundColor: color,
                      opacity: isActive ? 1 : 0.4,
                      boxShadow: isActive ? `0 0 6px ${hexToRgba(color, 0.6)}` : 'none',
                    }}
                  />
                  <span className="font-mono text-[8px] uppercase tracking-[0.2em]">
                    {cat.name}
                  </span>
                  <span
                    className={`font-mono text-[7px] tabular-nums transition-opacity duration-200 ${
                      isActive ? 'opacity-60' : 'text-slate-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </LayoutGroup>
      </motion.div>
    </div>
  )
}