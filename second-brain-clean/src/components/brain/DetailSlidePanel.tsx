'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Star, Link2, Tags } from 'lucide-react'
import type { KnowledgeNode, LinkedNodeInfo } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import ConnectionManager from './ConnectionManager'

export type { LinkedNodeInfo } from '@/lib/types'

const CAT_COLORS: Record<string, { text: string; bg: string; border: string; hex: string }> = {
  strategy: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20', hex: '#ffb700' },
  operations: { text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-500/20', hex: '#00d4ff' },
  research: { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-500/20', hex: '#9d4edd' },
  systems: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20', hex: '#10b981' },
  design: { text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-500/20', hex: '#ff3c8e' },
  general: { text: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-500/20', hex: '#94a3b8' },
  compacted: { text: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-500/20', hex: '#38bdf8' },
}

/* Tag color palette — cycles through accent colors for visual variety */
const TAG_DOT_COLORS = ['#00d4ff', '#9d4edd', '#ff3c8e', '#ffb700', '#10b981', '#38bdf8', '#f472b6']

function getTagColor(index: number): string {
  return TAG_DOT_COLORS[index % TAG_DOT_COLORS.length]
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

interface ConnectionManagementProps {
  connectedNodeIds: string[]
  allNodes: { id: string; title: string; category: string }[]
  onConnect: (toNodeId: string) => void
  onDisconnect: (targetNodeId: string) => void
}

interface DetailSlidePanelProps {
  node: KnowledgeNode | null
  linkedNodes: LinkedNodeInfo[]
  onClose: () => void
  onEdit: (node: KnowledgeNode) => void
  onDelete: (id: string) => void
  onPin: (id: string, pinned: boolean) => void
  onFocusNode: (id: string) => void
  connectionManagement?: ConnectionManagementProps
  isBookmarked?: boolean
  onToggleBookmark?: (nodeId: string) => void
}

export default function DetailSlidePanel({
  node,
  linkedNodes,
  onClose,
  onEdit,
  onDelete,
  onPin,
  onFocusNode,
  connectionManagement,
  isBookmarked,
  onToggleBookmark,
}: DetailSlidePanelProps) {
  if (!node) return null

  const cat = CAT_COLORS[node.category] || CAT_COLORS.general
  const createdDate = new Date(node.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const dbConnectedIds = new Set(connectionManagement?.connectedNodeIds || [])
  const dbLinked = linkedNodes.filter((ln) => dbConnectedIds.has(ln.id))
  const tagLinked = linkedNodes.filter((ln) => !dbConnectedIds.has(ln.id))

  return (
    <AnimatePresence>
      <motion.div
        key={node.id}
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute top-0 right-0 z-30 flex h-full w-[380px] max-w-[90vw] flex-col border-l border-white/5 bg-black/50 backdrop-blur-xl gradient-top-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
            Node Detail
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          {/* Title */}
          <h2 className="mb-2 font-mono text-sm font-semibold text-slate-300">
            {node.title}
          </h2>

          {/* Category + Pinned + Bookmark */}
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] ${cat.text} ${cat.bg} ${cat.border}`}
            >
              {node.category}
            </span>
            {node.pinned && (
              <span className="text-[10px] text-amber-400">📌</span>
            )}
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(node.id)}
                className="ml-auto rounded p-1 transition-colors hover:bg-white/5"
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this node'}
              >
                <Star
                  className={`h-3.5 w-3.5 transition-colors ${
                    isBookmarked
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-600 hover:text-amber-400/60'
                  }`}
                />
              </button>
            )}
          </div>

          {/* Tags with individual colored dots */}
          {node.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {node.tags.map((tag, idx) => {
                const dotColor = getTagColor(idx)
                return (
                  <span
                    key={tag.id ?? `tag-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded border border-white/5 bg-white/[0.03] px-2 py-0.5 font-mono text-[8px] tracking-[0.15em] text-slate-400 transition-colors hover:bg-white/[0.06]"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor, boxShadow: `0 0 4px ${dotColor}66` }}
                    />
                    {tag.name}
                  </span>
                )
              })}
            </div>
          )}

          {/* Content */}
          <div className="mb-4">
            <span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
              Content
            </span>
            <p className="font-mono text-xs leading-relaxed text-slate-400 [word-break:break-word] overflow-wrap-anywhere">
              {node.content.length > 300
                ? node.content.slice(0, 300) + '...'
                : node.content}
            </p>
          </div>

          {/* Created date with relative time */}
          <div className="mb-4">
            <span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
              Created
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{createdDate}</span>
              <span className="font-mono text-[9px] text-slate-600">({relativeTime(node.createdAt)})</span>
            </div>
          </div>

          {/* Updated date with relative time */}
          {node.updatedAt && node.updatedAt !== node.createdAt && (
            <div className="mb-6">
              <span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
                Updated
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">
                  {new Date(node.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="font-mono text-[9px] text-slate-600">({relativeTime(node.updatedAt)})</span>
              </div>
            </div>
          )}

          {/* DB Connections Manager */}
          {connectionManagement && (
            <div className="mb-4">
              <ConnectionManager
                nodeId={node.id}
                nodeTitle={node.title}
                allNodes={connectionManagement.allNodes}
                connectedNodeIds={connectionManagement.connectedNodeIds}
                onConnect={connectionManagement.onConnect}
                onDisconnect={connectionManagement.onDisconnect}
              />
            </div>
          )}

          {/* Linked Nodes with connection type indicators */}
          {linkedNodes.length > 0 && (
            <div className="mb-4">
              <span className="mb-2 block font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
                Related Nodes
                <span className="ml-1.5 text-slate-700">({linkedNodes.length})</span>
              </span>

              {/* DB-connected nodes */}
              {dbLinked.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 flex items-center gap-1.5 px-0.5">
                    <Link2 className="h-2.5 w-2.5 text-cyan-400/60" />
                    <span className="font-mono text-[7px] uppercase tracking-[0.15em] text-slate-600">
                      Direct connections
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {dbLinked.map((ln) => {
                      const dotColor = (CAT_COLORS[ln.category] || CAT_COLORS.general).hex
                      return (
                        <motion.button
                          key={`db-${ln.id}`}
                          onClick={() => onFocusNode(ln.id)}
                          className="group flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-2 text-left transition-all hover:border-cyan-500/15 hover:bg-cyan-500/5"
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.15 }}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}44` }}
                          />
                          <span className="flex-1 truncate font-mono text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">
                            {ln.title}
                          </span>
                          <Link2 className="h-2.5 w-2.5 shrink-0 text-cyan-400/30 group-hover:text-cyan-400/60 transition-colors" />
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tag-connected nodes */}
              {tagLinked.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 px-0.5">
                    <Tags className="h-2.5 w-2.5 text-purple-400/60" />
                    <span className="font-mono text-[7px] uppercase tracking-[0.15em] text-slate-600">
                      Shared tags
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {tagLinked.map((ln) => {
                      const dotColor = (CAT_COLORS[ln.category] || CAT_COLORS.general).hex
                      return (
                        <motion.button
                          key={`tag-${ln.id}`}
                          onClick={() => onFocusNode(ln.id)}
                          className="group flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-2 text-left transition-all hover:border-purple-500/15 hover:bg-purple-500/5"
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.15 }}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}44` }}
                          />
                          <span className="flex-1 truncate font-mono text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">
                            {ln.title}
                          </span>
                          {ln.strength != null && (
                            <span className="shrink-0 font-mono text-[8px] text-slate-600">
                              {Math.round(ln.strength * 100)}%
                            </span>
                          )}
                          <Tags className="h-2.5 w-2.5 shrink-0 text-purple-400/30 group-hover:text-purple-400/60 transition-colors" />
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions footer */}
        <div className="flex items-center gap-2 border-t border-white/5 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(node)}
            className="h-7 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400 hover:bg-white/5 hover:text-slate-300"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPin(node.id, !node.pinned)}
            className="h-7 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400 hover:bg-white/5 hover:text-slate-300"
          >
            {node.pinned ? 'Unpin' : 'Pin'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 font-mono text-[8px] uppercase tracking-[0.2em] text-rose-400 hover:bg-rose-500/10"
              >
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-white/10 bg-[#0a0a12] backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-mono text-sm text-slate-300">
                  Delete Node
                </AlertDialogTitle>
                <AlertDialogDescription className="font-mono text-xs text-slate-400">
                  This will permanently remove &quot;{node.title}&quot; and all its connections.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/10 bg-transparent font-mono text-xs text-slate-400 hover:bg-white/5">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(node.id)}
                  className="bg-rose-500/20 font-mono text-xs text-rose-400 hover:bg-rose-500/30"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}