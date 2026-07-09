import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { formatMemoriesForPrompt } from '@/lib/brain'

// ─── POST /api/brain/query ─────────────────────────────────────────
// Query memories and optionally format them for LLM prompt injection.

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth

  try {
    const body = await req.json()
    const {
      query,
      categories,
      limit = 20,
      format = 'json',
      context,
    } = body as {
      query?: string
      categories?: string[]
      limit?: number
      format?: 'json' | 'prompt'
      context?: string
    }

    const where: Record<string, unknown> = {}
    if (categories && categories.length > 0) {
      where.category = { in: categories }
    }

    // If a query is provided, do simple keyword matching on content
    if (query && query.trim()) {
      const keywords = query.trim().split(/\s+/).filter((w) => w.length > 2)
      if (keywords.length > 0) {
        const conditions = keywords.map((kw) => ({
          content: { contains: kw },
        }))
        where.OR = conditions
      }
    }

    const memories = await db.agentMemory.findMany({
      where,
      orderBy: [
        { relevance: 'desc' },
        { lastAccessedAt: { sort: 'desc', nulls: 'first' } },
        { createdAt: 'desc' },
      ],
      take: Math.min(limit, 100),
    })

    // Update access counts
    if (memories.length > 0) {
      const ids = memories.map((m) => m.id)
      await db.agentMemory.updateMany({
        where: { id: { in: ids } },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      })
    }

    // Format for prompt injection
    if (format === 'prompt') {
      const promptBlock = await formatMemoriesForPrompt({
        categories: categories as any,
        limit,
        context: context || query || undefined,
      })
      return NextResponse.json({
        success: true,
        format: 'prompt',
        prompt: promptBlock,
        memoryCount: memories.length,
      })
    }

    // Default: JSON response
    const mapped = memories.map((m) => ({
      id: m.id,
      content: m.content,
      category: m.category,
      source: m.source,
      metadata: JSON.parse(m.metadata || '{}'),
      relevance: m.relevance,
      accessCount: m.accessCount,
      lastAccessedAt: m.lastAccessedAt,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      format: 'json',
      memories: mapped,
      count: mapped.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}