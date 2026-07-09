'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Database, Tags } from 'lucide-react'
import { CATEGORY_COLORS } from '@/lib/types'

interface ConnectionEntry {
  from: string
  to: string
  strength: number
  source: string
  label?: string
}

interface ConnectionStrengthPanelProps {
  selectedNodeId: string | null
  connections: ConnectionEntry[]
  allNodes: { id: string; title: string; category: string }[]
  onClose: () => void
  onNavigateToNode?: (id: string) => void
}

function StrengthBar({ strength, delay }: { strength: number; delay: number }) {
  const [width, setWidth] = useState(0)
  const maxStrength = 1

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(Math.min((strength / maxStrength) * 100, 100))
    }, delay)
    return () => clearTimeout(timer)
  }, [strength, delay])

  // Color based on strength
  const color =
    strength >= 0.8
      ? 'bg-cyan-400'
      : strength >= 0.5
        ? 'bg-purple-400'
        : 'bg-slate-400'

  return (
    <div className="h-1 w-full rounded-full bg-white/5">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: delay / 1000 }}
      />
    </div>
  )
}

/** Mini SVG graph: center node with connected nodes in a circle, arrows, source color coding */
function MiniGraph({
  selectedNode,
  connections,
  allNodes,
  onNavigateToNode,
}: {
  selectedNode: { id: string; title: string; category: string }
  connections: ConnectionEntry[]
  allNodes: { id: string; title: string; category: string }[]
  onNavigateToNode?: (id: string) => void
}) {
  const cx = 100
  const cy = 100
  const radius = 72
  const nodeRadius = 8

  const peers = useMemo(() => {
    return connections
      .map((conn) => {
        const peerId = conn.from === selectedNode.id ? conn.to : conn.from
        const peer = allNodes.find((n) => n.id === peerId)
        if (!peer) return null
        return {
          ...peer,
          strength: conn.strength,
          source: conn.source,
          direction: conn.from === selectedNode.id ? 'outgoing' as const : 'incoming' as const,
        }
      })
      .filter(Boolean) as Array<{
        id: string; title: string; category: string; strength: number; source: string; direction: 'outgoing' | 'incoming'
      }>
  }, [connections, selectedNode.id, allNodes])

  // Position peers in a circle
  const positionedPeers = useMemo(() => {
    if (peers.length === 0) return []
    const angleStep = (2 * Math.PI) / peers.length
    const startAngle = -Math.PI / 2 // start from top

    return peers.map((peer, i) => {
      const angle = startAngle + i * angleStep
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle)
      return { ...peer, x, y, angle }
    })
  }, [peers])

  if (positionedPeers.length === 0) return null

  // Arrowhead marker
  const arrowSize = 5

  return (
    <div className="relative mb-2 border-b border-white/5 pb-2">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-slate-600">
          Graph
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
            <span className="font-mono text-[7px] text-slate-600">DB</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span className="font-mono text-[7px] text-slate-600">TAG</span>
          </div>
        </div>
      </div>
      <svg
        viewBox="0 0 200 200"
        className="w-full"
        style={{ maxHeight: '180px' }}
      >
        <defs>
          {/* Arrow for DB connections (cyan) */}
          <marker
            id="arrow-db"
            markerWidth={arrowSize}
            markerHeight={arrowSize}
            refX={arrowSize - 1}
            refY={arrowSize / 2}
            orient="auto-start-reverse"
          >
            <polygon
              points={`0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}`}
              fill="rgba(0,212,255,0.6)"
            />
          </marker>
          {/* Arrow for tag connections (purple) */}
          <marker
            id="arrow-tag"
            markerWidth={arrowSize}
            markerHeight={arrowSize}
            refX={arrowSize - 1}
            refY={arrowSize / 2}
            orient="auto-start-reverse"
          >
            <polygon
              points={`0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}`}
              fill="rgba(157,78,221,0.6)"
            />
          </marker>
        </defs>

        {/* Connection lines with arrows */}
        {positionedPeers.map((peer) => {
          const isDb = peer.source === 'db'
          const strokeColor = isDb ? 'rgba(0,212,255,0.3)' : 'rgba(157,78,221,0.3)'
          const lineOpacity = 0.3 + peer.strength * 0.5
          const markerId = isDb ? 'arrow-db' : 'arrow-tag'

          // Calculate direction: arrow points from selected to peer if outgoing, reversed if incoming
          const dx = peer.x - cx
          const dy = peer.y - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const nx = dx / dist
          const ny = dy / dist

          // Start and end points offset from centers
          const sx = cx + nx * nodeRadius
          const sy = cy + ny * nodeRadius
          const ex = peer.x - nx * (nodeRadius + 2)
          const ey = peer.y - ny * (nodeRadius + 2)

          return (
            <line
              key={peer.id}
              x1={sx}
              y1={sy}
              x2={ex}
              y2={ey}
              stroke={strokeColor}
              strokeWidth={1 + peer.strength * 1.5}
              strokeOpacity={lineOpacity}
              markerEnd={`url(#${markerId})`}
            />
          )
        })}

        {/* Center node (selected) */}
        <circle
          cx={cx}
          cy={cy}
          r={nodeRadius + 2}
          fill="rgba(0,212,255,0.15)"
          stroke="rgba(0,212,255,0.6)"
          strokeWidth={1.5}
        />
        <circle
          cx={cx}
          cy={cy}
          r={nodeRadius}
          fill={CATEGORY_COLORS[selectedNode.category] || CATEGORY_COLORS.general}
          opacity={0.9}
        />

        {/* Peer nodes */}
        {positionedPeers.map((peer) => {
          const peerColor = CATEGORY_COLORS[peer.category] || CATEGORY_COLORS.general
          const isDb = peer.source === 'db'
          const ringColor = isDb ? 'rgba(0,212,255,0.4)' : 'rgba(157,78,221,0.4)'

          return (
            <g
              key={peer.id}
              onClick={() => onNavigateToNode?.(peer.id)}
              className="cursor-pointer"
              role="button"
            >
              {/* Outer ring (source indicator) */}
              <circle
                cx={peer.x}
                cy={peer.y}
                r={nodeRadius + 1.5}
                fill="none"
                stroke={ringColor}
                strokeWidth={1}
                opacity={0.6}
              />
              {/* Node dot */}
              <circle
                cx={peer.x}
                cy={peer.y}
                r={nodeRadius - 1}
                fill={peerColor}
                opacity={0.8}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function ConnectionStrengthPanel({
  selectedNodeId,
  connections,
  allNodes,
  onClose,
  onNavigateToNode,
}: ConnectionStrengthPanelProps) {
  if (!selectedNodeId) return null

  // Filter connections for the selected node
  const nodeConnections = connections.filter(
    (c) => c.from === selectedNodeId || c.to === selectedNodeId
  )

  if (nodeConnections.length === 0) return null

  // Sort by strength descending
  const sorted = [...nodeConnections].sort((a, b) => b.strength - a.strength)

  const selectedNodeInfo = allNodes.find((n) => n.id === selectedNodeId)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="fixed top-20 left-4 z-40 flex w-[280px] sm:w-[320px] flex-col rounded-xl border border-white/[0.08] bg-black/60 backdrop-blur-2xl shadow-2xl shadow-black/40"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">
              Connection Strength
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[7px] tabular-nums text-slate-500">
              {sorted.length}
            </span>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mini Graph */}
        {selectedNodeInfo && (
          <MiniGraph
            selectedNode={selectedNodeInfo}
            connections={nodeConnections}
            allNodes={allNodes}
            onNavigateToNode={onNavigateToNode}
          />
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 border-b border-white/5 px-3 py-1.5">
          <div className="flex items-center gap-1">
            <Database className="h-2.5 w-2.5 text-cyan-500" />
            <span className="font-mono text-[7px] text-slate-500">DB</span>
          </div>
          <div className="flex items-center gap-1">
            <Tags className="h-2.5 w-2.5 text-purple-500" />
            <span className="font-mono text-[7px] text-slate-500">TAG</span>
          </div>
        </div>

        {/* Connections List */}
        <div className="max-h-[280px] overflow-y-auto p-2 scrollbar-thin">
          {sorted.map((conn, i) => {
            const peerId = conn.from === selectedNodeId ? conn.to : conn.from
            const peer = allNodes.find((n) => n.id === peerId)
            if (!peer) return null
            const catColor = CATEGORY_COLORS[peer.category] || CATEGORY_COLORS.general
            const isDb = conn.source === 'db'

            return (
              <motion.div
                key={`${conn.from}-${conn.to}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                onClick={() => onNavigateToNode?.(peer.id)}
                className="mb-1.5 cursor-pointer rounded-lg border border-white/[0.04] bg-white/[0.02] px-2.5 py-2 transition-colors hover:border-white/[0.08] hover:bg-white/[0.04]"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: catColor }}
                    />
                    <span className="truncate font-mono text-[10px] text-slate-300">
                      {peer.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isDb ? (
                      <Database className="h-2.5 w-2.5 text-cyan-500/60" />
                    ) : (
                      <Tags className="h-2.5 w-2.5 text-purple-500/60" />
                    )}
                    <span className="font-mono text-[8px] tabular-nums text-slate-500">
                      {(conn.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <StrengthBar strength={conn.strength} delay={i * 80 + 200} />
                {conn.label && (
                  <span className="mt-1 block truncate font-mono text-[7px] text-slate-600">
                    {conn.label}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}