import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { MEMORY_CATEGORIES } from '@/lib/brain'

// ─── POST /api/brain/store ──────────────────────────────────────────
// Store one or more memories. Also supports auto-extraction from text.

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth

  try {
    const body = await req.json()
    const { memories, text, source, autoExtract } = body as {
      memories?: Array<{ content: string; category?: string; source?: string; metadata?: Record<string, unknown> }>
      text?: string
      source?: string
      autoExtract?: boolean
    }

    // Auto-extract from raw text
    if (autoExtract && text) {
      const { extractMemories } = await import('@/lib/brain')
      const result = await extractMemories(text, source || 'api-store')
      return NextResponse.json({
        success: true,
        method: 'auto-extract',
        stored: result.stored,
        errors: result.errors,
      })
    }

    // Manual store: array of memories
    if (!memories || !Array.isArray(memories) || memories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Provide "memories" array or "text" with "autoExtract: true"' },
        { status: 400 }
      )
    }

    const validCategories = new Set<string>(MEMORY_CATEGORIES)
    const created: Array<{ id: string; content: string; category: string }> = []

    for (const mem of memories) {
      if (!mem.content || typeof mem.content !== 'string') continue
      const cat = validCategories.has(mem.category || '') ? mem.category! : 'insight'

      const record = await db.agentMemory.create({
        data: {
          content: mem.content.trim().slice(0, 2000),
          category: cat,
          source: mem.source || source || 'manual',
          metadata: mem.metadata ? JSON.stringify(mem.metadata) : '{}',
          relevance: 1.0,
        },
      })
      created.push({ id: record.id, content: record.content, category: record.category })
    }

    return NextResponse.json({
      success: true,
      method: 'manual',
      stored: created.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}