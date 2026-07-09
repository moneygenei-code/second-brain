'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Trash2, FolderInput, Download, CheckSquare, Square } from 'lucide-react'
import { CATEGORY_COLORS, VALID_CATEGORIES } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NodeListViewProps {
  nodes: {
    id: string
    title: string
    category: string
    content: string
    tags: { id?: string; name: string }[]
    pinned: boolean
    createdAt: string
  }[]
  selectedNodeId: string | null
  onNodeSelect: (id: string) => void
  activeCategories: Set<string>
  searchQuery: string
  onSearchChange: (query: string) => void
  bookmarkedIds?: Set<string>
  isBookmarkedFilter?: boolean
  onDeleteNodes?: (ids: string[]) => Promise<void>
  onBulkDelete?: (ids: string[]) => Promise<void>
  onBulkUpdateCategory?: (ids: string[], category: string) => Promise<void>
}

type ViewMode = 'grid' | 'list'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function CategoryDot({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.general
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

/** Highlight matching substrings in text with cyan background */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const q = query.toLowerCase()
  const lowerText = text.toLowerCase()
  const parts: { text: string; match: boolean }[] = []
  let lastIndex = 0
  let idx = lowerText.indexOf(q, lastIndex)

  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push({ text: text.slice(lastIndex, idx), match: false })
    }
    parts.push({ text: text.slice(idx, idx + q.length), match: true })
    lastIndex = idx + q.length
    idx = lowerText.indexOf(q, lastIndex)
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), match: false })
  }

  if (parts.length === 0) return <>{text}</>

  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark
            key={i}
            className="rounded-sm bg-cyan-500/30 text-cyan-300"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      {/* Brain / empty illustration */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-4 text-slate-700"
      >
        <path d="M12 2a5 5 0 0 1 5 5c0 .98-.28 1.89-.77 2.66A5 5 0 0 1 19 14a5 5 0 0 1-3.59 4.8A3.5 3.5 0 0 1 12 22a3.5 3.5 0 0 1-3.41-3.2A5 5 0 0 1 5 14a5 5 0 0 1 2.77-4.34A5 5 0 0 1 7 7a5 5 0 0 1 5-5z" />
        <path d="M12 2v20" />
        <path d="M7 7h10" />
        <path d="M5 14h14" />
      </svg>
      <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
        No nodes found
      </span>
      <span className="mt-1 font-mono text-[10px] text-slate-700">
        Try adjusting your filters or search query
      </span>
    </motion.div>
  )
}

