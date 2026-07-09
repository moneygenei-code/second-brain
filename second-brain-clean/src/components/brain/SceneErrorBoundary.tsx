'use client'

import { ErrorBoundary as ReactErrorBoundary, type ErrorBoundaryPropsWithComponent, type FallbackProps } from 'react-error-boundary'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Monitor } from 'lucide-react'

function ErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const isChunkError = errorMessage.includes('chunk') || errorMessage.includes('Loading')

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#050509]">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/[0.06] bg-black/60 px-10 py-12 backdrop-blur-2xl shadow-2xl shadow-black/40">
        {/* Animated error icon */}
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-rose-500/20 animate-pulse" />
          <div className="absolute inset-1 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-rose-400" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
            {isChunkError ? 'Loading Error' : 'Scene Error'}
          </h3>
          <p className="max-w-xs text-[11px] leading-relaxed text-slate-500">
            {isChunkError
              ? 'A required module failed to load. This is usually resolved by refreshing.'
              : 'The 3D visualization encountered an error. This may be due to insufficient GPU resources or a browser compatibility issue.'}
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <pre className="max-w-sm max-h-24 overflow-auto rounded-lg border border-white/[0.04] bg-black/60 p-3 font-mono text-[9px] leading-tight text-rose-400/70">
            {errorMessage ?? 'Unknown error'}
          </pre>
        )}

        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetErrorBoundary}
            className="gap-2 border border-cyan-500/20 bg-cyan-500/10 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all duration-200"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="gap-2 border border-white/[0.06] bg-white/[0.03] font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400 hover:bg-white/[0.06] hover:text-slate-300 transition-all duration-200"
          >
            <Monitor className="h-3 w-3" />
            Reload
          </Button>
        </div>
      </div>
    </div>
  )
}

interface SceneErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export default function SceneErrorBoundary({
  children,
  fallback,
}: SceneErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback ? () => <>{fallback}</> : ErrorFallback}
      onReset={() => {
        // Don't force a full reload on retry — just reset the boundary
        // The Scene component will re-render with fresh state
      }}
    >
      {children}
    </ReactErrorBoundary>
  )
}