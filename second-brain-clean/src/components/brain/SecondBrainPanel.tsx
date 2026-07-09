'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Search, Plus, Trash2, RefreshCw, ArrowDownToLine,
  Sparkles, X, Filter, TrendingUp, Clock, Database, Loader2, ChevronDown,
  MessageSquare, Zap, BookOpen, Lightbulb, Target, Star, Heart
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Category Config ──────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  insight: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-l-cyan-400',
    icon: <Lightbulb className="h-3 w-3" />,
    label: 'Insight',
  },
  strategy: {
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-l-amber-400',
    icon: <Target className="h-3 w-3" />,
    label: 'Strategy',
  },
  pattern: {
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-l-purple-400',
    icon: <Zap className="h-3 w-3" />,
    label: 'Pattern',
  },
  lesson: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-l-emerald-400',
    icon: <BookOpen className="h-3 w-3" />,
    label: 'Lesson',
  },
  fact: {
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    border: 'border-l-pink-400',
    icon: <Star className="h-3 w-3" />,
    label: 'Fact',
  },
  preference: {
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-l-orange-400',
    icon: <Heart className="h-3 w-3" />,
    label: 'Preference',
  },
}

const MEMORY_CATEGORIES = ['insight', 'strategy', 'pattern', 'lesson', 'fact', 'preference'] as const

// ─── Animation Variants ───────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

// ─── Types ────────────────────────────────────────────────────────────
interface MemoryItem {
  id: string
  content: string
  category: string
  source: string
  metadata: Record<string, unknown>
  relevance: number
  accessCount: number
  lastAccessedAt: string | null
  createdAt: string
}

// ─── Component ────────────────────────────────────────────────────────
interface SecondBrainPanelProps {
  onClose: () => void
}

