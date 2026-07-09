'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Analysis } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

interface AnalysisOverlayProps {
  analysis: Analysis | null
  isAnalyzing: boolean
  onClose: () => void
}

export default function AnalysisOverlay({
  analysis,
  isAnalyzing,
  onClose,
}: AnalysisOverlayProps) {
  return (
    <AnimatePresence>
      {(isAnalyzing || analysis) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 flex h-[85vh] max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-purple-500/15 bg-black/50 backdrop-blur-xl"
          >
            {/* Header — fixed, doesn't scroll */}
            <div className="shrink-0 flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                <h2 className="font-mono text-sm font-semibold tracking-[0.1em] text-slate-300 uppercase">
                  AI Analysis
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Loading state */}
            {isAnalyzing && (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="mb-4 flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" style={{ animationDelay: '200ms' }} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" style={{ animationDelay: '400ms' }} />
                </div>
                <p className="font-mono text-xs tracking-[0.15em] text-slate-500">
                  Analyzing neural mesh...
                </p>
              </div>
            )}

            {/* Analysis results — scrollable */}
            {!isAnalyzing && analysis && (
              <ScrollArea className="flex-1 min-h-0">
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-6 px-5 py-4"
                >
                  {/* Summary */}
                  <motion.div variants={item}>
                    <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                      Summary
                    </p>
                    <p className="font-mono text-xs leading-relaxed text-slate-300 [word-break:break-word] overflow-wrap-anywhere">
                      {analysis.summary}
                    </p>
                  </motion.div>

                  {/* Insights */}
                  {analysis.insights.length > 0 && (
                    <motion.div variants={item}>
                      <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-400">
                        Insights
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {analysis.insights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                            <span className="font-mono text-xs leading-relaxed text-slate-400 [word-break:break-word] overflow-wrap-anywhere">
                              {insight}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* Suggestions */}
                  {analysis.suggestions.length > 0 && (
                    <motion.div variants={item}>
                      <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-amber-400">
                        Suggestions
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {analysis.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                            <span className="font-mono text-xs leading-relaxed text-slate-400 [word-break:break-word] overflow-wrap-anywhere">
                              {suggestion}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* Patterns */}
                  {analysis.patterns && (
                    <motion.div variants={item}>
                      <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-purple-400">
                        Patterns
                      </p>
                      <p className="font-mono text-xs leading-relaxed text-slate-400 [word-break:break-word] overflow-wrap-anywhere">
                        {analysis.patterns}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </ScrollArea>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}