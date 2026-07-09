'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORY_COLORS } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

interface ConnectionManagerProps {
  nodeId: string
  nodeTitle: string
  allNodes: { id: string; title: string; category: string }[]
  connectedNodeIds: string[]
  onConnect: (toNodeId: string) => void
  onDisconnect: (connectionId: string) => void
}

export default function ConnectionManager({
  nodeId,
  nodeTitle,
  allNodes,
  connectedNodeIds,
  onConnect,
  onDisconnect,
}: ConnectionManagerProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false)
        setSearchTerm('')
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Available nodes: exclude self and already connected
  const availableNodes = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return allNodes.filter(
      (n) =>
        n.id !== nodeId &&
        !connectedNodeIds.includes(n.id) &&
        (q === '' || n.title.toLowerCase().includes(q))
    )
  }, [allNodes, nodeId, connectedNodeIds, searchTerm])

  const connectedNodes = useMemo(
    () => allNodes.filter((n) => connectedNodeIds.includes(n.id)),
    [allNodes, connectedNodeIds]
  )

  const handleDisconnect = (targetNodeId: string) => {
    if (window.confirm('Remove this connection?')) {
      onDisconnect(targetNodeId)
    }
  }

  const handleConnect = (toNodeId: string) => {
    onConnect(toNodeId)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="border-t border-white/5 pt-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
          Connections
        </span>
        <span className="font-mono text-[8px] tabular-nums text-slate-700">
          {connectedNodes.length}
        </span>
      </div>

      {/* Connected list */}
      {connectedNodes.length > 0 && (
        <ScrollArea className="mb-2 max-h-48">
          <div className="flex flex-col gap-1 pr-2">
            <AnimatePresence mode="popLayout">
              {connectedNodes.map((node) => {
                const color =
                  CATEGORY_COLORS[node.category] || CATEGORY_COLORS.general
                return (
                  <motion.div
                    key={node.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-400">
                      {node.title}
                    </span>
                    <button
                      onClick={() => handleDisconnect(node.id)}
                      className="shrink-0 rounded p-0.5 text-slate-600 transition-colors hover:bg-white/5 hover:text-rose-400"
                      title="Disconnect"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      {connectedNodes.length === 0 && (
        <span className="mb-2 block font-mono text-[9px] text-slate-700">
          No connections yet
        </span>
      )}

      {/* Add connection button / dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/10 bg-white/[0.02] px-2 py-1.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500 transition-colors hover:border-white/20 hover:bg-white/[0.04] hover:text-slate-400"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Add Connection
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#0c0c14] shadow-2xl"
            >
              {/* Search input */}
              <div className="border-b border-white/5 p-2">
                <Input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search nodes..."
                  className="h-6 border-white/5 bg-white/[0.03] font-mono text-[10px] text-slate-300 placeholder:text-slate-600 focus-visible:ring-cyan-500/20"
                />
              </div>

              {/* Node list */}
              <ScrollArea className="max-h-48">
                <div className="p-1">
                  {availableNodes.length === 0 && (
                    <span className="block px-2 py-3 text-center font-mono text-[9px] text-slate-700">
                      No available nodes
                    </span>
                  )}
                  {availableNodes.map((node) => {
                    const color =
                      CATEGORY_COLORS[node.category] || CATEGORY_COLORS.general
                    return (
                      <button
                        key={node.id}
                        onClick={() => handleConnect(node.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/5"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-400">
                          {node.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}