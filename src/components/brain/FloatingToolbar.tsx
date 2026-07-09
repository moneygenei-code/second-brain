'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  LayoutDashboard,
  Activity,
  Settings,
  Network,
  Plus,
  Sparkles,
  ChevronsDown,
  ChevronsUp,
  Menu,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type ViewType = 'brain' | 'dashboard' | 'activity' | 'settings' | 'integrations'

interface FloatingToolbarProps {
  activeView: ViewType
  onNavigate: (view: ViewType) => void
  onAddNode: () => void
  onAnalyze: () => void
  isAnalyzing: boolean
}

const NAV_ITEMS: { view: ViewType; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { view: 'brain', icon: <Brain className="h-3.5 w-3.5" />, label: 'Brain', shortcut: '1' },
  { view: 'dashboard', icon: <LayoutDashboard className="h-3.5 w-3.5" />, label: 'Dashboard', shortcut: '2' },
  { view: 'activity', icon: <Activity className="h-3.5 w-3.5" />, label: 'Activity', shortcut: '3' },
  { view: 'settings', icon: <Settings className="h-3.5 w-3.5" />, label: 'Settings', shortcut: '4' },
  { view: 'integrations', icon: <Network className="h-3.5 w-3.5" />, label: 'Integrations', shortcut: '5' },
]

export default function FloatingToolbar({
  activeView,
  onNavigate,
  onAddNode,
  onAnalyze,
  isAnalyzing,
}: FloatingToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Collapsed state: small FAB to re-expand
  if (!isExpanded) {
    return (
      <div className="absolute bottom-4 left-1/2 z-[60] -translate-x-1/2">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-black/60 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl text-slate-400 transition-colors hover:border-cyan-500/20 hover:text-cyan-400"
          title="Show toolbar (Tab)"
        >
          <Menu className="h-4 w-4" />
        </motion.button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-[60] -translate-x-1/2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/60 p-1 shadow-[0_0_30px_rgba(0,0,0,0.5),0_0_1px_rgba(255,255,255,0.05)_inset] backdrop-blur-2xl"
      >
        {/* Gradient border shimmer overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-rose-500/10 opacity-50" />
        <div
          className="pointer-events-none absolute -inset-px rounded-full bg-gradient-to-r from-cyan-500/20 via-transparent to-purple-500/20"
          style={{
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: '1px',
          }}
        />

        {NAV_ITEMS.map((item) => (
          <Tooltip key={item.view}>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => onNavigate(item.view)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className={`group relative flex items-center gap-1.5 rounded-full px-3 py-2 transition-all duration-200 ${
                  activeView === item.view
                    ? 'animate-pulse-glow border border-cyan-500/20 bg-cyan-500/10 text-cyan-400'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 hover:shadow-[0_0_10px_rgba(0,243,255,0.06)]'
                }`}
              >
                {item.icon}
                <span className="hidden font-mono text-[8px] uppercase tracking-[0.2em] sm:inline">
                  {item.label}
                </span>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              className="border border-white/10 bg-black/80 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl text-slate-300"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider">
                {item.label}
              </span>
              <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[9px] text-slate-500">
                {item.shortcut}
              </kbd>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="mx-1 h-4 w-px bg-white/5" />

        {/* Add button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={onAddNode}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500 transition-all duration-200 hover:bg-white/[0.04] hover:text-slate-300 hover:shadow-[0_0_10px_rgba(0,243,255,0.06)]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={8}
            className="border border-white/10 bg-black/80 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl text-slate-300"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider">
              New Node
            </span>
            <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[9px] text-slate-500">
              ⌘N
            </kbd>
          </TooltipContent>
        </Tooltip>

        {activeView === 'brain' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 font-mono text-[8px] uppercase tracking-[0.2em] text-purple-400 transition-all duration-200 hover:bg-purple-500/10 hover:shadow-[0_0_10px_rgba(168,85,247,0.1)] disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-400" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Analyze</span>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              className="border border-white/10 bg-black/80 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl text-slate-300"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider">
                AI Analyze
              </span>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Collapse button */}
        <div className="mx-0.5 h-4 w-px bg-white/5" />
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => setIsExpanded(false)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center rounded-full px-2 py-2 text-slate-600 transition-all duration-200 hover:bg-white/[0.04] hover:text-slate-400"
              title="Hide toolbar (Tab)"
            >
              <ChevronsDown className="h-3.5 w-3.5" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={8}
            className="border border-white/10 bg-black/80 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl text-slate-300"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider">
              Hide Toolbar
            </span>
            <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[9px] text-slate-500">
              Tab
            </kbd>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </div>
  )
}