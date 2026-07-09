'use client'

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FileDropZoneProps {
  isDragging: boolean
  onFileDrop: (file: File) => void
  onDragOver: () => void
  onDragLeave: () => void
}

export default function FileDropZone({
  isDragging,
  onFileDrop,
  onDragOver,
  onDragLeave,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDragOver()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDragLeave()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDragLeave()
    const file = e.dataTransfer.files[0]
    if (file) onFileDrop(file)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileDrop(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.json,.csv,.log"
        onChange={handleInputChange}
      />

      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center bg-black/60 backdrop-blur-xl"
          >
            {/* Animated dashed border container */}
            <div className="relative flex flex-col items-center justify-center rounded-2xl p-12">
              {/* Rotating gradient border via conic-gradient */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-2xl opacity-40"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0%, #06b6d4 25%, transparent 50%, #8b5cf6 75%, transparent 100%)',
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMask:
                    'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  maskComposite: 'xor',
                  WebkitMaskComposite: 'xor',
                  padding: '2px',
                }}
              />

              {/* Static dashed border */}
              <div
                className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/10"
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                {/* Upload cloud icon */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-cyan-400/80"
                >
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m16 16-4-4-4 4" />
                </svg>

                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-300">
                  Drop to import knowledge
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
                  .txt .md .json .csv .log
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}