'use client'

import { motion } from 'framer-motion'
import { Plus, Sparkles, Download, Activity, TrendingUp, Brain } from 'lucide-react'
import type { Stats } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'

const CAT_COLORS: Record<string, string> = {
  strategy: '#ffb700',
  operations: '#00d4ff',
  research: '#9d4edd',
  systems: '#10b981',
  design: '#ff3c8e',
  general: '#94a3b8',
  compacted: '#38bdf8',
}

const LOG_TYPE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  create: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-l-emerald-400' },
  update: { text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-l-cyan-400' },
  delete: { text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-l-rose-400' },
  analysis: { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-l-purple-400' },
  seed: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-l-amber-400' },
  export: { text: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-l-sky-400' },
  compact: { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-l-orange-400' },
  default: { text: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-l-slate-400' },
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

/* ─── Sparkline Component ─────────────────────────────────────── */
function Sparkline({
  logs,
  width = 280,
  height = 36,
}: {
  logs: Stats['recentLogs']
  width?: number
  height?: number
}) {
  // Bucket logs by hour (last 24h) and count activity per bucket
  const now = Date.now()
  const bucketCount = 24
  const bucketSize = (24 * 60 * 60 * 1000) / bucketCount
  const buckets = new Array(bucketCount).fill(0)

  for (const log of logs) {
    const age = now - new Date(log.createdAt).getTime()
    const bucketIdx = bucketCount - 1 - Math.floor(age / bucketSize)
    if (bucketIdx >= 0 && bucketIdx < bucketCount) {
      buckets[bucketIdx]++
    }
  }

  const maxVal = Math.max(...buckets, 1)
  const padding = 2
  const chartW = width - padding * 2
  const chartH = height - padding * 2

  const points = buckets.map((v, i) => {
    const x = padding + (i / (bucketCount - 1)) * chartW
    const y = padding + chartH - (v / maxVal) * chartH
    return `${x},${y}`
  })

  const pathD = points.join(' L ')
  // Area fill path
  const areaD = `M ${padding},${height - padding} L ${pathD} L ${width - padding},${height - padding} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      {/* Area gradient */}
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      {/* Line */}
      <motion.path
        d={`M ${pathD}`}
        fill="none"
        stroke="#00d4ff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
      />
      {/* End dot */}
      {points.length > 0 && (() => {
        const last = points[points.length - 1]
        const [lx, ly] = last.split(',').map(Number)
        return (
          <motion.circle
            cx={lx}
            cy={ly}
            r="2.5"
            fill="#00d4ff"
            initial={{ r: 0, opacity: 0 }}
            animate={{ r: 2.5, opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.4 }}
          />
        )
      })()}
    </svg>
  )
}

/* ─── Donut Chart Component ───────────────────────────────────── */
function DonutChart({
  categories,
  size = 100,
  strokeWidth = 14,
}: {
  categories: { name: string; count: number }[]
  size?: number
  strokeWidth?: number
}) {
  const total = categories.reduce((s, c) => s + c.count, 0)
  if (total === 0) return null

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block mx-auto">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={strokeWidth}
      />
      {categories.map((cat, i) => {
        const fraction = cat.count / total
        const dashLength = fraction * circumference
        const gap = circumference - dashLength
        const color = CAT_COLORS[cat.name] || CAT_COLORS.general
        const cumulativeOffset = categories.slice(0, i).reduce((sum, c) => sum + (c.count / total) * circumference, 0)

        return (
          <motion.circle
            key={cat.name}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={`${dashLength} ${gap}`}
            strokeDashoffset={-cumulativeOffset}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          >
            <title>{`${cat.name}: ${cat.count} (${Math.round(fraction * 100)}%)`}</title>
          </motion.circle>
        )
      })}
      {/* Center text */}
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        className="fill-slate-300"
        style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700 }}
      >
        {total}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 10}
        textAnchor="middle"
        className="fill-slate-600"
        style={{ fontSize: '7px', fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase' }}
      >
        nodes
      </text>
    </svg>
  )
}

/* ─── Knowledge Growth Indicator ──────────────────────────────── */
function KnowledgeGrowth({ logs }: { logs: Stats['recentLogs'] }) {
  // Count creates in last 7 days vs prior 7 days
  const now = Date.now()
  const week = 7 * 24 * 60 * 60 * 1000
  const thisWeek = logs.filter(
    (l) => l.type === 'create' && now - new Date(l.createdAt).getTime() < week
  ).length
  const priorWeek = logs.filter(
    (l) =>
      l.type === 'create' &&
      now - new Date(l.createdAt).getTime() >= week &&
      now - new Date(l.createdAt).getTime() < week * 2
  ).length

  const growth = priorWeek > 0 ? ((thisWeek - priorWeek) / priorWeek) * 100 : thisWeek > 0 ? 100 : 0
  const isGrowing = growth >= 0

  return (
    <motion.div
      variants={item}
      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
    >
      <div
        className={`flex items-center justify-center rounded-md p-2 ${
          isGrowing ? 'bg-emerald-400/10' : 'bg-rose-400/10'
        }`}
      >
        <TrendingUp
          className={`h-4 w-4 ${isGrowing ? 'text-emerald-400' : 'text-rose-400'}`}
          style={!isGrowing ? { transform: 'scaleY(-1)' } : undefined}
        />
      </div>
      <div className="flex-1">
        <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500 mb-0.5">
          Knowledge Growth
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className={`font-mono text-sm font-bold ${isGrowing ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isGrowing ? '+' : ''}{growth === 0 && thisWeek === 0 ? '—' : `${Math.round(growth)}%`}
          </span>
          <span className="font-mono text-[9px] text-slate-600">
            {thisWeek} nodes this week
          </span>
        </div>
      </div>
    </motion.div>
  )
}

interface DashboardPanelProps {
  stats: Stats | null
  onClose: () => void
  onNavigate: (view: string) => void
  onAnalyze?: () => void
  onExport?: () => void
  onCategoryClick?: (category: string) => void
  onAddNode?: () => void
  nodeCount?: number
  onOpenBrain?: () => void
}

export default function DashboardPanel({
  stats,
  onClose,
  onNavigate,
  onAnalyze,
  onExport,
  onCategoryClick,
  onAddNode,
  nodeCount = 0,
  onOpenBrain,
}: DashboardPanelProps) {
  const maxCatCount = stats
    ? Math.max(...stats.categories.map((c) => c.count), 1)
    : 1

  const statCards = stats
    ? [
        {
          label: 'Total Nodes',
          value: stats.nodeCount,
          color: 'text-cyan-400',
          borderColor: 'hover:border-cyan-500/20',
          glowColor: 'shadow-[0_0_20px_rgba(0,212,255,0.08)]',
          gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
          trend: '▲',
          trendColor: 'text-cyan-400/60',
        },
        {
          label: 'Knowledge Size',
          value: `${(stats.totalCharacters / 1024).toFixed(1)} KB`,
          color: 'text-purple-400',
          borderColor: 'hover:border-purple-500/20',
          glowColor: 'shadow-[0_0_20px_rgba(157,78,221,0.08)]',
          gradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
          trend: '▲',
          trendColor: 'text-purple-400/60',
        },
        {
          label: 'Analyses Run',
          value: stats.analysisCount,
          color: 'text-rose-400',
          borderColor: 'hover:border-rose-500/20',
          glowColor: 'shadow-[0_0_20px_rgba(255,60,142,0.08)]',
          gradient: 'from-rose-500/20 via-rose-500/5 to-transparent',
          trend: stats.analysisCount > 0 ? '▲' : '—',
          trendColor: 'text-rose-400/60',
        },
        {
          label: 'Pinned Nodes',
          value: stats.pinnedCount,
          color: 'text-amber-400',
          borderColor: 'hover:border-amber-500/20',
          glowColor: 'shadow-[0_0_20px_rgba(255,183,0,0.08)]',
          gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
          trend: stats.pinnedCount > 0 ? '●' : '—',
          trendColor: 'text-amber-400/60',
        },
      ]
    : []

  const quickActions = [
    {
      label: 'New Node',
      icon: <Plus className="h-3.5 w-3.5" />,
      action: onAddNode || onClose,
    },
    {
      label: 'Analyze All',
      icon: <Sparkles className="h-3.5 w-3.5" />,
      action: onAnalyze,
    },
    {
      label: 'Export Data',
      icon: <Download className="h-3.5 w-3.5" />,
      action: onExport,
    },
    {
      label: 'View Activity',
      icon: <Activity className="h-3.5 w-3.5" />,
      action: () => onNavigate('activity'),
    },
    {
      label: 'Second Brain',
      icon: <Brain className="h-3.5 w-3.5" />,
      action: onOpenBrain,
    },
  ]

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
        className="relative mx-4 grid h-[85vh] max-w-4xl w-full grid-cols-[1fr_200px] gap-4 rounded-xl border border-white/5 bg-black/50 backdrop-blur-xl overflow-hidden"
      >
        {/* Subtle grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Main content */}
        <div className="relative flex flex-col gap-4 overflow-y-auto p-5 pr-3 scrollbar-thin">
          {/* Title */}
          <motion.div variants={item}>
            <h2 className="font-mono text-sm font-semibold tracking-[0.1em] text-slate-300 uppercase">
              Dashboard
            </h2>
          </motion.div>

          {/* Sparkline Activity Graph */}
          {stats && stats.recentLogs.length > 0 && (
            <motion.div
              variants={item}
              className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                  Activity (24h)
                </p>
                <span className="font-mono text-[8px] text-slate-600">
                  {stats.recentLogs.length} events
                </span>
              </div>
              <Sparkline logs={stats.recentLogs} width={500} height={40} />
            </motion.div>
          )}

          {/* Stat cards with animated gradient border glow on hover */}
          <motion.div variants={item} className="grid grid-cols-2 gap-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`group relative rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-all duration-500 ${card.borderColor} ${card.glowColor} hover:bg-white/[0.04] overflow-hidden`}
              >
                {/* Animated gradient glow border on hover */}
                <div className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100 animate-gradient-border"
                  style={{
                    background: `linear-gradient(135deg, transparent 40%, ${card.gradient.includes('cyan') ? 'rgba(0,212,255,0.15)' : card.gradient.includes('purple') ? 'rgba(157,78,221,0.15)' : card.gradient.includes('rose') ? 'rgba(255,60,142,0.15)' : 'rgba(255,183,0,0.15)'}, transparent 60%)`,
                    backgroundSize: '200% 200%',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    padding: '1px',
                  }}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative">
                  <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    {card.label}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <p className={`font-mono text-lg font-bold ${card.color}`}>
                      {card.value}
                    </p>
                    <span className={`font-mono text-[10px] ${card.trendColor}`}>
                      {card.trend}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Knowledge Growth Indicator */}
          {stats && stats.recentLogs.length > 0 && (
            <KnowledgeGrowth logs={stats.recentLogs} />
          )}

          {/* Category Distribution — Donut Chart + Legend */}
          <motion.div variants={item} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
              Category Distribution
            </p>
            <div className="flex items-center gap-6">
              {/* Donut chart */}
              <div className="shrink-0">
                {stats && <DonutChart categories={stats.categories} size={110} strokeWidth={16} />}
              </div>
              {/* Legend with bars */}
              <div className="flex-1 flex flex-col gap-1.5">
                {stats?.categories.map((cat) => {
                  const color = CAT_COLORS[cat.name] || CAT_COLORS.general
                  const width = (cat.count / maxCatCount) * 100
                  return (
                    <button
                      key={cat.name}
                      onClick={() => onCategoryClick?.(cat.name)}
                      className="group/bar flex items-center gap-2 w-full text-left transition-opacity hover:opacity-80"
                      title={`Filter by ${cat.name}`}
                    >
                      <span className="w-16 text-right font-mono text-[8px] uppercase tracking-[0.15em] text-slate-500 group-hover/bar:text-slate-400 transition-colors">
                        {cat.name}
                      </span>
                      <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
                          className="h-full rounded-full group-hover/bar:brightness-125 transition-all"
                          style={{ backgroundColor: color, opacity: 0.7 }}
                        />
                      </div>
                      <span className="w-6 text-right font-mono text-[8px] text-slate-500 group-hover/bar:text-slate-400 transition-colors">
                        {cat.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item} className="grid grid-cols-2 gap-2">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action || undefined}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.98] hover:border-cyan-500/15 hover:bg-cyan-500/5 hover:scale-[1.02]"
              >
                <span className="text-slate-400">{qa.icon}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">
                  {qa.label}
                </span>
              </button>
            ))}
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={item} className="flex-1 min-h-0 rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
              Recent Activity
            </p>
            <ScrollArea className="h-[120px]">
              <div className="flex flex-col gap-1.5">
                {stats?.recentLogs.length === 0 && (
                  <p className="font-mono text-[10px] text-slate-600">No recent activity</p>
                )}
                {stats?.recentLogs.map((log) => {
                  const colors = LOG_TYPE_COLORS[log.type] || LOG_TYPE_COLORS.default
                  const time = new Date(log.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return (
                    <div
                      key={log.id}
                      className={`flex items-center gap-2 rounded-r-sm border-l-2 ${colors.border} bg-white/[0.01] px-2 py-1.5 transition-colors hover:bg-white/[0.03]`}
                    >
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider ${colors.text} ${colors.bg}`}>
                        {log.type}
                      </span>
                      <span className="flex-1 truncate font-mono text-[10px] text-slate-400">
                        {log.summary}
                      </span>
                      <span className="shrink-0 font-mono text-[8px] text-slate-600">{time}</span>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </motion.div>
        </div>

        {/* System Health sidebar */}
        <div className="relative flex flex-col gap-3 border-l border-white/5 p-4">
          <motion.div variants={item}>
            <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
              System Health
            </p>
          </motion.div>
          {[
            { label: 'Status', value: 'Online', color: 'text-emerald-400' },
            { label: 'Database', value: 'Connected', color: 'text-emerald-400' },
            { label: 'Embeddings', value: nodeCount > 0 ? 'Ready' : 'Pending', color: nodeCount > 0 ? 'text-emerald-400' : 'text-amber-400' },
            { label: 'Graph', value: 'Active', color: 'text-emerald-400' },
          ].map((sys) => (
            <motion.div
              key={sys.label}
              variants={item}
              className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5"
            >
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
                {sys.label}
              </span>
              <span className={`flex items-center gap-1.5 font-mono text-[10px] ${sys.color}`}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`absolute inset-0 rounded-full bg-current animate-ping opacity-40`} />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-current" />
                </span>
                {sys.value}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}