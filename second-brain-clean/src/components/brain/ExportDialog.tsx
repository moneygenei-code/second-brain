'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileJson, FileSpreadsheet, Download, X, FolderArchive, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

const FORMATS = [
  {
    id: 'json' as const,
    label: 'JSON',
    description: 'Full backup with metadata, connections & tags. Re-importable.',
    icon: <FileJson className="h-5 w-5" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    hoverGlow: 'hover:shadow-[0_0_20px_rgba(0,212,255,0.08)]',
  },
  {
    id: 'csv' as const,
    label: 'CSV',
    description: 'Spreadsheet-compatible. Nodes and connections as rows.',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    hoverGlow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]',
  },
]

export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [isDownloadingSource, setIsDownloadingSource] = useState(false)

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/export?format=${format}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `second-brain-export-${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format.toUpperCase()}`)
      onClose()
    } catch {
      toast.error('Export failed')
    }
  }

  const handleDownloadSource = async () => {
    setIsDownloadingSource(true)
    try {
      const res = await fetch('/api/export/project')
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `second-brain-source-${new Date().toISOString().split('T')[0]}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Source code downloaded')
      onClose()
    } catch {
      toast.error('Failed to download source')
    } finally {
      setIsDownloadingSource(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 w-full max-w-md rounded-xl border border-white/[0.06] bg-[#0a0a0f]/95 p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            {/* Grid pattern overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.015]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Header */}
            <div className="relative mb-5">
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Download className="h-4 w-4 text-cyan-400" />
                </div>
                <h2 className="font-mono text-sm font-semibold tracking-[0.1em] uppercase text-slate-200">
                  Export Data
                </h2>
              </div>
              <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                Choose a format to export your knowledge base. All nodes, connections, and metadata will be included.
              </p>
            </div>

            {/* Format cards */}
            <div className="relative flex flex-col gap-3">
              {FORMATS.map((fmt) => (
                <motion.button
                  key={fmt.id}
                  onClick={() => handleExport(fmt.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group flex items-center gap-4 rounded-lg border ${fmt.borderColor} ${fmt.bgColor} p-4 text-left transition-all duration-200 ${fmt.hoverGlow} hover:border-opacity-40`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${fmt.borderColor} ${fmt.bgColor}`}>
                    <span className={fmt.color}>{fmt.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-semibold uppercase tracking-wider ${fmt.color}`}>
                        {fmt.label}
                      </span>
                      <span className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                        .{fmt.id}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] text-slate-500 leading-relaxed">
                      {fmt.description}
                    </p>
                  </div>
                  <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <Download className={`h-4 w-4 ${fmt.color}`} />
                  </div>
                </motion.button>
              ))}

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-white/5" />
                <span className="font-mono text-[7px] uppercase tracking-[0.25em] text-slate-600">or</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* Download Source Code */}
              <motion.button
                onClick={handleDownloadSource}
                disabled={isDownloadingSource}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-left transition-all duration-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)] hover:border-amber-500/40 disabled:opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
                  {isDownloadingSource
                    ? <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                    : <FolderArchive className="h-5 w-5 text-amber-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Source Code
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                      .zip
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] text-slate-500 leading-relaxed">
                    Clean project files only — no DB, no logs, no chat data.
                  </p>
                </div>
                <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                  <Download className="h-4 w-4 text-amber-400" />
                </div>
              </motion.button>
            </div>

            {/* Footer */}
            <div className="relative mt-5 pt-4 border-t border-white/5">
              <p className="font-mono text-[8px] text-slate-600 text-center tracking-wider uppercase">
                Data stays local — nothing is sent to external servers
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}