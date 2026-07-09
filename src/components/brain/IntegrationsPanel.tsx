'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Zap, Link2, Plug, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, RefreshCw, LayoutDashboard, Cpu, Radio, Database, Sparkles, Search, ArrowDownToLine, RotateCcw, Copy, Terminal } from 'lucide-react'
import { toast } from 'sonner'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

type TabId = 'secondbrain' | 'llm' | 'integrations' | 'hermes'

interface TabDef {
  id: TabId
  label: string
  icon: React.ReactNode
}

const TABS: TabDef[] = [
  { id: 'llm', label: 'LLM Backend', icon: <Zap className="h-3.5 w-3.5" /> },
  { id: 'integrations', label: 'Integrations', icon: <Link2 className="h-3.5 w-3.5" /> },
  { id: 'hermes', label: 'Hermes', icon: <Terminal className="h-3.5 w-3.5" /> },
  { id: 'secondbrain', label: 'Second Brain', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
]

const HERMES_TOOLS = [
  { name: 'brain_query', desc: 'Search and query stored memories. Supports keyword search, category filtering, and LLM prompt formatting.' },
  { name: 'brain_store', desc: 'Store new memories manually or auto-extract them from text using AI.' },
  { name: 'brain_stats', desc: 'Get memory statistics: total count, category breakdown, recent additions.' },
  { name: 'brain_reflect', desc: 'Run AI-powered reflection to find patterns, boost relevant memories, and decay stale ones.' },
  { name: 'brain_import', desc: 'Import knowledge from brain nodes into the agent memory system.' },
]

const HERMES_CONFIG_YAML = `mcp_servers:
  second-brain:
    command: "npx"
    args:
      - "tsx"
      - "/path/to/your/project/mini-services/brain-mcp-server/index.ts"
    env:
      BRAIN_URL: "http://localhost:3000"
      # BRAIN_API_KEY: "sk-brain-your-key-here"  # optional
    tools:
      include:
        - brain_query
        - brain_store
        - brain_stats
        - brain_reflect
        - brain_import`

const EXTERNAL_INTEGRATIONS: Array<{
  name: string
  status: 'coming-soon' | 'configured'
  description: string
  icon: string
}> = [
  {
    name: 'Notion',
    status: 'coming-soon',
    description: 'Import and sync knowledge from Notion workspaces.',
    icon: '📝',
  },
  {
    name: 'Web Clipper',
    status: 'coming-soon',
    description: 'Browser extension to save web pages directly.',
    icon: '🌐',
  },
]

interface IntegrationsPanelProps {
  onClose: () => void
}

export default function IntegrationsPanel({ onClose }: IntegrationsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('secondbrain')

  // External Second Brain connection state
  const [brainUrl, setBrainUrl] = useState('')
  const [brainApiKey, setBrainApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [connectionError, setConnectionError] = useState('')
  const [loaded, setLoaded] = useState(false)

  // LLM Backend state
  const [llmProvider, setLlmProvider] = useState('nvidia')
  const [availableProviders, setAvailableProviders] = useState<{ nvidia: boolean; groq: boolean }>({ nvidia: false, groq: false })
  const [savingProvider, setSavingProvider] = useState(false)
  const [nvidiaKeyInput, setNvidiaKeyInput] = useState('')
  const [groqKeyInput, setGroqKeyInput] = useState('')
  const [nvidiaKeySaved, setNvidiaKeySaved] = useState(false) // true if DB has a real key
  const [groqKeySaved, setGroqKeySaved] = useState(false)
  const [showNvidiaKey, setShowNvidiaKey] = useState(false)
  const [showGroqKey, setShowGroqKey] = useState(false)
  const [savingNvidiaKey, setSavingNvidiaKey] = useState(false)
  const [savingGroqKey, setSavingGroqKey] = useState(false)

  // Agent Memory state
  const [brainStats, setBrainStats] = useState<{ total: number; byCategory: Record<string, number>; recentCount: number } | null>(null)
  const [brainMemories, setBrainMemories] = useState<Array<{ id: string; content: string; category: string; source: string; relevance: number; accessCount: number; createdAt: string }>>([])
  const [brainLoading, setBrainLoading] = useState(false)
  const [importingBrain, setImportingBrain] = useState(false)
  const [reflecting, setReflecting] = useState(false)
  const [brainReflection, setBrainReflection] = useState<string | null>(null)
  const [brainQuery, setBrainQuery] = useState('')

  // Load settings from server on mount
  const loadSettings = useCallback(async () => {
    let savedProvider = ''
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data.success && data.settings) {
        const url = data.settings.brainUrl?.value || 'http://localhost:3001'
        savedProvider = data.settings.llmProvider?.value || ''
        setBrainUrl(url)
        // API key is redacted in settings — load the prefix from /api/api-keys instead
        const keyVal = data.settings.defaultApiKey?.value || ''
        if (data.settings.defaultApiKey?.redacted || keyVal.includes('•••')) {
          // Key exists but is redacted — show placeholder with prefix from api-keys
          try {
            const keysRes = await fetch('/api/api-keys')
            const keysData = await keysRes.json()
            if (keysData.success && keysData.keys?.length > 0) {
              setBrainApiKey(keysData.keys[0].keyPrefix + '••••••••••••••••••••')
            } else {
              setBrainApiKey('')
            }
          } catch {
            setBrainApiKey('')
          }
        } else {
          setBrainApiKey(keyVal)
        }
        if (savedProvider) setLlmProvider(savedProvider)
      }
      // Load available providers
      const provRes = await fetch('/api/llm/providers')
      const provData = await provRes.json()
      if (provData.success) {
        setAvailableProviders(provData.providers)
        // If saved provider has no key, pick one that does
        if (savedProvider && !provData.providers[savedProvider as keyof typeof provData.providers]) {
          const fallback = provData.providers.nvidia ? 'nvidia' : provData.providers.groq ? 'groq' : ''
          if (fallback) setLlmProvider(fallback)
        }
      }
      // Load DB-stored API key status
      const nvSetting = data.settings?.nvidiaApiKey
      const gqSetting = data.settings?.groqApiKey
      if (nvSetting?.redacted) { setNvidiaKeySaved(true); setNvidiaKeyInput('') }
      else if (nvSetting?.value) { setNvidiaKeySaved(true); setNvidiaKeyInput('') }
      if (gqSetting?.redacted) { setGroqKeySaved(true); setGroqKeyInput('') }
      else if (gqSetting?.value) { setGroqKeySaved(true); setGroqKeyInput('') }
    } catch { /* silent */ }
    setLoaded(true)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  // Load brain memory stats
  const loadBrainStats = useCallback(async () => {
    try {
      const res = await fetch('/api/brain/insights')
      const data = await res.json()
      if (data.success) setBrainStats(data.stats)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    if (activeTab === 'secondbrain') loadBrainStats()
  }, [activeTab, loadBrainStats])

  // Query brain memories
  const handleBrainQuery = useCallback(async () => {
    setBrainLoading(true)
    try {
      const res = await fetch('/api/brain/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: brainQuery || undefined,
          limit: 15,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setBrainMemories(data.memories || [])
        loadBrainStats()
      }
    } catch { /* silent */ }
    setBrainLoading(false)
  }, [brainQuery, loadBrainStats])

  // Import from brain nodes
  const handleImportFromBrain = useCallback(async () => {
    setImportingBrain(true)
    try {
      const res = await fetch('/api/brain/insights?action=import&maxNodes=30')
      const data = await res.json()
      if (data.success) {
        toast.success(`Imported ${data.stored} memories from ${data.processed} nodes`)
        loadBrainStats()
        handleBrainQuery()
      } else {
        toast.error(data.error || 'Import failed')
      }
    } catch {
      toast.error('Import failed')
    }
    setImportingBrain(false)
  }, [loadBrainStats, handleBrainQuery])

  // Reflect on memories
  const handleReflect = useCallback(async () => {
    setReflecting(true)
    setBrainReflection(null)
    try {
      const res = await fetch('/api/brain/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deep: true }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.aiInsight) setBrainReflection(data.aiInsight)
        else toast.success(data.message)
        loadBrainStats()
      }
    } catch {
      toast.error('Reflection failed')
    }
    setReflecting(false)
  }, [loadBrainStats])

  const handleConnectBrain = async () => {
    if (!brainUrl.trim()) {
      toast.error('URL required', { description: 'Enter the AI dashboard URL' })
      return
    }
    setIsConnecting(true)
    setConnectionStatus('idle')
    setConnectionError('')

    try {
      const res = await fetch('/api/integrations/secondbrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: brainUrl.trim(), apiKey: brainApiKey.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setConnectionStatus('success')
        toast.success('Dashboard connected', { description: `Linked to ${brainUrl.trim()}` })
      } else {
        setConnectionStatus('error')
        setConnectionError(data.error || 'Connection failed')
        toast.error('Connection failed', { description: data.error || 'Unknown error' })
      }
    } catch (err) {
      setConnectionStatus('error')
      setConnectionError('Network error — could not reach the server')
      toast.error('Connection failed', { description: 'Network error' })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRegenerateKey = async () => {
    try {
      const res = await fetch('/api/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Default' }) })
      const data = await res.json()
      if (data.success && data.apiKey?.key) {
        setBrainApiKey(data.apiKey.key)
        setConnectionStatus('idle')
        // Do NOT persist the full key to settings — it's stored as a hash in the ApiKey table.
        // The full key is shown only now and cannot be retrieved again.
        toast.success('New API key generated', { description: 'Save this key — it cannot be shown again.' })
      } else {
        toast.error('Failed to generate key')
      }
    } catch {
      toast.error('Failed to generate key')
    }
  }

  const handleSaveProvider = async (provider: string) => {
    setLlmProvider(provider)
    setSavingProvider(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'llmProvider', value: provider }),
      })
      toast.success('Provider updated', { description: `Switched to ${provider.toUpperCase()}` })
    } catch {
      toast.error('Failed to save provider')
    } finally {
      setSavingProvider(false)
    }
  }

  const handleSaveApiKey = async (provider: 'nvidia' | 'groq') => {
    const key = provider === 'nvidia' ? nvidiaKeyInput : groqKeyInput
    if (!key.trim()) {
      toast.error('Key required', { description: `Enter a ${provider.toUpperCase()} API key` })
      return
    }
    const isSaving = provider === 'nvidia' ? setSavingNvidiaKey : setSavingGroqKey
    const setSaved = provider === 'nvidia' ? setNvidiaKeySaved : setGroqKeySaved
    const setClear = provider === 'nvidia' ? setNvidiaKeyInput : setGroqKeyInput
    isSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `${provider}ApiKey`, value: key.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setClear('')
        // Refresh provider availability
        const provRes = await fetch('/api/llm/providers')
        const provData = await provRes.json()
        if (provData.success) setAvailableProviders(provData.providers)
        toast.success(`${provider.toUpperCase()} key saved`, { description: 'The key is stored securely on the server.' })
      } else {
        toast.error('Failed to save key', { description: data.error || 'Unknown error' })
      }
    } catch {
      toast.error('Failed to save key')
    } finally {
      isSaving(false)
    }
  }

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
        className="relative mx-4 flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-white/5 bg-black/50 backdrop-blur-xl shadow-[0_0_60px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <motion.div
          variants={item}
          className="flex items-center justify-between border-b border-white/5 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="font-mono text-sm font-semibold tracking-[0.1em] text-slate-300 uppercase">
                Configuration
              </h2>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
                Manage LLM backend, adapters, and AI dashboard connection settings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          variants={item}
          className="flex items-center gap-1 border-b border-white/5 px-5"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3.5 py-3 font-mono text-[9px] uppercase tracking-[0.15em] transition-all ${
                activeTab === tab.id
                  ? 'text-cyan-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {/* Active indicator */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="config-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-px bg-cyan-500/50"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            {activeTab === 'secondbrain' && (
              <motion.div
                key="secondbrain"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-5"
              >
                {/* AI Dashboard Connection */}
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/10">
                    <LayoutDashboard className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-semibold text-slate-200">
                      AI Dashboard
                    </h3>
                    <p className="font-mono text-[9px] text-slate-500">
                      Connect an external AI dashboard to input and extract knowledge from this brain.
                    </p>
                  </div>
                </div>

                {/* URL Field */}
                <div className="mb-4">
                  <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">
                    Dashboard URL
                  </label>
                  <div className="relative">
                    {!loaded && (
                      <div className="absolute inset-0 z-10 flex items-center gap-2 rounded-lg bg-white/[0.02] px-3.5">
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-cyan-500/30 border-t-cyan-500" />
                        <span className="font-mono text-[9px] text-slate-500">Loading...</span>
                      </div>
                    )}
                    <input
                      type="text"
                      value={brainUrl}
                      onChange={(e) => { setBrainUrl(e.target.value); setConnectionStatus('idle') }}
                      placeholder="http://localhost:3001"
                      disabled={!loaded}
                      className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-3.5 py-2.5 font-mono text-xs text-slate-300 placeholder:text-slate-600 transition-all focus:border-cyan-500/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 disabled:opacity-60"
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[8px] text-slate-600">
                    The base URL of the AI dashboard (no trailing slash).
                  </p>
                </div>

                {/* API Key Field */}
                <div className="mb-5">
                  <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">
                    API Key
                  </label>
                  <div className="relative">
                    {!loaded && (
                      <div className="absolute inset-0 z-10 flex items-center gap-2 rounded-lg bg-white/[0.02] px-3.5">
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-cyan-500/30 border-t-cyan-500" />
                        <span className="font-mono text-[9px] text-slate-500">Loading...</span>
                      </div>
                    )}
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={brainApiKey}
                      onChange={(e) => { setBrainApiKey(e.target.value); setConnectionStatus('idle') }}
                      placeholder="sk-brain-..."
                      disabled={!loaded}
                      className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-3.5 py-2.5 pr-10 font-mono text-xs text-slate-300 placeholder:text-slate-600 transition-all focus:border-cyan-500/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-600 transition-colors hover:text-slate-400"
                      title={showApiKey ? 'Hide key' : 'Show key'}
                    >
                      {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateKey}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-600 transition-colors hover:text-cyan-400"
                      title="Generate new API key"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1.5 font-mono text-[8px] text-slate-600">
                    API key provided by the AI dashboard for authentication.
                  </p>
                </div>

                {/* Connect Button */}
                <button
                  onClick={handleConnectBrain}
                  disabled={isConnecting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400 transition-all hover:border-cyan-400/40 hover:bg-cyan-500/15 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plug className="h-3.5 w-3.5" />
                      Connect Dashboard
                    </>
                  )}
                </button>

                {/* Connection status feedback */}
                {connectionStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
                  >
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span className="font-mono text-[9px] text-emerald-400">
                      AI dashboard connected successfully.
                    </span>
                  </motion.div>
                )}
                {connectionStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                    <span className="font-mono text-[9px] text-rose-400">
                      {connectionError}
                    </span>
                  </motion.div>
                )}

                {/* Setup Guide */}
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                  <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                    Setup Guide
                  </p>
                  <p className="font-mono text-[10px] leading-relaxed text-slate-500">
                    Enter the AI dashboard's URL and API key above. The dashboard can then read knowledge nodes from and write new nodes to this brain. All requests are proxied through the backend for security.
                  </p>
                </div>

                {/* ═══ Agent Memory (Persistent Memory) ═══ */}
                <div className="mt-6 border-t border-white/5 pt-5">
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-purple-500/20 bg-purple-500/10">
                      <Brain className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-mono text-xs font-semibold text-slate-200">
                        Agent Memory
                      </h3>
                      <p className="font-mono text-[9px] text-slate-500">
                        Persistent memory that extracts, stores, and reflects on knowledge.
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  {brainStats && (
                    <div className="mb-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-center">
                        <p className="font-mono text-sm font-bold text-purple-400">{brainStats.total}</p>
                        <p className="font-mono text-[7px] uppercase tracking-wider text-slate-500">Memories</p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-center">
                        <p className="font-mono text-sm font-bold text-cyan-400">{brainStats.recentCount}</p>
                        <p className="font-mono text-[7px] uppercase tracking-wider text-slate-500">Last 24h</p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-center">
                        <p className="font-mono text-sm font-bold text-amber-400">{Object.keys(brainStats.byCategory).length}</p>
                        <p className="font-mono text-[7px] uppercase tracking-wider text-slate-500">Categories</p>
                      </div>
                    </div>
                  )}

                  {/* Category chips */}
                  {brainStats && Object.keys(brainStats.byCategory).length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {Object.entries(brainStats.byCategory).map(([cat, count]) => {
                        const colors: Record<string, string> = {
                          insight: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
                          strategy: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                          pattern: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
                          lesson: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
                          fact: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                          preference: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
                        }
                        return (
                          <span key={cat} className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${colors[cat] || 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}>
                            {cat} {count}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    <button
                      onClick={handleImportFromBrain}
                      disabled={importingBrain}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-2 py-2 font-mono text-[9px] uppercase tracking-wider text-cyan-400 transition-all hover:border-cyan-400/30 hover:bg-cyan-500/10 disabled:opacity-50"
                    >
                      {importingBrain ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowDownToLine className="h-3 w-3" />}
                      Import
                    </button>
                    <button
                      onClick={handleReflect}
                      disabled={reflecting}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/15 bg-purple-500/5 px-2 py-2 font-mono text-[9px] uppercase tracking-wider text-purple-400 transition-all hover:border-purple-400/30 hover:bg-purple-500/10 disabled:opacity-50"
                    >
                      {reflecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                      Reflect
                    </button>
                    <button
                      onClick={handleBrainQuery}
                      disabled={brainLoading}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2 py-2 font-mono text-[9px] uppercase tracking-wider text-emerald-400 transition-all hover:border-emerald-400/30 hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      {brainLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      Query
                    </button>
                  </div>

                  {/* AI Reflection result */}
                  {brainReflection && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-4 rounded-lg border border-purple-500/15 bg-purple-500/5 p-3 max-h-40 overflow-y-auto scrollbar-thin"
                    >
                      <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider text-purple-400">
                        <Sparkles className="h-3 w-3" />
                        AI Reflection
                      </p>
                      <p className="font-mono text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap">{brainReflection}</p>
                    </motion.div>
                  )}

                  {/* Memory list */}
                  {brainMemories.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-white/5 bg-white/[0.02]">
                      {brainMemories.map((mem) => (
                        <div key={mem.id} className="border-b border-white/[0.03] px-3 py-2.5 last:border-0 hover:bg-white/[0.02] transition-colors">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-full border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-purple-400 border-purple-400/20 bg-purple-400/5">
                              {mem.category}
                            </span>
                            <span className="font-mono text-[7px] text-slate-600">
                              r:{mem.relevance.toFixed(1)} · accessed:{mem.accessCount}
                            </span>
                          </div>
                          <p className="font-mono text-[10px] leading-relaxed text-slate-400 line-clamp-2">
                            {mem.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Prompt injection info */}
                  <div className="mt-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                    <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                      API Endpoints
                    </p>
                    <div className="space-y-1">
                      {[
                        { method: 'POST', path: '/api/brain/store', desc: 'Store or auto-extract memories' },
                        { method: 'POST', path: '/api/brain/query', desc: 'Query & format for prompt injection' },
                        { method: 'GET/POST', path: '/api/brain/insights', desc: 'Stats, import from brain, extract' },
                        { method: 'POST', path: '/api/brain/reflect', desc: 'AI-powered reflection & decay' },
                      ].map((ep) => (
                        <div key={ep.path} className="flex items-start gap-2">
                          <span className="shrink-0 rounded bg-slate-700/50 px-1 py-0.5 font-mono text-[7px] text-slate-400">
                            {ep.method}
                          </span>
                          <div className="min-w-0">
                            <code className="font-mono text-[9px] text-cyan-400">{ep.path}</code>
                            <p className="font-mono text-[8px] text-slate-600">{ep.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'llm' && (
              <motion.div
                key="llm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-5"
              >
                <div className="mb-5 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-purple-500/20 bg-purple-500/10">
                    <Zap className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-semibold text-slate-200">
                      LLM Backend
                    </h3>
                    <p className="font-mono text-[9px] text-slate-500">
                      Add your API key and choose a provider for AI features.
                    </p>
                  </div>
                </div>

                {/* NVIDIA API Key */}
                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-mono text-[10px] font-semibold text-slate-300">NVIDIA</span>
                      {nvidiaKeySaved && (
                        <span className="rounded px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider bg-emerald-400/10 text-emerald-400">
                          Key Saved
                        </span>
                      )}
                    </div>
                    {llmProvider === 'nvidia' && nvidiaKeySaved && (
                      <span className="rounded px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider bg-emerald-400/10 text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showNvidiaKey ? 'text' : 'password'}
                      value={nvidiaKeyInput}
                      onChange={(e) => setNvidiaKeyInput(e.target.value)}
                      placeholder={nvidiaKeySaved ? 'Key is saved — enter a new one to replace' : 'nvapi-...'}
                      disabled={savingNvidiaKey}
                      className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-3.5 py-2.5 pr-20 font-mono text-xs text-slate-300 placeholder:text-slate-600 transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/10 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNvidiaKey(!showNvidiaKey)}
                      className="absolute right-12 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-600 transition-colors hover:text-slate-400"
                    >
                      {showNvidiaKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveApiKey('nvidia')}
                      disabled={savingNvidiaKey || !nvidiaKeyInput.trim()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      {savingNvidiaKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                  <p className="mt-1.5 font-mono text-[8px] text-slate-600">
                    Get a free key at <span className="text-slate-500">build.nvidia.com</span> · Model: meta/llama-3.1-70b-instruct
                  </p>
                </div>

                {/* Groq API Key */}
                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="font-mono text-[10px] font-semibold text-slate-300">Groq</span>
                      {groqKeySaved && (
                        <span className="rounded px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider bg-cyan-400/10 text-cyan-400">
                          Key Saved
                        </span>
                      )}
                    </div>
                    {llmProvider === 'groq' && groqKeySaved && (
                      <span className="rounded px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider bg-cyan-400/10 text-cyan-400">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showGroqKey ? 'text' : 'password'}
                      value={groqKeyInput}
                      onChange={(e) => setGroqKeyInput(e.target.value)}
                      placeholder={groqKeySaved ? 'Key is saved — enter a new one to replace' : 'gsk_...'}
                      disabled={savingGroqKey}
                      className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-3.5 py-2.5 pr-20 font-mono text-xs text-slate-300 placeholder:text-slate-600 transition-all focus:border-cyan-500/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqKey(!showGroqKey)}
                      className="absolute right-12 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-600 transition-colors hover:text-slate-400"
                    >
                      {showGroqKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveApiKey('groq')}
                      disabled={savingGroqKey || !groqKeyInput.trim()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-cyan-400 transition-colors hover:bg-cyan-500/10 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      {savingGroqKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                  <p className="mt-1.5 font-mono text-[8px] text-slate-600">
                    Get a free key at <span className="text-slate-500">console.groq.com</span> · Model: llama-3.3-70b-versatile
                  </p>
                </div>

                {/* Active Provider Selection */}
                <div className="mb-4">
                  <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
                    Active Provider
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={savingProvider || (!availableProviders.nvidia && !nvidiaKeySaved)}
                      onClick={() => handleSaveProvider('nvidia')}
                      className={`flex-1 rounded-lg border px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
                        llmProvider === 'nvidia'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/10 hover:text-slate-300'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {savingProvider && llmProvider !== 'nvidia' ? <Loader2 className="h-3.5 w-3.5 mx-auto animate-spin" /> : 'NVIDIA'}
                    </button>
                    <button
                      type="button"
                      disabled={savingProvider || (!availableProviders.groq && !groqKeySaved)}
                      onClick={() => handleSaveProvider('groq')}
                      className={`flex-1 rounded-lg border px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
                        llmProvider === 'groq'
                          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                          : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/10 hover:text-slate-300'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {savingProvider && llmProvider !== 'groq' ? <Loader2 className="h-3.5 w-3.5 mx-auto animate-spin" /> : 'Groq'}
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-[8px] text-slate-600">
                    If the active provider fails, the other is tried automatically. Configure at least one provider for AI features.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-5"
              >
                <div className="mb-5 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/20 bg-rose-500/10">
                    <Link2 className="h-3.5 w-3.5 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-semibold text-slate-200">
                      Integrations
                    </h3>
                    <p className="font-mono text-[9px] text-slate-500">
                      Connect external services to import and sync knowledge.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {EXTERNAL_INTEGRATIONS.map((integ) => (
                    <div
                      key={integ.name}
                      className="rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-cyan-500/15"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{integ.icon}</span>
                          <span className="font-mono text-xs font-semibold text-slate-300">
                            {integ.name}
                          </span>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
                            integ.status === 'configured'
                              ? 'bg-emerald-400/10 text-emerald-400'
                              : 'bg-slate-400/10 text-slate-500'
                          }`}
                        >
                          {integ.status === 'configured' ? 'Active' : 'Coming Soon'}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] leading-relaxed text-slate-500">
                        {integ.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* API Key info */}
                <div className="mt-6">
                  <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                    API Keys
                  </p>
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <p className="font-mono text-[10px] leading-relaxed text-slate-500">
                      API keys are managed through environment variables on the server. The
                      configured AI provider uses secure server-side keys. Client-side
                      components never have access to raw API credentials.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'hermes' && (
              <motion.div
                key="hermes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-5"
              >
                {/* Hermes Header */}
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-500/20 bg-violet-500/10">
                    <Terminal className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-semibold text-slate-200">
                      Hermes Agent — MCP Integration
                    </h3>
                    <p className="font-mono text-[9px] text-slate-500">
                      Connect your Second Brain to Hermes via the Model Context Protocol. Say "hermes find me..." to query memories.
                    </p>
                  </div>
                </div>

                {/* What is Hermes */}
                <div className="mb-5 rounded-lg border border-violet-500/10 bg-violet-500/[0.03] p-4">
                  <p className="mb-2 font-mono text-[10px] font-semibold text-violet-300">
                    How it works
                  </p>
                  <p className="font-mono text-[10px] leading-relaxed text-slate-400">
                    Hermes is an AI agent by NousResearch that supports MCP (Model Context Protocol) servers.
                    This project includes a built-in MCP server that exposes your brain's memory system as tools.
                    Once configured, you can ask Hermes things like:
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {[
                      '"hermes, find me all insights about architecture"',
                      '"hermes, store this: learned that Next.js 16 supports partial prerendering"',
                      '"hermes, reflect on my memories and find patterns"',
                      '"hermes, what are my recent memories about?"',
                    ].map((example, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 text-violet-400/60">→</span>
                        <code className="font-mono text-[9px] text-slate-400">{example}</code>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Available Tools */}
                <div className="mb-5">
                  <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                    Available MCP Tools
                  </p>
                  <div className="flex flex-col gap-2">
                    {HERMES_TOOLS.map((tool) => (
                      <div
                        key={tool.name}
                        className="rounded-lg border border-white/5 bg-white/[0.02] px-3.5 py-2.5"
                      >
                        <div className="mb-0.5 flex items-center gap-2">
                          <Cpu className="h-3 w-3 text-violet-400/70" />
                          <code className="font-mono text-[10px] font-semibold text-slate-300">
                            {tool.name}
                          </code>
                        </div>
                        <p className="ml-5 font-mono text-[9px] leading-relaxed text-slate-500">
                          {tool.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Config YAML */}
                <div className="mb-5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                      Hermes config.yaml
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(HERMES_CONFIG_YAML)
                        toast.success('Config copied to clipboard')
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1 font-mono text-[8px] text-slate-400 transition-all hover:border-cyan-500/20 hover:text-cyan-400"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                  <div className="relative rounded-lg border border-white/5 bg-[#0d1117] p-4">
                    <pre className="max-h-56 overflow-auto font-mono text-[9px] leading-relaxed text-slate-300 scrollbar-thin">
                      {HERMES_CONFIG_YAML}
                    </pre>
                  </div>
                  <p className="mt-1.5 font-mono text-[8px] text-slate-600">
                    Add this to your <code className="text-slate-400">~/.hermes/config.yaml</code>. Update the path to point to your project.
                  </p>
                </div>

                {/* Setup Steps */}
                <div className="mb-5">
                  <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                    Setup Steps
                  </p>
                  <ol className="space-y-2.5">
                    {[
                      { step: 1, text: 'Install dependencies for the MCP server: cd mini-services/brain-mcp-server && npm install' },
                      { step: 2, text: 'Make sure this app is running (npm run dev on port 3000)' },
                      { step: 3, text: 'Copy the config YAML above into your ~/.hermes/config.yaml' },
                      { step: 4, text: 'Update BRAIN_URL if your app runs on a different host/port' },
                      { step: 5, text: 'Optionally set BRAIN_API_KEY to your brain API key' },
                      { step: 6, text: 'Restart Hermes or run /reload-mcp in a Hermes session' },
                    ].map(({ step, text }) => (
                      <li key={step} className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 font-mono text-[8px] font-bold text-violet-400">
                          {step}
                        </span>
                        <p className="font-mono text-[10px] leading-relaxed text-slate-400 pt-0.5">
                          {text}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Reload hint */}
                <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-4">
                  <p className="mb-1 font-mono text-[10px] font-semibold text-emerald-300">
                    After setup
                  </p>
                  <p className="font-mono text-[9px] leading-relaxed text-slate-400">
                    In any Hermes session, type <code className="text-emerald-400">/reload-mcp</code> to pick up the new server.
                    Tools will appear as <code className="text-emerald-400">mcp_second_brain_*</code>.
                    Use <code className="text-emerald-400">hermes, find me...</code> and Hermes will automatically pick the right tool.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}