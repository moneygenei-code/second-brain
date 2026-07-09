'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, X, Minimize2 } from 'lucide-react'

const STORAGE_KEY = 'second-brain-quick-notes'

export default function QuickNotes({
  isOpen,
  onToggle,
}: {
  isOpen: boolean
  onToggle: () => void
}) {
  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return ''
    try {
      return localStorage.getItem(STORAGE_KEY) || ''
    } catch { return '' }
  })
  const [isMinimized, setIsMinimized] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Auto-save on change with debounce
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNotes(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, value)
      } catch { /* silent */ }
    }, 300)
  }, [])

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [isOpen, isMinimized])

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-16 left-4 z-50 flex flex-col w-[300px] sm:w-[340px] rounded-xl border border-white/[0.08] bg-black/60 backdrop-blur-2xl shadow-2xl shadow-black/40"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <StickyNote className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">
                Quick Notes
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Word count badge */}
              <span className="mr-2 rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[7px] tabular-nums text-slate-500">
                {wordCount}w
              </span>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
              >
                <Minimize2 className="h-3 w-3" />
              </button>
              <button
                onClick={onToggle}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Body */}
          <AnimatePresence mode="wait">
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <textarea
                  ref={textareaRef}
                  value={notes}
                  onChange={handleChange}
                  placeholder="Jot down quick thoughts... (auto-saved)"
                  className="h-[200px] w-full resize-none bg-transparent px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-300 placeholder:text-slate-600 focus:outline-none scrollbar-thin"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/5 px-3 py-1.5">
            <span className="font-mono text-[7px] text-slate-600">
              Auto-saved to browser
            </span>
            <span className="font-mono text-[7px] text-slate-600">
              {notes.length} chars
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}