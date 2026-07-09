'use client'

import { useState, useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { VALID_CATEGORIES } from '@/lib/types'

interface EditNodeData {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  pinned: boolean
}

interface EditNodeProps {
  isOpen: boolean
  onClose: () => void
  node: EditNodeData | null
  onSubmit: (data: EditNodeData) => void
  isLoading: boolean
  onDelete: (id: string) => void
  onAutoTag?: (data: { title: string; content: string }) => Promise<{ tags: string[]; category: string } | null>
}

export default function EditNode({
  isOpen,
  onClose,
  node,
  onSubmit,
  isLoading,
  onDelete,
  onAutoTag,
}: EditNodeProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [pinned, setPinned] = useState(false)
  const [autoTagging, setAutoTagging] = useState(false)

  useEffect(() => {
    if (node) {
      setTitle(node.title)
      setContent(node.content)
      setCategory(node.category)
      setTags(node.tags)
      setPinned(node.pinned)
      setTagInput('')
    }
  }, [node])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!node || !title.trim() || !content.trim() || !category) return
    onSubmit({
      id: node.id,
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
      pinned,
    })
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

  const handleAutoTag = async () => {
    if (!onAutoTag || !content.trim()) return
    setAutoTagging(true)
    try {
      const result = await onAutoTag({ title: title.trim(), content: content.trim() })
      if (result) {
        setTags(result.tags)
        if (result.category) setCategory(result.category)
      }
    } finally {
      setAutoTagging(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
        <DialogContent className="max-w-md border-white/10 bg-[#0a0a12] backdrop-blur-xl [&_[data-slot=dialog-title]]:font-mono [&_[data-slot=dialog-title]]:text-sm [&_[data-slot=dialog-title]]:text-slate-300 [&_[data-slot=dialog-title]]:uppercase [&_[data-slot=dialog-title]]:tracking-[0.1em]">
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
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
                className="border-white/10 bg-white/[0.03] font-mono text-xs text-slate-300 placeholder:text-slate-600 focus-visible:border-cyan-500/30 focus-visible:ring-cyan-500/20"
              />
            </div>

            {/* Content */}
            <div>
              <label className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                Content
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="border-white/10 bg-white/[0.03] font-mono text-xs text-slate-300 placeholder:text-slate-600 resize-none focus-visible:border-cyan-500/30 focus-visible:ring-cyan-500/20"
              />
            </div>

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
                  placeholder="Add tag..."
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

            {/* Pinned switch */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-400">Pinned</span>
              <Switch checked={pinned} onCheckedChange={setPinned} />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="font-mono text-[8px] uppercase tracking-[0.2em] text-rose-400 hover:bg-rose-500/10"
                  >
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-white/10 bg-[#0a0a12] backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-mono text-sm text-slate-300">
                      Delete Node
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-mono text-xs text-slate-400">
                      This will permanently remove &quot;{title}&quot; and all its connections.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10 bg-transparent font-mono text-xs text-slate-400 hover:bg-white/5">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (node) {
                          onDelete(node.id)
                          handleClose()
                        }
                      }}
                      className="bg-rose-500/20 font-mono text-xs text-rose-400 hover:bg-rose-500/30"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400 hover:bg-white/5"
              >
                Close
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
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}