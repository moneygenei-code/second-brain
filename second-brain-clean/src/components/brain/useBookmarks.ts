'use client'

import { useCallback, useState } from 'react'

const STORAGE_KEY = 'second-brain-bookmarks'

function loadBookmarks(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: string[] = JSON.parse(raw)
      return new Set(parsed)
    }
  } catch { /* silent */ }
  return new Set()
}

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(loadBookmarks)

  const persist = useCallback((ids: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
    } catch { /* silent */ }
  }, [])

  const toggleBookmark = useCallback((nodeId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      persist(next)
      return next
    })
  }, [persist])

  const isBookmarked = useCallback(
    (nodeId: string) => bookmarkedIds.has(nodeId),
    [bookmarkedIds]
  )

  return { bookmarkedIds, toggleBookmark, isBookmarked }
}