'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { VALID_CATEGORIES, CATEGORY_COLORS } from '@/lib/types'

interface AddNodeProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    content: string
    category: string
    tags: string[]
  }) => void
  onAutoTag?: (data: { title: string; content: string }) => Promise<{ tags: string[]; category: string } | null>
  isLoading: boolean
  /** Pre-fill the title field (e.g. from uploaded filename) */
  initialTitle?: string
  /** Pre-fill the content field (e.g. from uploaded file text) */
  initialContent?: string
}

export default function AddNode({
  isOpen,
  onClose,
  onSubmit,
  onAutoTag,
  isLoading,
  initialTitle,
  initialContent,
}: AddNodeProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [autoTagging, setAutoTagging] = useState(false)

  // AI suggestion state
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [suggestedCategory, setSuggestedCategory] = useState<string>('')
  const [showSuggestBtn, setShowSuggestBtn] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced show suggest button after 100+ chars
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (content.length >= 100) {
      debounceRef.current = setTimeout(() => {
        setShowSuggestBtn(true)
      }, 800)
    } else {
      setShowSuggestBtn(false)
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [content])

  // Populate from initial props when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (initialTitle !== undefined) setTitle(initialTitle)
      if (initialContent !== undefined) setContent(initialContent)
    }
  }, [isOpen, initialTitle, initialContent])

  // Clear suggestions when content changes significantly
  useEffect(() => {
    setSuggestedTags([])
    setSuggestedCategory('')
  }, [content])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !category) return
    onSubmit({ title: title.trim(), content: content.trim(), category, tags })
  }

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleToggleSuggestedTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag)
      }
      return [...prev, tag]
    })
  }

  const handleAutoTag = async () => {
    if (!onAutoTag || !content.trim()) return
    setAutoTagging(true)
    try {
      const result = await onAutoTag({ title: title.trim(), content: content.trim() })
      if (result) {
        setSuggestedTags(result.tags)
        if (result.category && !category) {
          setSuggestedCategory(result.category)
        }
      }
    } finally {
      setAutoTagging(false)
    }
  }

  const handleApplySuggestedCategory = () => {
    if (suggestedCategory) {
      setCategory(suggestedCategory)
    }
  }

  const handleClose = () => {
    setTitle('')
    setContent('')
    setCategory('')
    setTagInput('')
    setTags([])
    setSuggestedTags([])
    setSuggestedCategory('')
    setShowSuggestBtn(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="max-w-md border-white/10 bg-[#0a0a12] backdrop-blur-xl [&_[data-slot=dialog-title]]:font-mono [&_[data-slot=dialog-title]]:text-sm [&_[data-slot=dialog-title]]:text-slate-300 [&_[data-slot=dialog-title]]:uppercase [&_[data-slot=dialog-title]]:tracking-[0.1em]">
        <DialogHeader>
          <DialogTitle>Add Knowledge Node</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter node title..."
              className="border-white/10 bg-white/[0.03] font-mono text-xs text-slate-300 placeholder:text-slate-600 focus-visible:border-cyan-500/30 focus-visible:ring-cyan-500/20"
            />
          </div>

          {/* Content */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                Content
              </label>
              {content.length >= 50 && (
                <span className="font-mono text-[7px] tabular-nums text-slate-600">
                  {content.length} chars
                </span>
              )}
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter knowledge content..."
              rows={5}
              className="border-white/10 bg-white/[0.03] font-mono text-xs text-slate-300 placeholder:text-slate-600 resize-none focus-visible:border-cyan-500/30 focus-visible:ring-cyan-500/20"
            />
            {/* AI Suggest Tags button — debounced, shows after 100+ chars */}
            {showSuggestBtn && !autoTagging && suggestedTags.length === 0 && (
              <button
                type="button"
                onClick={handleAutoTag}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.15em] text-cyan-400 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10"
              >
                  <span className="text-[11px]">✨</span>
                Suggest Tags
              </button>
            )}
            {/* AI thinking spinner */}
            {autoTagging && (
              <div className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/10 bg-cyan-500/[0.03] px-3 py-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-cyan-400/60">
                  AI analyzing content...
                </span>
              </div>
            )}
          </div>

          {/* AI Suggested Tags — clickable toggle pills */}
          {suggestedTags.length > 0 && (
            <div className="rounded-lg border border-purple-500/10 bg-purple-500/[0.04] p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                  <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
                </svg>
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-purple-400">
                  Suggested Tags
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedTags.map((tag) => {
                  const isActive = tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleSuggestedTag(tag)}
                      className={`rounded-full border px-2.5 py-1 font-mono text-[9px] transition-all ${
                        isActive
                          ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300 shadow-[0_0_8px_rgba(0,212,255,0.1)]'
                          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-slate-300'
                      }`}
                    >
                      {isActive && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block -mt-px">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI Suggested Category */}
          {suggestedCategory && !category && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                AI suggests:
              </span>
              <button
                type="button"
                onClick={handleApplySuggestedCategory}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[suggestedCategory] || CATEGORY_COLORS.general }}
                />
                {suggestedCategory}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
              Category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full border-white/10 bg-white/[0.03] font-mono text-xs text-slate-300 focus:ring-cyan-500/20">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#0a0a12] backdrop-blur-xl">
                {VALID_CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat}
                    value={cat}
                    className="font-mono text-xs text-slate-300 focus:bg-cyan-500/10 focus:text-cyan-400"
                  >
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                Tags
              </label>
              {onAutoTag && (
                <button
                  type="button"
                  onClick={handleAutoTag}
                  disabled={autoTagging || !content.trim()}
                  className="font-mono text-[8px] uppercase tracking-[0.15em] text-cyan-400 transition-colors hover:text-cyan-300 disabled:opacity-40"
                >
                  {autoTagging ? 'Analyzing...' : 'Auto-Tag'}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                placeholder="Add tag manually..."
                className="flex-1 border-white/10 bg-white/[0.03] font-mono text-xs text-slate-300 placeholder:text-slate-600 focus-visible:border-cyan-500/30 focus-visible:ring-cyan-500/20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddTag}
                className="h-9 border border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-300"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer border-white/10 bg-white/[0.03] font-mono text-[8px] text-slate-400 hover:border-rose-500/30 hover:text-rose-400"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || !category || isLoading}
              className="bg-cyan-500/20 font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-400 hover:bg-cyan-500/30"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                  Saving...
                </span>
              ) : (
                'Add Node'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}