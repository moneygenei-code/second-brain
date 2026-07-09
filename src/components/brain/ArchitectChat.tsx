'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatMessage } from '@/lib/types'

const TYPING_SPEED = 15 // ms per character
const MAX_DIRECT_INPUT = 2000
const LARGE_TEXT_THRESHOLD = 6000
const REQUEST_TIMEOUT_MS = 90_000 // 90 seconds

interface ArchitectChatProps {
  isOpen: boolean
  onToggle: () => void
  onNodesCreated?: () => void
}

export default function ArchitectChat({ isOpen, onToggle, onNodesCreated }: ArchitectChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null)
  const [displayedContent, setDisplayedContent] = useState('')
  const [fileInfo, setFileInfo] = useState<{ name: string; chars: number; text: string } | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadingStartRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Elapsed timer
  useEffect(() => {
    if (isLoading) {
      loadingStartRef.current = Date.now()
      setElapsedSec(0)
      timerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - loadingStartRef.current) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setElapsedSec(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isLoading])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, displayedContent])

  // Typing effect
  useEffect(() => {
    if (!isTyping || !typingMsgId) return

    const targetMsg = messages.find((m) => m.id === typingMsgId)
    if (!targetMsg) return

    const fullText = targetMsg.content
    let index = displayedContent.length

    if (index >= fullText.length) {
      setIsTyping(false)
      setTypingMsgId(null)
      setDisplayedContent('')
      return
    }

    const timer = setInterval(() => {
      index++
      setDisplayedContent(fullText.slice(0, index))
      if (index >= fullText.length) {
        clearInterval(timer)
        setIsTyping(false)
        setTypingMsgId(null)
        setDisplayedContent('')
      }
    }, TYPING_SPEED)

    return () => clearInterval(timer)
  }, [isTyping, typingMsgId, messages, displayedContent])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const addSystemMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: `sys-${Date.now()}`,
      role: 'architect',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, msg])
  }, [])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed && !fileInfo) return
    if (isLoading || isTyping) return

    const userContent = fileInfo
      ? `[File: ${fileInfo.name} (${fileInfo.chars} chars)]\n\n${fileInfo.text}`
      : trimmed

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setFileInfo(null)
    setErrorMsg(null)
    setIsLoading(true)

    try {
      const pastMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      const res = await fetch('/api/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userContent, pastMessages }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await res.json()

      if (data.success && data.response) {
        const archMsg: ChatMessage = {
          id: `arch-${Date.now()}`,
          role: 'architect',
          content: data.response,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, archMsg])
        setTypingMsgId(archMsg.id)
        setIsTyping(true)
        setDisplayedContent('')
      } else {
        const err = data.error || 'The AI returned an empty response. Try again.'
        setErrorMsg(err.includes('rate limit') || err.includes('429') || err.includes('unavailable')
          ? 'AI provider is rate-limited or unavailable. Please configure an LLM provider in Settings (NVIDIA or Groq), or wait a moment and try again.'
          : err)
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMsg(`Request timed out after ${Math.floor(REQUEST_TIMEOUT_MS / 1000)}s. The AI provider may be slow or unavailable. Try a shorter message.`)
      } else {
        setErrorMsg('Failed to reach the AI. Check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [input, fileInfo, isLoading, isTyping, messages])

  const handleParseNodes = useCallback(async () => {
    if (!fileInfo || isParsing) return

    setIsParsing(true)
    setErrorMsg(null)

    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      role: 'architect',
      content: `Parsing "${fileInfo.name}" into knowledge nodes...`,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, sysMsg])
    setFileInfo(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS * 2) // 3 min for parsing

      const res = await fetch('/api/nodes/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fileInfo.text,
          filename: fileInfo.name,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await res.json()

      if (data.success) {
        const titles = (data.nodes || []).map((n: { title: string }) => n.title).join(', ')
        let content = `Created ${data.nodesCreated} node${data.nodesCreated !== 1 ? 's' : ''} from "${fileInfo.name}":\n\n${titles || 'Untitled'}`
        if (data.warning) {
          content += `\n\n⚠️ ${data.warning}`
        }
        const resultMsg: ChatMessage = {
          id: `sys-${Date.now()}`,
          role: 'architect',
          content,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, resultMsg])
        onNodesCreated?.()
      } else {
        const err = data.error || 'Failed to parse file into nodes.'
        setErrorMsg(err.includes('rate limit') || err.includes('429') || err.includes('unavailable')
          ? 'AI provider is rate-limited or unavailable. Nodes will be created from raw text instead. Configure an LLM provider in Settings for smarter parsing.'
          : err)
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMsg('File parsing timed out. The file may be too large. Try a smaller file.')
      } else {
        setErrorMsg('Failed to parse file. Please try again.')
      }
    } finally {
      setIsParsing(false)
    }
  }, [fileInfo, isParsing, onNodesCreated])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validExts = ['.txt', '.md', '.json', '.csv']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!validExts.includes(ext)) {
      setErrorMsg(`Unsupported file type: ${ext}. Use .txt, .md, .json, or .csv`)
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success && data.text) {
        setFileInfo({
          name: file.name,
          chars: data.text.length,
          text: data.text,
        })
        setErrorMsg(null)
      } else {
        setErrorMsg(data.error || 'Failed to read file.')
      }
    } catch {
      setErrorMsg('Failed to upload file. Please try again.')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const totalInputLen = input.length + (fileInfo ? fileInfo.chars : 0)
  const isLarge = fileInfo && fileInfo.chars > LARGE_TEXT_THRESHOLD

  const formatElapsed = (sec: number) => {
    if (sec < 60) return `${sec}s`
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getDisplayContent = (msg: ChatMessage) => {
    if (msg.id === typingMsgId && isTyping) {
      return displayedContent || ''
    }
    return msg.content
  }

  return (
    <>
      {/* Toggle FAB — bottom right, above toolbar */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onToggle}
        className={`absolute bottom-28 right-4 z-[58] flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl transition-all sm:bottom-32 sm:h-11 sm:w-11 ${
          isOpen
            ? 'border-purple-500/30 bg-purple-500/15 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
            : 'border-white/[0.08] bg-black/60 text-slate-400 hover:border-purple-500/20 hover:text-purple-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.08)]'
        }`}
        title="Ask the Architect"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
        </svg>
        {/* Pulsing dot when closed */}
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-black/50 bg-cyan-400" />
          </span>
        )}
      </motion.button>

      {/* Chat panel — slides up from bottom right */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, x: 0 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="absolute bottom-40 right-4 z-[59] w-[calc(100vw-2rem)] max-w-[420px] sm:bottom-48 sm:max-w-[480px] rounded-xl border border-purple-500/15 bg-[#0a0a10]/95 shadow-[0_0_40px_rgba(0,0,0,0.6),0_0_15px_rgba(168,85,247,0.05)] backdrop-blur-xl"
          >
            {/* Subtle grid pattern */}
            <div
              className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.02]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-purple-400"
                  >
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                </div>
                <div>
                  <p className="font-mono text-[10px] font-semibold tracking-[0.1em] text-slate-300">
                    The Architect
                  </p>
                  <p className="font-mono text-[8px] text-slate-600 uppercase tracking-[0.15em]">
                    AI Assistant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setMessages([]); setErrorMsg(null) }}
                  className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-white/5 hover:text-slate-400"
                  title="Clear chat"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
                <button
                  onClick={onToggle}
                  className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-white/5 hover:text-slate-400"
                  title="Close"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="h-[260px] overflow-y-auto scrollbar-thin p-4"
            >
              {messages.length === 0 && !isLoading && !isParsing && (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/5 border border-purple-500/10">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400/40">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-[10px] text-slate-500">
                      Ask me anything about your
                    </p>
                    <p className="font-mono text-[10px] text-slate-500">
                      knowledge base...
                    </p>
                    <p className="mt-2 font-mono text-[8px] text-slate-700">
                      Attach a file to chat about it or parse it into nodes
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 font-mono text-[11px] leading-relaxed [word-break:break-word] overflow-wrap-anywhere ${
                        msg.role === 'user'
                          ? 'bg-cyan-500/15 text-cyan-100 border border-cyan-500/10'
                          : msg.id.startsWith('sys-') && msg.content.startsWith('Created ')
                            ? 'bg-emerald-500/10 text-emerald-100 border border-emerald-500/10'
                            : 'bg-purple-500/10 text-purple-100 border border-purple-500/10'
                      }`}
                    >
                      {getDisplayContent(msg)}
                      {msg.id === typingMsgId && isTyping && (
                        <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-current" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator with elapsed time */}
                {(isLoading || isParsing) && !isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl bg-purple-500/10 px-4 py-3 border border-purple-500/10">
                      <div className="flex items-center gap-1">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-purple-400/60">
                        {isParsing ? 'Parsing nodes' : 'Thinking'}... {formatElapsed(elapsedSec)}
                      </span>
                      {elapsedSec > 10 && (
                        <span className="font-mono text-[8px] text-amber-400/60">
                          {elapsedSec > 45 ? 'Using fallback AI — may be slow' : 'AI is processing'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {errorMsg && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl bg-rose-500/10 px-3.5 py-2.5 border border-rose-500/15">
                      <div className="flex items-start gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-rose-400">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p className="font-mono text-[10px] text-rose-300 leading-relaxed">
                          {errorMsg}
                        </p>
                      </div>
                      <button
                        onClick={() => setErrorMsg(null)}
                        className="mt-1.5 font-mono text-[8px] text-rose-400/50 hover:text-rose-300 transition-colors"
                      >
                        dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* File info with action buttons */}
            {fileInfo && (
              <div className="border-t border-white/5 px-4 py-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="font-mono text-[9px] text-slate-400 truncate">
                      {fileInfo.name}
                    </span>
                    <span className="font-mono text-[8px] text-slate-600 shrink-0">
                      ({fileInfo.chars.toLocaleString()} chars)
                    </span>
                    {isLarge && (
                      <span className="rounded bg-amber-400/10 px-1.5 py-0.5 font-mono text-[8px] text-amber-400">
                        Large
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setFileInfo(null)}
                    className="text-slate-600 hover:text-slate-400 shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
                {/* Action buttons for file */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleParseNodes}
                    disabled={isParsing || isLoading}
                    className="flex-1 rounded-lg bg-emerald-500/15 border border-emerald-500/20 px-3 py-1.5 font-mono text-[9px] text-emerald-300 transition-all hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14" /><path d="M5 12h14" />
                    </svg>
                    Create Nodes from File
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isParsing || isLoading}
                    className="flex-1 rounded-lg bg-cyan-500/15 border border-cyan-500/20 px-3 py-1.5 font-mono text-[9px] text-cyan-300 transition-all hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Chat about File
                  </button>
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="flex items-center gap-2 border-t border-white/5 px-3 py-3">
              {/* File upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isTyping || isParsing}
                className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 disabled:opacity-30"
                title="Upload file (.txt, .md, .json, .csv)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DIRECT_INPUT) {
                    setInput(e.target.value)
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your knowledge..."
                disabled={isLoading || isTyping || isParsing}
                className="flex-1 border-none bg-transparent font-mono text-xs text-slate-300 placeholder:text-slate-600 outline-none disabled:opacity-50"
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !fileInfo) || isLoading || isTyping || isParsing}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400 transition-all hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4z" />
                  <path d="m22 2-11 11" />
                </svg>
              </button>
            </div>

            {/* Char count */}
            {input.length > 0 && (
              <div className="px-4 pb-2">
                <p className={`font-mono text-[8px] ${totalInputLen > MAX_DIRECT_INPUT ? 'text-rose-400' : 'text-slate-700'}`}>
                  {input.length}/{MAX_DIRECT_INPUT}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}