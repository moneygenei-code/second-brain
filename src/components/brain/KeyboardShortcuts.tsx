'use client'

import { motion } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'

interface KeyboardShortcutsProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { keys: '⌘K', description: 'Search / Command Palette' },
  { keys: 'B', description: 'Brain View' },
  { keys: 'D', description: 'Dashboard' },
  { keys: 'A', description: 'Activity' },
  { keys: 'S', description: 'Settings' },
  { keys: '?', description: 'Show this help' },
  { keys: 'Escape', description: 'Close panels / deselect' },
  { keys: '⌘N', description: 'New Node' },
  { keys: '⌘L', description: 'Toggle List View' },
]

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 w-full max-w-[460px] rounded-2xl border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-2xl shadow-black/60"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Keyboard className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-300">
              Keyboard Shortcuts
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="grid grid-cols-2 gap-px p-4">
          {SHORTCUTS.map((shortcut, i) => (
            <motion.div
              key={shortcut.keys}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
            >
              <span className="font-mono text-[10px] text-slate-400">
                {shortcut.description}
              </span>
              <kbd className="ml-2 shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-slate-300 shadow-sm">
                {shortcut.keys}
              </kbd>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-5 py-2.5">
          <p className="text-center font-mono text-[8px] text-slate-600">
            Press <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[8px] text-slate-500">?</kbd> or <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[8px] text-slate-500">Esc</kbd> to close
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}