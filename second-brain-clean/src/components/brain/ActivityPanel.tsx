'use client'

import { motion } from 'framer-motion'
import type { ActivityLogItem } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

const LOG_TYPE_COLORS: Record<string, { text: string; bg: string }> = {
  create: { text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  update: { text: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  delete: { text: 'text-rose-400', bg: 'bg-rose-400/10' },
  analysis: { text: 'text-purple-400', bg: 'bg-purple-400/10' },
  seed: { text: 'text-amber-400', bg: 'bg-amber-400/10' },
  export: { text: 'text-sky-400', bg: 'bg-sky-400/10' },
  compact: { text: 'text-orange-400', bg: 'bg-orange-400/10' },
  default: { text: 'text-slate-400', bg: 'bg-slate-400/10' },
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

interface ActivityPanelProps {
  logs: ActivityLogItem[]
  isLoading: boolean
  total: number
  onLoadMore: () => void
  onClearLogs: () => void
  onClose: () => void
}

export default function ActivityPanel({
  logs,
  isLoading,
  total,
  onLoadMore,
  onClearLogs,
  onClose,
}: ActivityPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 flex h-[80vh] max-w-2xl w-full flex-col rounded-xl border border-white/5 bg-black/50 backdrop-blur-xl"
      >
        {/* Header */}
        <motion.div
          variants={item}
          className="flex items-center justify-between border-b border-white/5 px-5 py-4"
        >
          <div>
            <h2 className="font-mono text-sm font-semibold tracking-[0.1em] text-slate-300 uppercase">
              Activity Log
            </h2>
            <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
              {total} events recorded
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearLogs}
              className="h-7 font-mono text-[8px] uppercase tracking-[0.2em] text-rose-400 hover:bg-rose-500/10"
            >
              Clear All
            </Button>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Log list */}
        <ScrollArea className="flex-1 px-5">
          <div className="flex flex-col gap-1.5 py-3">
            {logs.length === 0 && !isLoading && (
              <p className="py-8 text-center font-mono text-[10px] text-slate-600">
                No activity recorded yet
              </p>
            )}
            {logs.map((log) => {
              const colors = LOG_TYPE_COLORS[log.action] || LOG_TYPE_COLORS.default
              const time = new Date(log.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <motion.div
                  key={log.id}
                  variants={item}
                  className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2.5"
                >
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${colors.text} ${colors.bg}`}>
                    {log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-slate-300">{log.detail}</p>
                    {log.category && (
                      <p className="mt-0.5 font-mono text-[8px] text-slate-600 uppercase tracking-wider">
                        {log.category}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[8px] text-slate-600">{time}</span>
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>

        {/* Load more */}
        {logs.length < total && (
          <div className="border-t border-white/5 px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoading}
              className="w-full font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400 hover:bg-white/5 hover:text-slate-300"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                  Loading...
                </span>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}