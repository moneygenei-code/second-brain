'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import type {
  KnowledgeNode,
  Stats,
  ActivityLogItem,
  Analysis,
  SettingsMap,
  SceneNode,
  LinkedNodeInfo,
  NodeConnection,
} from '@/lib/types'
import { CATEGORY_COLORS } from '@/lib/types'
import Launcher from '@/components/brain/Launcher'
import FloatingToolbar from '@/components/brain/FloatingToolbar'
import FloatingStats from '@/components/brain/FloatingStats'
import DetailSlidePanel from '@/components/brain/DetailSlidePanel'
import AnalysisOverlay from '@/components/brain/AnalysisOverlay'
import DashboardPanel from '@/components/brain/DashboardPanel'
import ActivityPanel from '@/components/brain/ActivityPanel'
import SettingsPanel from '@/components/brain/SettingsPanel'
import IntegrationsPanel from '@/components/brain/IntegrationsPanel'
import ArchitectChat from '@/components/brain/ArchitectChat'
import CommandPalette from '@/components/brain/CommandPalette'
import SecondBrainPanel from '@/components/brain/SecondBrainPanel'
import AddNode from '@/components/brain/AddNode'
import EditNode from '@/components/brain/EditNode'
import LoadingSkeleton from '@/components/brain/LoadingSkeleton'
import SceneErrorBoundary from '@/components/brain/SceneErrorBoundary'
import CategoryFilterChips from '@/components/brain/CategoryFilterChips'
import NodeListView from '@/components/brain/NodeListView'
import FileDropZone from '@/components/brain/FileDropZone'
import ConnectionManager from '@/components/brain/ConnectionManager'
import ConnectionStrengthPanel from '@/components/brain/ConnectionStrengthPanel'
import KeyboardShortcuts from '@/components/brain/KeyboardShortcuts'
import ExportDialog from '@/components/brain/ExportDialog'
import CompactDialog from '@/components/brain/CompactDialog'
import SceneLegend from '@/components/brain/SceneLegend'
import { useBookmarks } from '@/components/brain/useBookmarks'

const Scene = dynamic(() => import('@/components/brain/Scene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#050509]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-purple-500/30 animate-ping [animation-delay:0.3s]" />
          <div className="absolute inset-4 rounded-full border-2 border-rose-500/30 animate-ping [animation-delay:0.6s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>
        <p className="text-cyan-400/60 text-xs font-mono tracking-[0.3em] uppercase animate-pulse">
          Initializing Neural Mesh
        </p>
      </div>
    </div>
  ),
})

type ViewType = 'brain' | 'dashboard' | 'activity' | 'settings' | 'integrations' | 'secondbrain'

/* ─── Query Keys ─── */
const queryKeys = {
  stats: ['stats'] as const,
  nodes: ['nodes'] as const,
  connections: (nodeId: string) => ['connections', nodeId] as const,
  activity: (offset: number) => ['activity', offset] as const,
  settings: ['settings'] as const,
}

/* ─── Fetchers ─── */
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Request failed')
  return data
}

/* ─── Helpers ─── */
async function logActivity(action: string, detail: string, category = 'general') {
  try {
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, detail, category }),
    })
  } catch { /* silent */ }
}

