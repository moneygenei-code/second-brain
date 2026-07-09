'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORY_COLORS } from '@/lib/types'

interface TimelineNode {
  id: string
  title: string
  category: string
  createdAt: string
}

interface NodeTimelineProps {
  nodes: TimelineNode[]
  selectedNodeId: string | null
  onNodeSelect: (id: string) => void
}

interface DayGroup {
  label: string
  dateKey: string
  nodes: TimelineNode[]
}

function getDayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTooltipDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Tooltip({
  node,
  x,
  visible,
}: {
  node: TimelineNode | null
  x: number
  visible: boolean
}) {
  if (!node || !visible) return null
  const color = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.general

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap"
    >
      <div className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-black/80 px-2.5 py-1.5 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="max-w-[200px] truncate font-mono text-[10px] font-medium text-slate-200">
            {node.title}
          </span>
        </div>
        <span className="font-mono text-[8px] text-slate-500">
          {formatTooltipDate(node.createdAt)}
        </span>
      </div>
    </motion.div>
  )
}

export default function NodeTimeline({
  nodes,
  selectedNodeId,
  onNodeSelect,
}: NodeTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hoveredNode, setHoveredNode] = useState<TimelineNode | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Sort nodes by createdAt ascending
  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [nodes]
  )

  // Group by day (or week if > 20 nodes)
  const shouldGroupByWeek = sortedNodes.length > 20

  const groups = useMemo(() => {
    const map = new Map<string, DayGroup>()

    for (const node of sortedNodes) {
      const dateKey = getDayKey(node.createdAt)
      const groupKey = shouldGroupByWeek ? dateKey.slice(0, 8) + '01' : dateKey

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          label: shouldGroupByWeek
            ? new Date(groupKey + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                year: shouldGroupByWeek ? 'numeric' : undefined,
              })
            : formatDayLabel(dateKey),
          dateKey: groupKey,
          nodes: [],
        })
      }
      map.get(groupKey)!.nodes.push(node)
    }

    return Array.from(map.values())
  }, [sortedNodes, shouldGroupByWeek])

  if (sortedNodes.length === 0) return null

  // Compute dot size for density (more nodes in a group = bigger dots)
  const maxGroupSize = Math.max(...groups.map((g) => g.nodes.length), 1)

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-20 mx-auto w-full max-w-[90vw] sm:max-w-[700px]"
        >
          <div className="rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2 backdrop-blur-2xl sm:px-4">
            {/* Label */}
            <div className="mb-1.5 flex items-center gap-2">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-500"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                Timeline
              </span>
              <span className="font-mono text-[7px] text-slate-600">
                {sortedNodes.length} node{sortedNodes.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Scrollable timeline */}
            <div
              ref={scrollRef}
              className="relative flex items-center gap-0 overflow-x-auto scrollbar-thin pb-1"
              style={{ scrollbarWidth: 'thin' }}
            >
              {/* Central line */}
              <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-white/[0.06]" />

              {groups.map((group, gi) => {
                const density = group.nodes.length / maxGroupSize
                const barHeight = 2 + density * 2 // 2-4px thickness for density

                return (
                  <div key={group.dateKey} className="flex shrink-0 items-center">
                    {/* Group label */}
                    <div className="mr-1 flex w-12 shrink-0 items-end sm:w-14">
                      <span className="font-mono text-[7px] leading-none text-slate-600">
                        {group.label}
                      </span>
                    </div>

                    {/* Density bar segment */}
                    <div className="relative flex items-center">
                      {/* Thick bar behind dots */}
                      <div
                        className="absolute top-1/2 left-0 right-0 -translate-y-1/2 rounded-full bg-white/[0.04]"
                        style={{ height: `${barHeight}px` }}
                      />

                      {/* Dots */}
                      <div className="relative flex items-center gap-1.5">
                        {group.nodes.map((node, ni) => {
                          const color =
                            CATEGORY_COLORS[node.category] || CATEGORY_COLORS.general
                          const isSelected = node.id === selectedNodeId
                          const dotSize = isSelected ? 8 : 5 + density * 3
                          const globalIndex = gi * 100 + ni

                          return (
                            <motion.button
                              key={node.id}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                delay: globalIndex * 0.03,
                                duration: 0.3,
                                ease: 'easeOut',
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                onNodeSelect(node.id)
                              }}
                              onMouseEnter={(e) => {
                                setHoveredNode(node)
                                const rect = e.currentTarget.getBoundingClientRect()
                                setHoverX(rect.left + rect.width / 2)
                              }}
                              onMouseLeave={() => setHoveredNode(null)}
                              className={`relative z-10 shrink-0 rounded-full transition-shadow ${
                                isSelected
                                  ? 'shadow-[0_0_8px_var(--dot-color)]'
                                  : 'hover:shadow-[0_0_6px_var(--dot-color)]'
                              }`}
                              style={
                                {
                                  '--dot-color': color,
                                  width: dotSize,
                                  height: dotSize,
                                  backgroundColor: color,
                                  opacity: isSelected ? 1 : 0.75,
                                } as React.CSSProperties
                              }
                            >
                              {hoveredNode?.id === node.id && (
                                <Tooltip
                                  node={hoveredNode}
                                  x={hoverX}
                                  visible={true}
                                />
                              )}
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Spacer between groups */}
                    {gi < groups.length - 1 && (
                      <div className="mx-2 w-px h-3 bg-white/[0.04]" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}