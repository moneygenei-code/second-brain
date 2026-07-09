'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, AlertTriangle, Loader2, Check, X, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { CATEGORY_COLORS, VALID_CATEGORIES } from '@/lib/types'

interface CompactDialogProps {
  isOpen: boolean
  onClose: () => void
  categories: { name: string; count: number }[]
  totalNodes: number
  onCompacted: (removedCount: number, category: string) => void
}

export default function CompactDialog({
  isOpen,
  onClose,
  categories,
  totalNodes,
  onCompacted,
}: CompactDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [confirmStep, setConfirmStep] = useState(false)
  const [isCompacting, setIsCompacting] = useState(false)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('all')
      setConfirmStep(false)
      setIsCompacting(false)
    }
  }, [isOpen])

  // Close on Escape (when not compacting)
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCompacting) {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, isCompacting, onClose])

  // Build category list with counts; only include categories that have nodes
  const categoryOptions = useMemo(() => {
    const opts: { id: string; label: string; count: number; color: string }[] = []
    // "All" option
    opts.push({
      id: 'all',
      label: 'All Categories',
      count: totalNodes,
      color: '#00f3ff',
    })
    // Per-category options, sorted by count desc
    const sorted = [...categories].sort((a, b) => b.count - a.count)
    for (const c of sorted) {
      const color =
        CATEGORY_COLORS[c.name] ??
        (VALID_CATEGORIES as readonly string[]).includes(c.name)
          ? CATEGORY_COLORS[c.name]
          : '#94a3b8'
      opts.push({
        id: c.name,
        label: c.name.charAt(0).toUpperCase() + c.name.slice(1),
        count: c.count,
        color: color || '#94a3b8',
      })
    }
    return opts
  }, [categories, totalNodes])

  // Preview count for the selected option
  const previewCount = useMemo(() => {
    if (selectedCategory === 'all') return totalNodes
    return categories.find((c) => c.name === selectedCategory)?.count ?? 0
  }, [selectedCategory, categories, totalNodes])

  const canCompact = previewCount >= 2 && !isCompacting

  const handleCompact = async () => {
    if (!canCompact) return
    setIsCompacting(true)
    try {
      const res = await fetch('/api/nodes/compact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Compact failed')
      }
      toast.success(
        `Compacted ${data.removedCount} node${data.removedCount !== 1 ? 's' : ''} into 1`
      )
      onCompacted(data.removedCount, selectedCategory)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Compact failed')
      setConfirmStep(false)
    } finally {
      setIsCompacting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0a0f]/95 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            {/* Grid pattern overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              disabled={isCompacting}
              className="absolute top-3.5 right-3.5 z-10 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 disabled:opacity-40"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
                  <Layers className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-semibold tracking-[0.1em] uppercase text-slate-200">
                    Compact Nodes
                  </h2>
                  <p className="mt-0.5 font-mono text-[9px] text-slate-500 leading-relaxed">
                    Merge multiple nodes into a single consolidated knowledge node
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="relative px-6 py-5">
              {!confirmStep ? (
                <>
                  {/* Step 1: Category selection */}
                  <div className="mb-4">
                    <label className="mb-2.5 block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
                      Select scope to compact
                    </label>
                    <div className="grid max-h-[240px] gap-2 overflow-y-auto pr-1 scrollbar-thin">
                      {categoryOptions.map((opt) => {
                        const isSelected = selectedCategory === opt.id
                        const disabled = opt.count < 2
                        return (
                          <button
                            key={opt.id}
                            onClick={() => !disabled && setSelectedCategory(opt.id)}
                            disabled={disabled}
                            className={`group flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-150 ${
                              isSelected
                                ? 'border-amber-500/40 bg-amber-500/[0.06] shadow-[0_0_16px_rgba(255,183,0,0.06)]'
                                : disabled
                                  ? 'cursor-not-allowed border-white/[0.03] bg-white/[0.01] opacity-40'
                                  : 'border-white/[0.04] bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03]'
                            }`}
                          >
                            {/* Color dot */}
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: opt.color,
                                boxShadow: `0 0 8px ${opt.color}66`,
                              }}
                            />
                            {/* Label */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-slate-200 capitalize">
                                  {opt.label}
                                </span>
                                {disabled && (
                                  <span className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                                    (needs 2+)
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Count badge */}
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] tabular-nums ${
                                isSelected
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-white/[0.04] text-slate-400'
                              }`}
                            >
                              {opt.count} {opt.count === 1 ? 'node' : 'nodes'}
                            </span>
                            {/* Selected check */}
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Preview summary */}
                  <div className="mb-5 flex items-center justify-between rounded-lg border border-white/[0.04] bg-black/30 px-4 py-3">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
                      Will compact
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-amber-300 tabular-nums">
                        {previewCount}
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">
                        {previewCount === 1 ? 'node' : 'nodes'}
                      </span>
                      <ArrowRight className="h-3 w-3 text-slate-600" />
                      <span className="font-mono text-sm font-semibold text-emerald-300">
                        1
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">merged</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      onClick={onClose}
                      disabled={isCompacting}
                      className="rounded-lg border border-white/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setConfirmStep(true)}
                      disabled={!canCompact}
                      className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-300 transition-all hover:bg-amber-500/20 hover:shadow-[0_0_16px_rgba(255,183,0,0.1)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continue
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Step 2: Destructive confirmation */}
                  <div className="mb-5">
                    <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.05] p-4">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                      <div>
                        <p className="font-mono text-[11px] font-semibold text-rose-300">
                          This action is irreversible
                        </p>
                        <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-slate-400">
                          {previewCount} node{previewCount !== 1 ? 's' : ''} will be{' '}
                          <span className="text-rose-300">permanently deleted</span> and their
                          content merged into a single new node tagged{' '}
                          <span className="text-cyan-300">&ldquo;compacted&rdquo;</span>. All
                          connections to the original nodes will be lost.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/[0.04] bg-black/30 p-4">
                      <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
                        Summary
                      </p>
                      <div className="space-y-2 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Scope</span>
                          <span className="text-slate-200 capitalize">
                            {selectedCategory === 'all'
                              ? 'All categories'
                              : selectedCategory}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Nodes removed</span>
                          <span className="text-rose-300 tabular-nums">{previewCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Merged node created</span>
                          <span className="text-emerald-300">1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tags preserved</span>
                          <span className="text-cyan-300">Yes (union of all)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2.5">
                    <button
                      onClick={() => setConfirmStep(false)}
                      disabled={isCompacting}
                      className="rounded-lg border border-white/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:opacity-40"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleCompact}
                      disabled={isCompacting}
                      className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/15 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-rose-200 transition-all hover:bg-rose-500/25 hover:shadow-[0_0_20px_rgba(255,60,100,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCompacting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Compacting…
                        </>
                      ) : (
                        <>
                          <Layers className="h-3.5 w-3.5" />
                          Compact {previewCount} Nodes
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
