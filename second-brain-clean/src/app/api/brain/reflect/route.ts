import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { callLLM } from '@/lib/llm'

// ─── POST /api/brain/reflect ──────────────────────────────────
// AI-powered reflection: analyze all memories, find patterns, boost relevance, decay stale ones.

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth

  try {
    const body = await req.json().catch(() => ({}))
    const { deep = false } = body as { deep?: boolean }

    const totalMemories = await db.agentMemory.count()
    if (totalMemories === 0) {
      return NextResponse.json({
        success: true,
        message: 'No memories to reflect on',
        actions: [],
        summary: 'Memory store is empty. Use /api/brain/store or /api/brain/insights to add memories first.',
      })
    }

    // ── 1. Decay stale memories (not accessed in 30 days) ──
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const staleResult = await db.agentMemory.updateMany({
      where: {
        lastAccessedAt: { lt: thirtyDaysAgo },
        relevance: { gt: 0.2 },
      },
      data: { relevance: { decrement: 0.1 } },
    })
    const decayed = staleResult.count

    // ── 2. Boost frequently accessed memories ──
    const hotMemories = await db.agentMemory.findMany({
      where: { accessCount: { gte: 5 } },
      take: 20,
    })
    let boosted = 0
    for (const mem of hotMemories) {
      if (mem.relevance < 2.0) {
        await db.agentMemory.update({
          where: { id: mem.id },
          data: { relevance: { increment: 0.05 } },
        })
        boosted++
      }
    }

    // ── 3. If deep mode, use LLM to find cross-memory patterns ──
    let aiInsight: string | null = null
    if (deep) {
      // Sample memories for the LLM (don't send everything)
      const sample = await db.agentMemory.findMany({
        orderBy: { relevance: 'desc' },
        take: 40,
        select: { content: true, category: true },
      })

      if (sample.length >= 3) {
        const memoryText = sample
          .map((m, i) => `[${i + 1}] [${m.category}] ${m.content}`)
          .join('\n')

        const prompt = `You are a reflection engine analyzing an agent's persistent memory store. Review these memories and identify:
1. Key patterns or themes that connect multiple memories
2. Contradictions or tensions between memories
3. Gaps — important areas where no memories exist yet
4. Recommendations — what the agent should learn or remember next

MEMORIES:
${memoryText}

Return your reflection as a concise text block (max 300 words). Be specific and actionable.`

        try {
          aiInsight = await callLLM(
            [{ role: 'user', content: prompt }],
            { temperature: 0.5, maxTokens: 1024 }
          )
        } catch {
          aiInsight = 'AI reflection unavailable — LLM providers are not configured.'
        }
      }
    }

    // ── 4. Build summary ──
    const stats = await db.agentMemory.groupBy({
      by: ['category'],
      _count: true,
    })
    const categorySummary = Object.fromEntries(stats.map((s) => [s.category, s._count]))

    const actions: string[] = []
    if (decayed > 0) actions.push(`Decayed ${decayed} stale memories (relevance -0.1)`)
    if (boosted > 0) actions.push(`Boosted ${boosted} frequently-accessed memories (relevance +0.05)`)
    if (deep && aiInsight) actions.push('Ran AI deep reflection')

    return NextResponse.json({
      success: true,
      message: `Reflected on ${totalMemories} memories`,
      actions,
      summary: aiInsight || `Memory store: ${totalMemories} memories across ${stats.length} categories. ${actions.join('. ') || 'No changes needed.'}`,
      categories: categorySummary,
      aiInsight: aiInsight || undefined,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}