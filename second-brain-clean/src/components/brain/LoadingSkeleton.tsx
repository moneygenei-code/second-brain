'use client'

import { motion } from 'framer-motion'

export default function LoadingSkeleton() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050509]">
      {/* Pulsing rings */}
      <div className="relative mb-8 h-24 w-24">
        <motion.div
          className="absolute inset-0 rounded-full border border-cyan-500/20"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-3 rounded-full border border-purple-500/20"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
        <motion.div
          className="absolute inset-6 rounded-full border border-cyan-500/10"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        />
        <motion.div
          className="absolute inset-0 h-1 w-1 rounded-full bg-cyan-400"
          animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Text */}
      <motion.p
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        Loading neural mesh...
      </motion.p>
    </div>
  )
}