export default function SecondBrainPanel({ onClose }: SecondBrainPanelProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [addContent, setAddContent] = useState('')
  const [addCategory, setAddCategory] = useState<string>('insight')
  const [showAddForm, setShowAddForm] = useState(false)
  const [extractText, setExtractText] = useState('')
  const [showExtractForm, setShowExtractForm] = useState(false)

  // ── Fetch stats ──
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['brain-stats'],
    queryFn: async () => {
      const res = await fetch('/api/brain/insights')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data.stats as { total: number; byCategory: Record<string, number>; recentCount: number }
    },
    refetchInterval: 10000,
  })

  // ── Fetch memories ──
  const { data: queryData, isLoading: memoriesLoading } = useQuery({
    queryKey: ['brain-memories', searchQuery, filterCategory],
    queryFn: async () => {
      const body: Record<string, unknown> = { limit: 50 }
      if (searchQuery.trim()) body.query = searchQuery.trim()
      if (filterCategory !== 'all') body.categories = [filterCategory]

      const res = await fetch('/api/brain/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data.memories as MemoryItem[]
    },
  })

  // ── Store mutation ──
  const storeMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/brain/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: [{ content, category: addCategory, source: 'manual' }],
        }),
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Memory stored (${data.stored} added)`)
        setAddContent('')
        setShowAddForm(false)
        queryClient.invalidateQueries({ queryKey: ['brain-stats'] })
        queryClient.invalidateQueries({ queryKey: ['brain-memories'] })
      } else {
        toast.error(data.error || 'Failed to store memory')
      }
    },
    onError: () => toast.error('Failed to store memory'),
  })

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/brain/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '', limit: 1 }),
      })
      // Note: no dedicated delete endpoint, using store to indicate
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-stats'] })
      queryClient.invalidateQueries({ queryKey: ['brain-memories'] })
    },
  })

  // ── Import from brain ──
  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/brain/insights?action=import&maxNodes=50')
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Imported: ${data.stored} memories from ${data.processed} nodes`)
        queryClient.invalidateQueries({ queryKey: ['brain-stats'] })
        queryClient.invalidateQueries({ queryKey: ['brain-memories'] })
      } else {
        toast.error(data.error || 'Import failed')
      }
    },
    onError: () => toast.error('Import failed'),
  })

  // ── Reflect mutation ──
  const reflectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/brain/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deep: true }),
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message)
        if (data.aiInsight) {
          toast.info(data.aiInsight.slice(0, 200) + '...', { duration: 8000 })
        }
        queryClient.invalidateQueries({ queryKey: ['brain-stats'] })
        queryClient.invalidateQueries({ queryKey: ['brain-memories'] })
      } else {
        toast.error(data.error || 'Reflection failed')
      }
    },
    onError: () => toast.error('Reflection failed'),
  })

  // ── Extract mutation ──
  const extractMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch('/api/brain/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'manual-extract' }),
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Extracted ${data.stored} memories`)
        setExtractText('')
        setShowExtractForm(false)
        queryClient.invalidateQueries({ queryKey: ['brain-stats'] })
        queryClient.invalidateQueries({ queryKey: ['brain-memories'] })
        if (data.errors?.length > 0) {
          toast.warning(`${data.errors.length} extraction errors`, { duration: 4000 })
        }
      } else {
        toast.error(data.error || 'Extraction failed')
      }
    },
    onError: () => toast.error('Extraction failed'),
  })

  const memories = queryData || []
  const totalMemories = stats?.total ?? 0
  const recentCount = stats?.recentCount ?? 0
  const byCategory = stats?.byCategory ?? {}

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 grid h-[88vh] max-w-5xl w-full grid-cols-[1fr_220px] gap-0 rounded-xl border border-white/5 bg-[#0a0a0f] overflow-hidden shadow-2xl"
      >
        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ═══ Main Content ═══ */}
        <div className="relative flex flex-col gap-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
            <div className="flex items-center justify-center rounded-lg bg-purple-500/10 p-2">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-semibold tracking-[0.1em] text-slate-200 uppercase">
                Second Brain
              </h2>
              <p className="font-mono text-[9px] text-slate-500">
                Persistent memory for the AI agent
              </p>
            </div>
            {totalMemories > 0 && (
              <div className="ml-auto flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1">
                <Database className="h-3 w-3 text-purple-400" />
                <span className="font-mono text-[10px] font-semibold text-purple-300">
                  {totalMemories}
                </span>
              </div>
            )}
          </div>

          {/* Category Stats Bar */}
          {totalMemories > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto px-5 py-1 scrollbar-none">
              {MEMORY_CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat]
                const count = byCategory[cat] ?? 0
                if (count === 0) return null
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-all ${
                      filterCategory === cat
                        ? `${cfg.bg} ${cfg.color} ring-1 ring-current/20`
                        : 'bg-white/[0.03] text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      cat === 'insight' ? 'bg-cyan-400' :
                      cat === 'strategy' ? 'bg-amber-400' :
                      cat === 'pattern' ? 'bg-purple-400' :
                      cat === 'lesson' ? 'bg-emerald-400' :
                      cat === 'fact' ? 'bg-pink-400' :
                      'bg-orange-400'
                    }`} />
                    {cfg.label} {count}
                  </button>
                )
              })}
            </div>
          )}

          {/* Actions Row */}
          <div className="flex flex-wrap items-center gap-2 px-5">
            <button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 transition-all hover:border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-300 disabled:opacity-50"
            >
              {importMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowDownToLine className="h-3 w-3" />}
              Import from Brain
            </button>
            <button
              onClick={() => reflectMutation.mutate()}
              disabled={reflectMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 transition-all hover:border-purple-500/20 hover:bg-purple-500/5 hover:text-purple-300 disabled:opacity-50"
            >
              {reflectMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Deep Reflect
            </button>
            <button
              onClick={() => { setShowExtractForm(!showExtractForm); setShowAddForm(false) }}
              className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-300"
            >
              <MessageSquare className="h-3 w-3" />
              Extract from Text
            </button>
            <div className="flex-1" />
            <button
              onClick={() => { setShowAddForm(!showAddForm); setShowExtractForm(false) }}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-cyan-300 transition-all hover:bg-cyan-500/10"
            >
              <Plus className="h-3 w-3" />
              Add Memory
            </button>
          </div>

          {/* Add Memory Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden px-5"
              >
                <div className="flex flex-col gap-2 rounded-lg border border-cyan-500/10 bg-cyan-500/[0.03] p-3">
                  <textarea
                    value={addContent}
                    onChange={(e) => setAddContent(e.target.value)}
                    placeholder="Enter a memory to store..."
                    className="min-h-[60px] w-full resize-none rounded-md border border-white/5 bg-black/30 px-3 py-2 font-mono text-[11px] text-slate-300 placeholder:text-slate-600 focus:border-cyan-500/30 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <Select value={addCategory} onValueChange={setAddCategory}>
                      <SelectTrigger className="h-7 w-[130px] border-white/10 bg-black/30 font-mono text-[10px] text-slate-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[#0a0a0f]">
                        {MEMORY_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="font-mono text-[10px] text-slate-300 focus:bg-white/5">
                            {CATEGORY_CONFIG[cat].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => { if (addContent.trim().length >= 10) storeMutation.mutate(addContent.trim()) }}
                      disabled={addContent.trim().length < 10 || storeMutation.isPending}
                      className="ml-auto flex items-center gap-1.5 rounded-md bg-cyan-500/20 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-500/30 disabled:opacity-40"
                    >
                      {storeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Store
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Extract from Text Form */}
          <AnimatePresence>
            {showExtractForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden px-5"
              >
                <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-3">
                  <textarea
                    value={extractText}
                    onChange={(e) => setExtractText(e.target.value)}
                    placeholder="Paste text here — the AI will extract discrete memories and categorize them..."
                    className="min-h-[100px] w-full resize-none rounded-md border border-white/5 bg-black/30 px-3 py-2 font-mono text-[11px] text-slate-300 placeholder:text-slate-600 focus:border-emerald-500/30 focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-mono text-[9px] text-slate-600">
                      {extractText.length} chars {extractText.length < 50 ? '(min 50)' : ''}
                    </span>
                    <button
                      onClick={() => { if (extractText.length >= 50) extractMutation.mutate(extractText) }}
                      disabled={extractText.length < 50 || extractMutation.isPending}
                      className="flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-40"
                    >
                      {extractMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Extract
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search & Filter */}
          <div className="flex items-center gap-2 px-5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories..."
                className="h-8 w-full rounded-lg border border-white/5 bg-white/[0.02] pl-8 pr-3 font-mono text-[11px] text-slate-300 placeholder:text-slate-600 focus:border-white/10 focus:outline-none"
              />
            </div>
            {filterCategory !== 'all' && (
              <button
                onClick={() => setFilterCategory('all')}
                className="flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[10px] font-mono text-slate-400 hover:text-slate-300"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Memory List */}
          <div className="flex-1 min-h-0 px-5 pb-4">
            {memoriesLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
              </div>
            ) : memories.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Brain className="h-8 w-8 text-slate-700" />
                <p className="font-mono text-[11px] text-slate-500">
                  {searchQuery || filterCategory !== 'all'
                    ? 'No memories match your search'
                    : 'No memories stored yet'}
                </p>
                <p className="font-mono text-[9px] text-slate-600 max-w-[280px]">
                  {searchQuery || filterCategory !== 'all'
                    ? 'Try a different search term or category filter'
                    : 'Add memories manually, import from the knowledge graph, or extract from text using AI'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-1.5 pr-3"
                >
                  {memories.map((mem) => {
                    const cfg = CATEGORY_CONFIG[mem.category] || CATEGORY_CONFIG.insight
                    const date = new Date(mem.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                    const time = new Date(mem.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <motion.div
                        key={mem.id}
                        variants={item}
                        className={`group relative rounded-lg border-l-2 ${cfg.border} border border-white/5 bg-white/[0.015] px-3 py-2.5 transition-colors hover:bg-white/[0.03]`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Category icon */}
                          <div className={`mt-0.5 flex shrink-0 items-center justify-center rounded-md p-1 ${cfg.bg}`}>
                            <span className={cfg.color}>{cfg.icon}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-[11px] leading-relaxed text-slate-300 break-words">
                              {mem.content.length > 300
                                ? mem.content.slice(0, 300) + '...'
                                : mem.content}
                            </p>
                            {/* Meta row */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              {mem.source && mem.source !== 'manual' && (
                                <span className="font-mono text-[8px] text-slate-600">
                                  src: {mem.source}
                                </span>
                              )}
                              <span className="font-mono text-[8px] text-slate-600">
                                {date} {time}
                              </span>
                              <span className="font-mono text-[8px] text-slate-600">
                                accessed {mem.accessCount}x
                              </span>
                              {/* Relevance bar */}
                              <div className="flex items-center gap-1">
                                <div className="h-1 w-12 rounded-full bg-white/5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(mem.relevance * 40, 100)}%`,
                                      backgroundColor: mem.relevance > 1.5 ? '#10b981' : mem.relevance > 1.0 ? '#00d4ff' : '#94a3b8',
                                    }}
                                  />
                                </div>
                                <span className="font-mono text-[8px] text-slate-600">
                                  {mem.relevance.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* ═══ Sidebar ═══ */}
        <div className="relative flex flex-col gap-3 border-l border-white/5 bg-white/[0.01] p-4">
          {/* Memory Categories */}
          <div>
            <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
              Memory Categories
            </p>
            <div className="flex flex-col gap-1.5">
              {MEMORY_CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat]
                const count = byCategory[cat] ?? 0
                const maxCount = Math.max(...Object.values(byCategory), 1)
                const barWidth = (count / maxCount) * 100

                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                    className={`group/cat flex items-center gap-2 text-left transition-opacity hover:opacity-80 ${filterCategory === cat ? 'opacity-100' : 'opacity-70'}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${
                      cat === 'insight' ? 'bg-cyan-400' :
                      cat === 'strategy' ? 'bg-amber-400' :
                      cat === 'pattern' ? 'bg-purple-400' :
                      cat === 'lesson' ? 'bg-emerald-400' :
                      cat === 'fact' ? 'bg-pink-400' :
                      'bg-orange-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] text-slate-400">{cfg.label}</span>
                        <span className="font-mono text-[9px] text-slate-600">{count}</span>
                      </div>
                      <div className="mt-0.5 h-0.5 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: cat === 'insight' ? '#00d4ff' : cat === 'strategy' ? '#ffb700' : cat === 'pattern' ? '#9d4edd' : cat === 'lesson' ? '#10b981' : cat === 'fact' ? '#f472b6' : '#fb923c',
                            opacity: 0.6,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5" />

          {/* System Info */}
          <div>
            <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
              System
            </p>
            <div className="flex flex-col gap-2">
              {[
                {
                  label: 'Total Memories',
                  value: statsLoading ? '...' : String(totalMemories),
                  color: totalMemories > 0 ? 'text-cyan-400' : 'text-slate-500',
                  icon: <Database className="h-3 w-3" />,
                },
                {
                  label: 'Last 24h',
                  value: statsLoading ? '...' : String(recentCount),
                  color: recentCount > 0 ? 'text-emerald-400' : 'text-slate-500',
                  icon: <Clock className="h-3 w-3" />,
                },
                {
                  label: 'AI Reflect',
                  value: reflectMutation.isPending ? 'Running...' : 'Ready',
                  color: reflectMutation.isPending ? 'text-purple-400' : 'text-slate-500',
                  icon: <Sparkles className="h-3 w-3" />,
                },
                {
                  label: 'LLM Status',
                  value: 'Active',
                  color: 'text-emerald-400',
                  icon: <Zap className="h-3 w-3" />,
                },
              ].map((sys) => (
                <div
                  key={sys.label}
                  className="flex flex-col gap-0.5 rounded-lg border border-white/5 bg-white/[0.01] p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-slate-600">
                      {sys.label}
                    </span>
                    <span className={sys.color}>{sys.icon}</span>
                  </div>
                  <span className={`font-mono text-[10px] font-medium ${sys.color}`}>
                    {sys.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5" />

          {/* Quick Stats */}
          <div>
            <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
              Activity
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.01] p-2">
                <TrendingUp className="h-3 w-3 text-slate-600" />
                <div>
                  <p className="font-mono text-[8px] text-slate-600">Most Active</p>
                  <p className="font-mono text-[10px] text-slate-400">
                    {(() => {
                      const entries = Object.entries(byCategory)
                      if (entries.length === 0) return '—'
                      const top = entries.sort((a, b) => b[1] - a[1])[0]
                      return `${CATEGORY_CONFIG[top[0]]?.label || top[0]} (${top[1]})`
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.01] p-2">
                <RefreshCw className="h-3 w-3 text-slate-600" />
                <div>
                  <p className="font-mono text-[8px] text-slate-600">Diversity</p>
                  <p className="font-mono text-[10px] text-slate-400">
                    {Object.keys(byCategory).length}/{MEMORY_CATEGORIES.length} categories
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}