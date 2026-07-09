// ─── Second Brain — Unified Type Definitions ─────────────────────────

// ─── Knowledge Node ──────────────────────────────────────────────────
export interface KnowledgeNode {
  id: string
  title: string
  content: string
  category: string
  source: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  tags: Tag[]
  connectionCount?: number
}

export interface Tag {
  id?: string
  name: string
}

// ─── Node Connection ─────────────────────────────────────────────────
export interface NodeConnection {
  id: string
  fromNodeId: string
  toNodeId: string
  strength: number
  label: string
  createdAt: string
}

// ─── Stats ───────────────────────────────────────────────────────────
export interface Stats {
  nodeCount: number
  connectionCount: number
  analysisCount: number
  totalCharacters: number
  pinnedCount: number
  tagCount: number
  categories: { name: string; count: number }[]
  recentLogs: { id: string; type: string; summary: string; createdAt: string }[]
}

// ─── Activity Log ────────────────────────────────────────────────────
export interface ActivityLogItem {
  id: string
  action: string
  detail: string
  category: string
  createdAt: string
}

// ─── Settings ────────────────────────────────────────────────────────
export type SettingsMap = Record<string, { value: string; category: string }>

// ─── Analysis ────────────────────────────────────────────────────────
export interface Analysis {
  summary: string
  insights: string[]
  suggestions: string[]
  patterns: string
}

// ─── Scene Node (3D visualization) ───────────────────────────────────
export interface SceneNode {
  id: string
  title: string
  category: string
  tags: string[]
}

// ─── Linked Node Info ────────────────────────────────────────────────
export interface LinkedNodeInfo {
  id: string
  title: string
  category: string
  strength?: number
  label?: string
}

// ─── Chat Message ────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'architect'
  content: string
  timestamp: string
}

// ─── Category Colors ─────────────────────────────────────────────────
export const CATEGORY_COLORS: Record<string, string> = {
  strategy: '#ffb700',
  operations: '#00d4ff',
  research: '#9d4edd',
  systems: '#10b981',
  design: '#ff3c8e',
  general: '#94a3b8',
  compacted: '#38bdf8',
}

export const VALID_CATEGORIES = [
  'strategy',
  'operations',
  'research',
  'systems',
  'design',
  'general',
] as const

export type Category = (typeof VALID_CATEGORIES)[number]