/* ═══════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const queryClient = useQueryClient()

  // ─── Core State ───
  const [launched, setLaunched] = useState(false)
  const [activeView, setActiveView] = useState<ViewType>('brain')
  const [isMobile, setIsMobile] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [pendingImportTitle, setPendingImportTitle] = useState<string>('')
  const [pendingImportContent, setPendingImportContent] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isAutoTagging, setIsAutoTagging] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [activityPage, setActivityPage] = useState(0)
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])
  const [activityTotal, setActivityTotal] = useState(0)

  // ─── NEW: Category Filter ───
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())

  // ─── NEW: List View ───
  const [isListView, setIsListView] = useState(false)
  const [listSearchQuery, setListSearchQuery] = useState('')

  // ─── NEW: File Drag & Drop ───
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  // ─── NEW: 3D Hover Tooltip ───
  const [hoveredNode, setHoveredNode] = useState<{ id: string; title: string; category: string; x: number; y: number } | null>(null)

  // ─── NEW: Keyboard Shortcuts ───
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)

  // ─── NEW: Connection Strength Panel ───
  const [isConnPanelOpen, setIsConnPanelOpen] = useState(false)

  // ─── NEW: Export Dialog ───
  const [isExportOpen, setIsExportOpen] = useState(false)

  // ─── NEW: Compact Dialog ───
  const [isCompactOpen, setIsCompactOpen] = useState(false)

  // ─── NEW: Bookmarks ───
  const { bookmarkedIds, toggleBookmark, isBookmarked } = useBookmarks()
  const [isBookmarkedFilter, setIsBookmarkedFilter] = useState(false)

  // ─── Mobile Detection ───
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* ══════════════ TanStack Queries ══════════════ */

  // Stats — polls every 10s
  const { data: statsData } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => fetchJSON<{ success: boolean; stats: Stats }>('/api/stats'),
    refetchInterval: 10000,
    staleTime: 8000,
  })
  const stats = statsData?.stats ?? null

  // Nodes — polls every 10s
  const { data: nodesData, isLoading: nodesLoading } = useQuery({
    queryKey: queryKeys.nodes,
    queryFn: () => fetchJSON<{ success: boolean; nodes: KnowledgeNode[] }>('/api/nodes'),
    refetchInterval: 10000,
    staleTime: 8000,
  })
  const allNodes = nodesData?.nodes ?? []

  // Settings — refetch on demand
  const { data: settingsData } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJSON<{ success: boolean; settings: SettingsMap }>('/api/settings'),
    staleTime: 60000,
  })
  const settings = settingsData?.settings ?? null

  // NEW: Connections for selected node
  const { data: connectionsData } = useQuery({
    queryKey: selectedNodeId ? queryKeys.connections(selectedNodeId) : ['connections', 'none'],
    queryFn: () => fetchJSON<{
      success: boolean
      connections: { outgoing: NodeConnection[]; incoming: NodeConnection[] }
    }>(`/api/nodes/${selectedNodeId}/connections`),
    enabled: !!selectedNodeId,
    staleTime: 10000,
  })
  const nodeConnections = useMemo(() => {
    if (!connectionsData) return { list: [], connectedNodeIds: new Set<string>() }
    const all = [...connectionsData.connections.outgoing, ...connectionsData.connections.incoming]
    const ids = new Set(all.map((c) => c.fromNodeId === selectedNodeId ? c.toNodeId : c.fromNodeId))
    return { list: all, connectedNodeIds: ids }
  }, [connectionsData, selectedNodeId])

  // Unified connections (DB + tag-computed) for the 3D scene
  const { data: unifiedConnsData } = useQuery({
    queryKey: ['unified-connections'],
    queryFn: () => fetchJSON<{ success: boolean; unifiedConnections: Array<{ from: string; to: string; strength: number; source: string }> }>('/api/connections?unified=true'),
    staleTime: 15000,
  })
  const dbSceneConnections = useMemo(() =>
    (unifiedConnsData?.unifiedConnections ?? []).map(c => ({ from: c.from, to: c.to, strength: c.strength, source: c.source })),
    [unifiedConnsData]
  )

  /* ══════════════ Derived State ══════════════ */

  const selectedNode = useMemo(
    () => allNodes.find((n) => n.id === selectedNodeId) ?? null,
    [allNodes, selectedNodeId]
  )

  // Filter scene nodes by active categories or bookmark
  const filteredSceneNodes: SceneNode[] = useMemo(() => {
    let base = allNodes.map((n) => ({
      id: n.id,
      title: n.title,
      category: n.category,
      tags: n.tags.map(t => typeof t === 'string' ? t : (t as { name: string }).name),
    }))
    if (isBookmarkedFilter) {
      base = base.filter((n) => bookmarkedIds.has(n.id))
    } else if (activeCategories.size > 0) {
      base = base.filter((n) => activeCategories.has(n.category))
    }
    return base
  }, [allNodes, activeCategories, isBookmarkedFilter, bookmarkedIds])

  const { linkedNodeIds, linkedNodes } = useMemo(() => {
    if (!selectedNode) return { linkedNodeIds: new Set<string>(), linkedNodes: [] as LinkedNodeInfo[] }
    
    const ids = new Set<string>()
    const info: LinkedNodeInfo[] = []
    
    // 1. Add DB-connected nodes
    const dbConns = unifiedConnsData?.unifiedConnections ?? []
    for (const conn of dbConns) {
      if (conn.from === selectedNode.id) {
        ids.add(conn.to)
        const n = allNodes.find(x => x.id === conn.to)
        if (n) info.push({ id: n.id, title: n.title, category: n.category })
      } else if (conn.to === selectedNode.id) {
        ids.add(conn.from)
        const n = allNodes.find(x => x.id === conn.from)
        if (n) info.push({ id: n.id, title: n.title, category: n.category })
      }
    }
    
    // 2. Add tag-shared nodes (skip already added)
    const selectedTags = new Set(selectedNode.tags.map(t => typeof t === 'string' ? t : (t as { name: string }).name))
    if (selectedTags.size > 0) {
      for (const n of allNodes) {
        if (n.id === selectedNode.id || ids.has(n.id)) continue
        const nTags = new Set(n.tags.map(t => typeof t === 'string' ? t : (t as { name: string }).name))
        const hasShared = [...selectedTags].some((t) => nTags.has(t))
        if (hasShared) {
          ids.add(n.id)
          info.push({ id: n.id, title: n.title, category: n.category })
        }
      }
    }
    
    return { linkedNodeIds: ids, linkedNodes: info }
  }, [selectedNode, allNodes, unifiedConnsData])

  /* ══════════════ 3D Hover Handler ══════════════ */

  const handleNodeHover = useCallback((nodeId: string | null, screenPos?: { x: number; y: number }) => {
    if (!nodeId || !screenPos) {
      setHoveredNode(null)
      return
    }
    const node = allNodes.find((n) => n.id === nodeId)
    if (node) {
      setHoveredNode({ id: nodeId, title: node.title, category: node.category, x: screenPos.x, y: screenPos.y })
    }
  }, [allNodes])

  /* ══════════════ Navigation ══════════════ */

  const fetchActivity = useCallback(async (offset: number) => {
    try {
      const data = await fetchJSON<{ success: boolean; logs: ActivityLogItem[]; total: number }>(
        `/api/activity?limit=50&offset=${offset}`
      )
      setActivityLogs((prev) => (offset === 0 ? data.logs : [...prev, ...data.logs]))
      setActivityTotal(data.total)
    } catch { /* silent */ }
  }, [])

  const handleNavigate = useCallback((view: string) => {
    setActiveView(view as ViewType)
    setCommandPaletteOpen(false)
    setIsListView(false)
    if (view === 'activity') {
      setActivityPage(0)
      setActivityLogs([])
      fetchActivity(0)
    }
  }, [fetchActivity])

  /* ══════════════ Category Filter ══════════════ */

  const handleToggleCategory = useCallback((category: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const handleClearCategories = useCallback(() => {
    setActiveCategories(new Set())
    setIsBookmarkedFilter(false)
  }, [])

  const handleCategoryClickFromDashboard = useCallback((category: string) => {
    setActiveView('brain')
    setActiveCategories(new Set([category]))
    setIsListView(false)
  }, [])

  /* ══════════════ Drag & Drop ══════════════ */

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileImport(file)
  }, [])

  const handleFileImport = useCallback(async (file: File) => {
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('File too large', { description: 'Maximum 5MB allowed' })
      return
    }
    const validExts = ['.txt', '.md', '.json', '.csv', '.log']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!validExts.includes(ext)) {
      toast.error('Unsupported file type', { description: 'Use .txt, .md, .json, .csv, or .log' })
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        logActivity('File imported', file.name, 'create')

        // For small files (< 300 chars), open the Add Node dialog directly
        if (data.charCount < 300) {
          const titleFromFilename = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
          setPendingImportTitle(titleFromFilename)
          setPendingImportContent(data.text)
          setIsAdding(true)
          toast.success('File imported', { description: `"${file.name}" — ${data.charCount} chars extracted` })
        } else {
          // For larger files, offer Smart Import (AI split) vs Manual (single node)
          toast('File ready to import', {
            description: `"${file.name}" — ${data.charCount} chars extracted`,
            action: {
              label: 'Smart Import',
              onClick: async () => {
                toast.loading('AI is analyzing your file...', { id: 'smart-import' })
                try {
                  const smartRes = await fetch('/api/nodes/smart-import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: data.text, filename: file.name }),
                  })
                  const smartData = await smartRes.json()
                  if (smartData.success) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.nodes })
                    queryClient.invalidateQueries({ queryKey: queryKeys.stats })
                    toast.success(`Imported ${smartData.imported} nodes`, {
                      id: 'smart-import',
                      description: `From "${file.name}": ${smartData.nodes.map((n: { title: string }) => n.title).join(', ')}`,
                    })
                    logActivity('Smart import', `${smartData.imported} nodes from ${file.name}`, 'create')
                  } else {
                    toast.error('Smart import failed', { id: 'smart-import', description: smartData.error || 'Unknown error' })
                  }
                } catch {
                  toast.error('Smart import failed', { id: 'smart-import' })
                }
              },
            },
            duration: 10000,
          })
        }
      } else {
        toast.error('Import failed', { description: data.error })
      }
    } catch {
      toast.error('Import failed')
    }
  }, [queryClient])

  /* ══════════════ Node CRUD Mutations ══════════════ */

  const addNode = useMutation({
    mutationFn: async (data: { title: string; content: string; category: string; tags: string[] }) => {
      return fetchJSON<{ success: boolean }>('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    onSuccess: (_d, vars) => {
      setIsAdding(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      toast.success('Node stored', { description: `"${vars.title}" added to ${vars.category}` })
      logActivity('Node created', vars.title, 'create')
    },
    onError: () => toast.error('Failed to store node'),
  })

  const updateNode = useMutation({
    mutationFn: async (data: { id: string; title: string; content: string; category: string; tags: string[]; pinned: boolean }) => {
      return fetch(`/api/nodes/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: (_d, vars) => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      toast.success('Node updated', { description: `"${vars.title}" saved` })
      logActivity('Node updated', vars.title, 'update')
    },
    onError: () => toast.error('Failed to update node'),
  })

  const deleteNode = useMutation({
    mutationFn: (id: string) => fetch(`/api/nodes/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (_d, id) => {
      if (selectedNodeId === id) setSelectedNodeId(null)
      setAnalysis(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      toast.success('Node deleted')
      logActivity('Node deleted', id.slice(0, 8), 'delete')
    },
    onError: () => toast.error('Failed to delete node'),
  })

  const pinNode = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      fetch(`/api/nodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pinned }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      toast.success('Node pinned')
      logActivity('Node pinned', selectedNodeId?.slice(0, 8) || '', 'pin')
    },
  })

  /* ══════════════ NEW: Connection Mutations ══════════════ */

  const createConnection = useMutation({
    mutationFn: ({ fromId, toId }: { fromId: string; toId: string }) =>
      fetchJSON<{ success: boolean; connection: NodeConnection }>(`/api/nodes/${fromId}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toNodeId: toId }),
      }),
    onSuccess: () => {
      if (selectedNodeId) queryClient.invalidateQueries({ queryKey: queryKeys.connections(selectedNodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      toast.success('Connection created')
      logActivity('Connection created', selectedNodeId?.slice(0, 8) || '', 'update')
    },
    onError: () => toast.error('Failed to create connection'),
  })

  const deleteConnection = useMutation({
    mutationFn: (connectionId: string) =>
      fetch(`/api/connections/${connectionId}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      if (selectedNodeId) queryClient.invalidateQueries({ queryKey: queryKeys.connections(selectedNodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      toast.success('Connection removed')
    },
    onError: () => toast.error('Failed to remove connection'),
  })

  // Find connection ID between selected node and a target
  const findConnectionId = useCallback((targetNodeId: string): string | null => {
    if (!nodeConnections.list || !selectedNodeId) return null
    const conn = nodeConnections.list.find(
      (c) =>
        (c.fromNodeId === selectedNodeId && c.toNodeId === targetNodeId) ||
        (c.toNodeId === selectedNodeId && c.fromNodeId === targetNodeId)
    )
    return conn?.id ?? null
  }, [nodeConnections.list, selectedNodeId])

  const handleConnect = useCallback((toNodeId: string) => {
    if (!selectedNodeId) return
    createConnection.mutate({ fromId: selectedNodeId, toId: toNodeId })
  }, [selectedNodeId, createConnection])

  const handleDisconnect = useCallback((targetNodeId: string) => {
    const connId = findConnectionId(targetNodeId)
    if (connId) deleteConnection.mutate(connId)
  }, [findConnectionId, deleteConnection])

  /* ══════════════ AI Operations ══════════════ */

  const handleAutoTag = async (data: { title: string; content: string }): Promise<{ tags: string[]; category: string } | null> => {
    setIsAutoTagging(true)
    try {
      const res = await fetch('/api/nodes/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, content: data.content }),
      })
      const result = await res.json()
      if (result.success) return { tags: result.tags, category: result.category }
      toast.error('Auto-tag failed', { description: result.error || 'Unknown error' })
    } catch {
      toast.error('Auto-tag failed', { description: 'Network error' })
    } finally {
      setIsAutoTagging(false)
    }
    return null
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setSelectedNodeId(null)
    try {
      const res = await fetch('/api/nodes/analyze', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setAnalysis(data.analysis)
        toast.success('Analysis complete')
        logActivity('Knowledge analyzed', 'Analysis generated', 'analysis')
        queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      }
    } catch {
      setAnalysis({
        summary: 'Analysis failed. Neural link disrupted.',
        insights: [],
        suggestions: [],
        patterns: '',
      })
      toast.error('Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleExport = () => {
    setIsExportOpen(true)
  }

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.settings })
    } catch { /* silent */ }
  }

  const handleClearLogs = async () => {
    try {
      await fetch('/api/activity', { method: 'DELETE' })
      setActivityLogs([])
      setActivityTotal(0)
      toast.success('Activity logs cleared')
    } catch {
      toast.error('Failed to clear logs')
    }
  }

  /* ══════════════ Command Palette ══════════════ */

  const handleCommandAction = useCallback(
    (action: string) => {
      setCommandPaletteOpen(false)
      switch (action) {
        case 'add-node':
          setPendingImportTitle('')
          setPendingImportContent('')
          setIsAdding(true)
          setActiveView('brain')
          break
        case 'analyze':
          handleAnalyze()
          break
        case 'compact':
          setIsCompactOpen(true)
          break
        case 'search':
          setCommandPaletteOpen(false)
          break
        case 'export':
          handleExport()
          break
        case 'toggle-chat':
          setChatOpen((v) => !v)
          break
        case 'toggle-list':
          setIsListView((v) => !v)
          break
      }
    },
    [handleAnalyze, handleExport, queryClient]
  )

  /* ══════════════ Keyboard Shortcuts ══════════════ */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((v) => !v)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setPendingImportTitle('')
        setPendingImportContent('')
        setIsAdding(true)
        setActiveView('brain')
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        setIsListView((v) => !v)
        return
      }
      if (
        !e.metaKey && !e.ctrlKey && !e.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        if (e.key === 'b' || e.key === 'B') {
          handleNavigate('brain')
          return
        }
        if (e.key === 'd' || e.key === 'D') {
          handleNavigate('dashboard')
          return
        }
        if (e.key === 'a' || e.key === 'A') {
          handleNavigate('activity')
          return
        }
        if (e.key === 's' || e.key === 'S') {
          handleNavigate('settings')
          return
        }
        if (e.key === '?') {
          setIsShortcutsOpen((v) => !v)
          return
        }
        if (e.key === '1') handleNavigate('brain')
        if (e.key === '2') handleNavigate('dashboard')
        if (e.key === '3') handleNavigate('activity')
        if (e.key === '4') handleNavigate('settings')
        if (e.key === '5') handleNavigate('integrations')
        if (e.key === 'Escape') {
          setCommandPaletteOpen(false)
          setAnalysis(null)
          setSelectedNodeId(null)
          setIsShortcutsOpen(false)
          setIsConnPanelOpen(false)
          setIsExportOpen(false)
          setChatOpen(false)
          if (isListView) setIsListView(false)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNavigate, isListView])

  /* ══════════════ Seed on first load ══════════════ */

  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current || stats === null) return
    if (stats.nodeCount === 0 && !seededRef.current) {
      seededRef.current = true
      fetch('/api/seed', { method: 'POST' }).then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.nodes })
        queryClient.invalidateQueries({ queryKey: queryKeys.stats })
        // Generate embeddings after seeding
        setTimeout(() => {
          fetch('/api/nodes/embeddings', { method: 'POST' }).catch(() => {})
        }, 2000)
      })
    } else if (stats.nodeCount > 0 && !seededRef.current) {
      // Generate embeddings on first load if not done yet
      seededRef.current = true
      fetch('/api/nodes/embeddings', { method: 'POST' }).catch(() => {})
    }
  }, [stats, queryClient])

  /* ══════════════ Render ══════════════ */

  // Show loading skeleton until first data arrives
  if (nodesLoading && !launched) {
    return <LoadingSkeleton />
  }

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#050509]"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Launcher Screen */}
      {!launched && <Launcher onLaunch={() => setLaunched(true)} />}

      {launched && (
        <>
          {/* Full-screen 3D Scene — always rendered (CSS hidden in list view to preserve GL context) */}
          <div className={isListView ? 'invisible h-0 w-0 overflow-hidden' : ''}>
            <SceneErrorBoundary>
              <Scene
                nodes={filteredSceneNodes}
                selectedNodeId={selectedNodeId}
                linkedNodeIds={linkedNodeIds}
                onNodeSelect={(id) => {
                  setSelectedNodeId(id)
                  setAnalysis(null)
                }}
                onNodeHover={handleNodeHover}
                bloomIntensity={parseFloat(settings?.bloomIntensity?.value ?? '0.8')}
                particleCount={parseInt(settings?.particleDensity?.value ?? '100')}
                autoRotate={settings?.autoRotate?.value !== 'false'}
                isMobile={isMobile}
                dbConnections={dbSceneConnections}
              />
            </SceneErrorBoundary>
          </div>

          {/* NEW: Node List View */}
          <AnimatePresence>
            {isListView && (
              <NodeListView
                nodes={allNodes}
                selectedNodeId={selectedNodeId}
                onNodeSelect={(id) => {
                  setSelectedNodeId(id)
                  setAnalysis(null)
                }}
                activeCategories={activeCategories}
                searchQuery={listSearchQuery}
                onSearchChange={(q) => {
                  setListSearchQuery(q)
                  if (q === '') setIsListView(false)
                }}
                bookmarkedIds={bookmarkedIds}
                isBookmarkedFilter={isBookmarkedFilter}
                onBulkDelete={async (ids) => {
                  for (const id of ids) {
                    deleteNode.mutate(id)
                  }
                  if (ids.includes(selectedNodeId ?? '')) {
                    setSelectedNodeId(null)
                    setAnalysis(null)
                  }
                  toast.success(`${ids.length} node${ids.length !== 1 ? 's' : ''} deleted`)
                  logActivity('Bulk deleted', `${ids.length} nodes`, 'delete')
                }}
                onBulkUpdateCategory={async (ids, category) => {
                  for (const id of ids) {
                    await fetch(`/api/nodes/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id, category }),
                    }).catch(() => {})
                  }
                  queryClient.invalidateQueries({ queryKey: queryKeys.nodes })
                  queryClient.invalidateQueries({ queryKey: queryKeys.stats })
                  toast.success(`${ids.length} node${ids.length !== 1 ? 's' : ''} moved to ${category}`)
                  logActivity('Bulk category change', `${ids.length} nodes → ${category}`, 'update')
                }}
              />
            )}
          </AnimatePresence>

          {/* Floating Stats Badge — top right */}
          <FloatingStats stats={stats} />

          {/* NEW: Scene Legend — top left, category colors + counts + click-to-filter */}
          {activeView === 'brain' && !isListView && stats && stats.categories.length > 0 && (
            <SceneLegend
              categories={stats.categories}
              totalNodes={stats.nodeCount}
              activeCategories={activeCategories}
              onToggleCategory={handleToggleCategory}
              onClearAll={handleClearCategories}
            />
          )}

          {/* NEW: Category Filter Chips — above toolbar */}
          {activeView === 'brain' && !isListView && stats && stats.categories.length > 1 && (
            <CategoryFilterChips
              categories={stats.categories}
              activeCategories={activeCategories}
              onToggleCategory={handleToggleCategory}
              onClearAll={handleClearCategories}
              bookmarkedCount={bookmarkedIds.size}
              isBookmarkedActive={isBookmarkedFilter}
              onToggleBookmarked={() => {
                setIsBookmarkedFilter((v) => !v)
                setActiveCategories(new Set())
              }}
            />
          )}



          {/* Floating Toolbar — bottom center */}
          <FloatingToolbar
            activeView={activeView}
            onNavigate={handleNavigate}
            onAddNode={() => { setPendingImportTitle(''); setPendingImportContent(''); setIsAdding(true) }}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />

          {/* View Toggle — bottom right, stacked above Architect FAB with clear gap */}
          {activeView === 'brain' && !isListView && (
            <div className="absolute bottom-44 right-4 z-20 sm:bottom-52">
              <button
                onClick={() => setIsListView((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.2em] transition-all backdrop-blur-xl ${
                  isListView
                    ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/5 bg-black/40 text-slate-500 hover:text-slate-300'
                }`}
                title={isListView ? 'Switch to 3D View' : 'Switch to List View'}
              >
                {isListView ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                )}
                <span className="hidden sm:inline">{isListView ? '3D' : 'List'}</span>
              </button>
            </div>
          )}

          {/* Title — top center */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400 bg-clip-text">
              Second Brain
            </h1>
          </div>

          {/* Detail Slide Panel — when node selected in brain or list view */}
          <AnimatePresence>
            {(activeView === 'brain' || isListView) && selectedNode && (
              <DetailSlidePanel
                node={selectedNode}
                linkedNodes={linkedNodes}
                onClose={() => {
                  setSelectedNodeId(null)
                  setAnalysis(null)
                }}
                onEdit={() => setIsEditing(true)}
                onDelete={deleteNode.mutate}
                onPin={(id, pinned) => pinNode.mutate({ id, pinned })}
                onFocusNode={(id) => {
                  setSelectedNodeId(id)
                  setAnalysis(null)
                }}
                connectionManagement={{
                  connectedNodeIds: Array.from(nodeConnections.connectedNodeIds),
                  allNodes: allNodes.map((n) => ({ id: n.id, title: n.title, category: n.category })),
                  onConnect: handleConnect,
                  onDisconnect: handleDisconnect,
                }}
                isBookmarked={isBookmarked(selectedNode.id)}
                onToggleBookmark={toggleBookmark}
              />
            )}
          </AnimatePresence>

          {/* Analysis Overlay */}
          {analysis && (
            <AnalysisOverlay
              analysis={analysis}
              isAnalyzing={isAnalyzing}
              onClose={() => setAnalysis(null)}
            />
          )}

          {/* Dashboard Modal */}
          {activeView === 'dashboard' && (
            <DashboardPanel
              stats={stats}
              onClose={() => handleNavigate('brain')}
              onNavigate={handleNavigate}
              onAnalyze={handleAnalyze}
              onExport={handleExport}
              onCategoryClick={handleCategoryClickFromDashboard}
              onAddNode={() => { setPendingImportTitle(''); setPendingImportContent(''); setIsAdding(true) }}
              nodeCount={stats?.nodeCount ?? 0}
              onOpenBrain={() => handleNavigate('secondbrain')}
            />
          )}

          {/* Activity Panel */}
          {activeView === 'activity' && (
            <ActivityPanel
              logs={activityLogs}
              isLoading={false}
              total={activityTotal}
              onLoadMore={() => {
                const next = activityPage + 50
                setActivityPage(next)
                fetchActivity(next)
              }}
              onClearLogs={handleClearLogs}
              onClose={() => handleNavigate('brain')}
            />
          )}

          {/* Settings Panel */}
          {activeView === 'settings' && (
            <SettingsPanel
              settings={settings}
              isLoading={false}
              onUpdateSetting={handleUpdateSetting}
              onExport={handleExport}
              onClose={() => handleNavigate('brain')}
            />
          )}

          {/* Integrations Panel */}
          {activeView === 'integrations' && (
            <IntegrationsPanel onClose={() => handleNavigate('brain')} />
          )}

          {/* Second Brain Panel */}
          {activeView === 'secondbrain' && (
            <SecondBrainPanel onClose={() => handleNavigate('brain')} />
          )}

          {/* Architect Chat — hidden in list view to avoid overlapping nodes */}
          {!isListView && (
            <ArchitectChat
              isOpen={chatOpen}
              onToggle={() => setChatOpen((v) => !v)}
              onNodesCreated={() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.nodes })
                queryClient.invalidateQueries({ queryKey: queryKeys.stats })
              }}
            />
          )}

          {/* NEW: File Drop Zone */}
          <FileDropZone
            isDragging={isDragging}
            onFileDrop={handleFileImport}
            onDragOver={() => setIsDragging(true)}
            onDragLeave={() => {
              dragCounter.current = 0
              setIsDragging(false)
            }}
          />

          {/* Command Palette */}
          <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            onNavigate={handleNavigate}
            onAction={handleCommandAction}
            onNodeSelect={(nodeId) => {
              setSelectedNodeId(nodeId)
              setCommandPaletteOpen(false)
            }}
            nodes={allNodes.map((n) => ({
              id: n.id,
              title: n.title,
              category: n.category,
              tags: n.tags,
            }))}
            nodeCount={allNodes.length}
          />

          {/* Add Node Dialog */}
          <AddNode
            isOpen={isAdding}
            onClose={() => { setIsAdding(false); setPendingImportTitle(''); setPendingImportContent('') }}
            onSubmit={(data) => addNode.mutate(data)}
            isLoading={isAutoTagging}
            onAutoTag={handleAutoTag}
            initialTitle={pendingImportTitle || undefined}
            initialContent={pendingImportContent || undefined}
          />

          {/* Edit Node Dialog */}
          <EditNode
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            node={
              selectedNode
                ? {
                    id: selectedNode.id,
                    title: selectedNode.title,
                    content: selectedNode.content,
                    category: selectedNode.category,
                    tags: selectedNode.tags.map((t) => (typeof t === 'string' ? t : (t as { name: string }).name)),
                    pinned: selectedNode.pinned,
                  }
                : null
            }
            onSubmit={(data) => updateNode.mutate(data)}
            isLoading={isAutoTagging}
            onDelete={deleteNode.mutate}
            onAutoTag={handleAutoTag}
          />

          {/* NEW: 3D Node Hover Tooltip */}
          {hoveredNode && !isListView && (
            <div
              className="pointer-events-none z-25 fixed"
              style={{
                left: hoveredNode.x + 12,
                top: hoveredNode.y - 8,
                transform: 'translateY(-100%)',
              }}
            >
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/80 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: (CATEGORY_COLORS as Record<string, string>)[hoveredNode.category] || '#94a3b8' }}
                />
                <span className="max-w-[200px] truncate font-mono text-[10px] text-slate-200">
                  {hoveredNode.title}
                </span>
              </div>
            </div>
          )}

          {/* NEW: Connection Strength Panel */}
          {activeView === 'brain' && selectedNodeId && isConnPanelOpen && (
            <ConnectionStrengthPanel
              selectedNodeId={selectedNodeId}
              connections={dbSceneConnections}
              allNodes={allNodes.map((n) => ({ id: n.id, title: n.title, category: n.category }))}
              onClose={() => setIsConnPanelOpen(false)}
              onNavigateToNode={(id) => {
                setSelectedNodeId(id)
                setAnalysis(null)
              }}
            />
          )}

          {/* NEW: Keyboard Shortcuts Modal */}
          <KeyboardShortcuts
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />

          {/* NEW: Export Dialog */}
          <ExportDialog
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
          />

          {/* NEW: Compact Dialog — replaces broken inline compact; proper category select + destructive confirm */}
          <CompactDialog
            isOpen={isCompactOpen}
            onClose={() => setIsCompactOpen(false)}
            categories={stats?.categories ?? []}
            totalNodes={stats?.nodeCount ?? 0}
            onCompacted={(removedCount, category) => {
              queryClient.invalidateQueries({ queryKey: queryKeys.nodes })
              queryClient.invalidateQueries({ queryKey: queryKeys.stats })
              queryClient.invalidateQueries({ queryKey: ['unified-connections'] })
              logActivity(
                'Nodes compacted',
                `${removedCount} ${category === 'all' ? 'all-category' : category} nodes → 1`,
                'compact',
              )
              setSelectedNodeId(null)
              setAnalysis(null)
            }}
          />
        </>
      )}
    </main>
  )
}