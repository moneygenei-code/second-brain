'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

type ViewType = 'brain' | 'dashboard' | 'activity' | 'settings' | 'integrations' | 'secondbrain'

const CAT_COLORS: Record<string, string> = {
  strategy: '#ffb700',
  operations: '#00d4ff',
  research: '#9d4edd',
  systems: '#10b981',
  design: '#ff3c8e',
  general: '#94a3b8',
  compacted: '#38bdf8',
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (view: ViewType) => void
  onAction: (action: string) => void
  onNodeSelect: (nodeId: string) => void
  nodes: Array<{
    id: string
    title: string
    category: string
    tags: Array<{ name: string } | string>
  }>
  nodeCount: number
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 1) + '…'
}

function resolveTagName(tag: { name: string } | string): string {
  return typeof tag === 'string' ? tag : tag.name
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onAction,
  onNodeSelect,
  nodes,
  nodeCount,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')

  const isSearching = search.length >= 2

  const filteredNodes = useMemo(() => {
    if (!isSearching || !nodes || nodes.length === 0) return []

    const q = search.toLowerCase()

    const matches = nodes.filter((node) => {
      // Title match
      if (node.title.toLowerCase().includes(q)) return true

      // Tag match
      if (node.tags?.some((tag) => resolveTagName(tag).toLowerCase().includes(q))) {
        return true
      }

      return false
    })

    return matches.slice(0, 8)
  }, [search, nodes, isSearching])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (isOpen) onClose()
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [isOpen, onClose])

  const run = (fn: () => void) => {
    fn()
    onClose()
  }

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setSearch('')
          onClose()
        }
      }}
      className="border-white/10 bg-[#0a0a12]/95 backdrop-blur-xl [&_[cmdk-input]]:font-mono [&_[cmdk-input]]:text-xs [&_[cmdk-input]]:text-slate-300 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[8px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-item]]:font-mono [&_[cmdk-item]]:text-xs"
    >
      <div className="relative">
        <CommandInput
          placeholder="Search nodes, type a command..."
          value={search}
          onValueChange={setSearch}
          className="animate-focus-ring"
        />
        {/* Results count badge */}
        {isSearching && filteredNodes.length > 0 && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] text-cyan-400 tabular-nums">
            {filteredNodes.length} result{filteredNodes.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Keyboard navigation hints */}
      <div className="flex items-center justify-center gap-3 border-b border-white/5 px-3 py-1.5">
        <div className="flex items-center gap-1 text-[9px] text-slate-600">
          <kbd className="inline-flex items-center rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] text-slate-500">↑↓</kbd>
          <span>navigate</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-slate-600">
          <kbd className="inline-flex items-center rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] text-slate-500">↵</kbd>
          <span>select</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-slate-600">
          <kbd className="inline-flex items-center rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] text-slate-500">esc</kbd>
          <span>close</span>
        </div>
      </div>

      <CommandList className="max-h-[300px]">
        <CommandEmpty>
          {isSearching ? (
            <div className="px-2 py-6 text-center">
              <div className="mb-2 text-slate-600">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-slate-700">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                  <path d="M8 11h6" />
                </svg>
              </div>
              <p className="font-mono text-[11px] text-slate-500">No nodes match &ldquo;{search}&rdquo;</p>
              <p className="mt-1 font-mono text-[9px] text-slate-700">Try different keywords or check spelling</p>
            </div>
          ) : (
            <div className="px-2 py-6 text-center">
              <p className="font-mono text-[11px] text-slate-500">No results found.</p>
              <p className="mt-1 font-mono text-[9px] text-slate-700">Type at least 2 characters to search nodes</p>
            </div>
          )}
        </CommandEmpty>

        {/* Live node search results */}
        {isSearching && (
          <CommandGroup heading="Knowledge Nodes">
            {filteredNodes.length > 0 ? (
              filteredNodes.map((node, idx) => {
                const color = CAT_COLORS[node.category] ?? CAT_COLORS.general
                return (
                  <CommandItem
                    key={node.id}
                    value={`${node.title} ${node.category} ${(node.tags || []).map(t => typeof t === 'string' ? t : t.name).join(' ')}`}
                    onSelect={() => {
                      onNodeSelect(node.id)
                      onClose()
                    }}
                    className="group/node gap-2.5"
                  >
                    {/* Keyboard shortcut index hint */}
                    <span className="shrink-0 w-4 text-center font-mono text-[8px] text-slate-700 tabular-nums">
                      {idx + 1}
                    </span>
                    {/* Category color dot */}
                    <span
                      className="shrink-0 rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        minWidth: 6,
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}66`,
                      }}
                    />
                    {/* Title */}
                    <span className="flex-1 truncate text-slate-200">
                      {truncate(node.title, 40)}
                    </span>
                    {/* Category badge */}
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                      style={{
                        color,
                        backgroundColor: `${color}18`,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {node.category}
                    </span>
                  </CommandItem>
                )
              })
            ) : null}
          </CommandGroup>
        )}

        {/* Navigation group — only when NOT searching */}
        {!isSearching && (
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => run(() => onNavigate('brain'))}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-cyan-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              Go to Brain
            </CommandItem>
            <CommandItem onSelect={() => run(() => onNavigate('dashboard'))}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-purple-400"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Go to Dashboard
            </CommandItem>
            <CommandItem onSelect={() => run(() => onNavigate('activity'))}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-emerald-400"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Go to Activity
            </CommandItem>
            <CommandItem onSelect={() => run(() => onNavigate('settings'))}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-amber-400"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Go to Settings
            </CommandItem>
            <CommandItem onSelect={() => run(() => onNavigate('secondbrain'))}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-purple-400"
              >
                <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20h6v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z" />
                <path d="M9 20h6" />
                <path d="M10 22h4" />
              </svg>
              Go to Second Brain
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => onAction('add-node'))}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 text-slate-400"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add Node
          </CommandItem>
          <CommandItem onSelect={() => run(() => onAction('analyze'))}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 text-slate-400"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            Analyze Knowledge
          </CommandItem>
          <CommandItem onSelect={() => run(() => onAction('compact'))}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 text-slate-400"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            Compact Nodes
          </CommandItem>
          <CommandItem onSelect={() => run(() => onAction('export'))}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 text-slate-400"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Data
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="AI & View">
          <CommandItem onSelect={() => run(() => onAction('toggle-chat'))}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 text-purple-400"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Toggle Architect Chat
          </CommandItem>
          <CommandItem onSelect={() => run(() => onAction('toggle-list'))}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 text-cyan-400"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Toggle List / 3D View
          </CommandItem>
        </CommandGroup>

        {/* Static "Knowledge Base" group — only when NOT searching */}
        {!isSearching && nodeCount > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Knowledge Base (${nodeCount} nodes)`}>
              <CommandItem onSelect={() => run(() => onAction('search'))}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 text-cyan-400"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Search Nodes...
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Custom styles for node result hover glow */}
      <style jsx global>{`
        [cmdk-item].group\\/node[data-selected='true'] {
          background: rgba(255, 255, 255, 0.06) !important;
          box-shadow: inset 0 0 0 1px rgba(0, 243, 255, 0.12),
                      0 0 16px rgba(0, 243, 255, 0.05);
        }
        [cmdk-item].group\\/node:hover {
          background: rgba(255, 255, 255, 0.04) !important;
        }
        [cmdk-item][data-selected='true'] {
          background: rgba(255, 255, 255, 0.06) !important;
        }
      `}</style>
    </CommandDialog>
  )
}