function NodeCard({
  node,
  isSelected,
  onSelect,
  mode,
  searchQuery,
  isBookmarked,
  isChecked,
  selectMode,
  onCheckToggle,
}: {
  node: NodeListViewProps['nodes'][number]
  isSelected: boolean
  onSelect: () => void
  mode: ViewMode
  searchQuery: string
  isBookmarked?: boolean
  isChecked: boolean
  selectMode: boolean
  onCheckToggle: (e: React.MouseEvent) => void
}) {
  const color = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.general
  const contentPreview =
    node.content.length > 150
      ? node.content.slice(0, 150) + '…'
      : node.content

  const isSearchActive = searchQuery.trim().length > 0

  if (mode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        onClick={onSelect}
        className={`group flex cursor-pointer items-center gap-3 border-l-[3px] border-l-transparent px-3 py-2.5 transition-all duration-200 ${
          isSelected
            ? 'border-cyan-500/30 border-l-cyan-500 bg-cyan-500/5'
            : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
        } ${isChecked ? 'ring-1 ring-cyan-500/20' : ''}`}
        style={!isSelected ? { borderLeftColor: `${color}80` } : undefined}
        whileHover={!isSelected ? { boxShadow: `0 0 20px ${color}15, inset 0 0 0 1px ${color}10` } : undefined}
      >
        {/* Checkbox — always visible in list mode when select mode is on */}
        {selectMode && (
          <button
            onClick={onCheckToggle}
            className="shrink-0 text-slate-600 transition-colors hover:text-slate-300"
            aria-label={isChecked ? 'Deselect' : 'Select'}
          >
            {isChecked ? (
              <CheckSquare className="h-3.5 w-3.5 text-cyan-400" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Category-colored left border bar */}
        <span
          className="h-8 w-[3px] shrink-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}33` }}
        />
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-xs font-medium text-slate-300">
              {isSearchActive ? <HighlightText text={node.title} query={searchQuery} /> : node.title}
            </span>
            {node.pinned && (
              <span className="shrink-0 text-[10px] text-amber-400">📌</span>
            )}
            {isBookmarked && (
              <Star className="h-3 w-3 shrink-0 fill-amber-400/80 text-amber-400/80" />
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] leading-relaxed text-slate-500">
            {isSearchActive ? <HighlightText text={contentPreview} query={searchQuery} /> : contentPreview}
          </p>
        </div>
        {/* Meta */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {node.tags.slice(0, 2).map((t, idx) => (
            <span
              key={t.id ?? `tag-${idx}`}
              className={`rounded border px-1.5 py-0.5 font-mono text-[7px] tracking-[0.15em] ${
                isSearchActive && t.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
                  : 'border-white/5 bg-white/[0.03] text-slate-500'
              }`}
            >
              {t.name}
            </span>
          ))}
          <span className="font-mono text-[8px] text-slate-600" title={formatDate(node.createdAt)}>
            {relativeTime(node.createdAt)}
          </span>
        </div>
      </motion.div>
    )
  }

  // Grid mode
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      onClick={onSelect}
      className={`group relative flex cursor-pointer flex-col border transition-all duration-200 ${
        isSelected
          ? 'border-cyan-500/30 bg-cyan-500/5'
          : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
      } ${isChecked ? 'ring-1 ring-cyan-500/20' : ''}`}
      whileHover={!isSelected ? { boxShadow: `0 0 24px ${color}12, 0 0 6px ${color}08` } : undefined}
    >
      {/* Checkbox — appears on hover in grid mode, or always when selectMode + checked */}
      {selectMode && (
        <button
          onClick={onCheckToggle}
          className={`absolute top-1.5 right-1.5 z-10 rounded p-0.5 transition-all ${
            isChecked
              ? 'text-cyan-400 opacity-100'
              : 'text-slate-600 opacity-0 group-hover:opacity-100'
          } hover:text-slate-300`}
          aria-label={isChecked ? 'Deselect' : 'Select'}
        >
          {isChecked ? (
            <CheckSquare className="h-3 w-3" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </button>
      )}

      {/* Category-colored left border */}
      <span
        className="absolute top-0 left-0 h-full w-1 rounded-l-sm"
        style={{ backgroundColor: color, opacity: 0.8, boxShadow: `0 0 8px ${color}33` }}
      />

      <div className="p-3 pl-4">
        {/* Title row */}
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <h3 className="truncate pr-4 font-mono text-xs font-medium text-slate-300 [word-break:break-word]">
            {isSearchActive ? <HighlightText text={node.title} query={searchQuery} /> : node.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            {isBookmarked && (
              <Star className="h-3 w-3 fill-amber-400/80 text-amber-400/80" />
            )}
            {node.pinned && (
              <span className="text-[10px] leading-none text-amber-400">
                📌
              </span>
            )}
          </div>
        </div>

        {/* Content preview */}
        <p className="mb-3 font-mono text-[10px] leading-relaxed text-slate-500 [word-break:break-word]">
          {isSearchActive ? <HighlightText text={contentPreview} query={searchQuery} /> : contentPreview}
        </p>

        {/* Tags */}
        {node.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {node.tags.slice(0, 3).map((t, idx) => (
              <span
                key={t.id ?? `tag-${idx}`}
                className={`rounded border px-1.5 py-0.5 font-mono text-[7px] tracking-[0.15em] ${
                  isSearchActive && t.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
                    : 'border-white/5 bg-white/[0.03] text-slate-500'
                }`}
              >
                {t.name}
              </span>
            ))}
            {node.tags.length > 3 && (
              <span className="font-mono text-[7px] text-slate-600">
                +{node.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CategoryDot category={node.category} />
            <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-slate-600">
              {node.category}
            </span>
          </div>
          <span className="font-mono text-[7px] text-slate-700" title={formatDate(node.createdAt)}>
            {relativeTime(node.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default function NodeListView({
  nodes,
  selectedNodeId,
  onNodeSelect,
  activeCategories,
  searchQuery,
  onSearchChange,
  bookmarkedIds,
  isBookmarkedFilter = false,
  onDeleteNodes,
  onBulkDelete,
  onBulkUpdateCategory,
}: NodeListViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectMode, setSelectMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [changeCategoryOpen, setChangeCategoryOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)

  const filteredNodes = useMemo(() => {
    let result = nodes

    // Bookmark filter (takes priority over category)
    if (isBookmarkedFilter && bookmarkedIds) {
      result = result.filter((n) => bookmarkedIds.has(n.id))
    } else if (activeCategories.size > 0) {
      result = result.filter((n) => activeCategories.has(n.category))
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q) ||
          n.tags.some((t) => t.name.toLowerCase().includes(q))
      )
    }

    return result
  }, [nodes, activeCategories, searchQuery, isBookmarkedFilter, bookmarkedIds])

  const isSearchActive = searchQuery.trim().length > 0
  const hasSelection = checkedIds.size > 0
  const allChecked = filteredNodes.length > 0 && checkedIds.size === filteredNodes.length

  const handleToggleCheck = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (allChecked) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(filteredNodes.map((n) => n.id)))
    }
  }, [allChecked, filteredNodes])

  const handleBulkDelete = useCallback(async () => {
    const deleteFn = onDeleteNodes || onBulkDelete
    if (!deleteFn || checkedIds.size === 0) return
    setIsDeleting(true)
    try {
      await deleteFn(Array.from(checkedIds))
      setCheckedIds(new Set())
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }, [checkedIds, onDeleteNodes, onBulkDelete])

  const handleBulkChangeCategory = useCallback(async () => {
    if (!onBulkUpdateCategory || checkedIds.size === 0 || !newCategory) return
    setIsUpdatingCategory(true)
    try {
      await onBulkUpdateCategory(Array.from(checkedIds), newCategory)
      setCheckedIds(new Set())
      setChangeCategoryOpen(false)
      setNewCategory('')
    } finally {
      setIsUpdatingCategory(false)
    }
  }, [checkedIds, newCategory, onBulkUpdateCategory])

  const handleExportSelected = useCallback(() => {
    if (checkedIds.size === 0) return
    const selected = nodes.filter((n) => checkedIds.has(n.id))
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `second-brain-export-${checkedIds.size}-nodes.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [checkedIds, nodes])

  // Clear selection when search/filter changes
  useEffect(() => {
    setCheckedIds(new Set())
  }, [searchQuery, activeCategories])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-10 flex flex-col bg-[#050509]"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-600"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search nodes..."
            className="h-7 border-white/5 bg-white/[0.03] pr-7 font-mono text-[10px] text-slate-300 placeholder:text-slate-600 focus-visible:ring-cyan-500/20"
          />
          {isSearchActive && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-0.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
              title="Clear search"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Select Mode Toggle */}
        <button
          onClick={() => { setSelectMode((v) => !v); if (selectMode) setCheckedIds(new Set()) }}
          className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] transition-colors ${selectMode ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400' : 'border-white/5 bg-black/40 text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
          title={selectMode ? 'Exit Select Mode' : 'Select Mode'}
        >
          <CheckSquare className="h-3 w-3" />
          <span className="hidden sm:inline">Select</span>
        </button>

        {/* Select All / Deselect All — only in select mode */}
        {selectMode && (
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1 rounded-md border border-white/5 bg-black/40 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            title={allChecked ? 'Deselect All' : 'Select All'}
          >
            {allChecked ? (
              <CheckSquare className="h-3 w-3 text-cyan-400" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">{allChecked ? 'None' : 'All'}</span>
          </button>
        )}

        {/* View toggle */}
        <div className="flex items-center rounded-full border border-white/5 bg-black/40 p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-full px-2 py-1 transition-colors ${
              viewMode === 'grid'
                ? 'bg-white/10 text-slate-300'
                : 'text-slate-600 hover:text-slate-400'
            }`}
            title="Grid view"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-full px-2 py-1 transition-colors ${
              viewMode === 'list'
                ? 'bg-white/10 text-slate-300'
                : 'text-slate-600 hover:text-slate-400'
            }`}
            title="List view"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={() => onSearchChange('')}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          title="Close list view"
        >
          <svg
            width="14"
            height="14"
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
      </div>

      {/* Results count */}
      <div className="shrink-0 border-b border-white/5 px-4 py-1.5">
        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
          {isSearchActive ? (
            <>
              Showing{' '}
              <span className="font-semibold text-cyan-400">
                {filteredNodes.length}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-400">
                {nodes.length}
              </span>{' '}
              nodes
              {activeCategories.size > 0 && (
                <span className="ml-1 text-slate-700">(filtered)</span>
              )}
            </>
          ) : (
            <>
              {filteredNodes.length} node{filteredNodes.length !== 1 ? 's' : ''}
              {activeCategories.size > 0 && (
                <span className="ml-1 text-slate-700">(filtered)</span>
              )}
            </>
          )}
        </span>
      </div>

      {/* Content area with bottom gradient fade */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 sm:p-4">
          {filteredNodes.length === 0 ? (
            <EmptyState />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredNodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    isSelected={node.id === selectedNodeId}
                    onSelect={() => onNodeSelect(node.id)}
                    mode="grid"
                    searchQuery={searchQuery}
                    isBookmarked={bookmarkedIds?.has(node.id)}
                    isChecked={checkedIds.has(node.id)}
                    selectMode={selectMode}
                    onCheckToggle={(e) => handleToggleCheck(e, node.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <AnimatePresence mode="popLayout">
                {filteredNodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    isSelected={node.id === selectedNodeId}
                    onSelect={() => onNodeSelect(node.id)}
                    mode="list"
                    searchQuery={searchQuery}
                    isBookmarked={bookmarkedIds?.has(node.id)}
                    isChecked={checkedIds.has(node.id)}
                    selectMode={selectMode}
                    onCheckToggle={(e) => handleToggleCheck(e, node.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>
      {/* Bottom gradient fade overlay */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#050509] to-transparent" />
      </div>

      {/* ─── Floating Action Bar ─── */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/70 px-4 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
              {/* Selected count badge */}
              <div className="flex items-center gap-1.5 pr-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20">
                  <span className="font-mono text-[9px] font-semibold tabular-nums text-cyan-400">
                    {checkedIds.size}
                  </span>
                </div>
                <span className="hidden font-mono text-[8px] uppercase tracking-[0.15em] text-slate-500 sm:inline">
                  selected
                </span>
              </div>

              <div className="h-4 w-px bg-white/[0.08]" />

              {/* Delete Selected */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-rose-400 transition-colors hover:bg-rose-500/10"
              >
                <Trash2 className="h-3 w-3" />
                <span className="hidden sm:inline">Delete</span>
              </button>

              {/* Change Category */}
              {onBulkUpdateCategory && (
                <button
                  onClick={() => setChangeCategoryOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-amber-400 transition-colors hover:bg-amber-500/10"
                >
                  <FolderInput className="h-3 w-3" />
                  <span className="hidden sm:inline">Category</span>
                </button>
              )}

              {/* Export Selected */}
              <button
                onClick={handleExportSelected}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-emerald-400 transition-colors hover:bg-emerald-500/10"
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Deselect All */}
              <div className="h-4 w-px bg-white/[0.08]" />
              <button
                onClick={() => setCheckedIds(new Set())}
                className="rounded-lg px-2 py-1.5 font-mono text-[9px] text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation Dialog ─── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="border-white/10 bg-[#0a0a12] backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-sm text-slate-200">
              Delete {checkedIds.size} node{checkedIds.size !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs text-slate-400">
              This action cannot be undone. {checkedIds.size} node{checkedIds.size !== 1 ? 's' : ''} will be permanently removed from your knowledge base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/[0.03] font-mono text-xs text-slate-400 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="border-rose-500/30 bg-rose-500/20 font-mono text-xs text-rose-400 hover:bg-rose-500/30"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-rose-400/30 border-t-rose-400" />
                  Deleting...
                </span>
              ) : (
                `Delete ${checkedIds.size}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Change Category Dialog ─── */}
      {changeCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setChangeCategoryOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-[300px] rounded-xl border border-white/10 bg-[#0a0a12] p-4 shadow-2xl backdrop-blur-xl"
          >
            <h3 className="mb-3 font-mono text-xs text-slate-300">
              Change Category for {checkedIds.size} node{checkedIds.size !== 1 ? 's' : ''}
            </h3>
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="w-full border-white/10 bg-white/[0.03] font-mono text-xs text-slate-300 focus:ring-cyan-500/20">
                <SelectValue placeholder="Select new category" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#0a0a12] backdrop-blur-xl">
                {VALID_CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat}
                    value={cat}
                    className="font-mono text-xs text-slate-300 focus:bg-cyan-500/10 focus:text-cyan-400"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.general }}
                      />
                      {cat}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => { setChangeCategoryOpen(false); setNewCategory('') }}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[9px] text-slate-400 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkChangeCategory}
                disabled={!newCategory || isUpdatingCategory}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/20 px-3 py-1.5 font-mono text-[9px] text-cyan-400 transition-colors hover:bg-cyan-500/30 disabled:opacity-40"
              >
                {isUpdatingCategory ? 'Updating...' : 'Apply'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}