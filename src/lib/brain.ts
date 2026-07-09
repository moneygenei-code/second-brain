// ─── Second Brain — Agent Memory Utility Module ────────────────────────
// Provides: auto-extraction of memories from agent outputs,
// formatting memories for LLM prompt injection, and brain import.

import { db } from '@/lib/db'
import { callLLM } from '@/lib/llm'

// ─── Types ────────────────────────────────────────────────────────────

export const MEMORY_CATEGORIES = ['insight', 'strategy', 'pattern', 'lesson', 'fact', 'preference'] as const
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number]

export interface StoredMemory {
  id: string
  content: string
  category: MemoryCategory
  source: string
  metadata: Record<string, unknown>
  relevance: number
  accessCount: number
  lastAccessedAt: string | null
  createdAt: string
  updatedAt: string
}

// ─── Auto-Extract Memories from Agent Output ──────────────────────────

const EXTRACTION_PROMPT = `You are a knowledge extraction engine. Analyze the following text and extract discrete, self-contained memories.

For each memory, assign one of these categories:
- insight: A non-obvious understanding or realization
- strategy: A plan, approach, or method for achieving something
- pattern: A recurring theme, structure, or trend
- lesson: Something learned from experience (often from a mistake)
- fact: A verifiable piece of information
- preference: A stated preference, constraint, or priority

Return a JSON array of objects with: { "content": "...", "category": "..." }
Only extract meaningful, durable memories — not trivial or transient details.
If nothing worth remembering is found, return an empty array [].

TEXT TO ANALYZE:
`

/**
 * Auto-extract memories from any text output (agent response, node content, etc.)
 * Uses LLM to identify and categorize insights.
 */
export async function extractMemories(
  text: string,
  source: string = 'auto-extract',
  options?: { maxTokens?: number }
): Promise<{ stored: number; errors: string[] }> {
  if (!text || text.length < 50) {
    return { stored: 0, errors: ['Text too short to extract memories'] }
  }

  // Truncate very long texts for the LLM prompt
  const truncated = text.length > 6000 ? text.slice(0, 6000) + '\n[...truncated...]' : text

  try {
    const raw = await callLLM(
      [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: truncated },
      ],
      { temperature: 0.2, maxTokens: options?.maxTokens ?? 2048 }
    )

    // Parse JSON array from LLM response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { stored: 0, errors: ['No JSON array found in LLM response'] }
    }

    const memories: Array<{ content: string; category: string }> = JSON.parse(jsonMatch[0])
    const validCategories = new Set<string>(MEMORY_CATEGORIES)
    let stored = 0
    const errors: string[] = []

    for (const mem of memories) {
      if (!mem.content || typeof mem.content !== 'string' || mem.content.length < 10) continue
      const cat = validCategories.has(mem.category) ? mem.category : 'insight'

      try {
        await db.agentMemory.create({
          data: {
            content: mem.content.trim().slice(0, 2000),
            category: cat,
            source,
            metadata: JSON.stringify({ extractedFrom: source }),
            relevance: 1.0,
          },
        })
        stored++
      } catch (err) {
        errors.push(`Failed to store: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }

    return { stored, errors }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return { stored: 0, errors: [`Extraction failed: ${msg}`] }
  }
}

// ─── Import Knowledge Nodes into Agent Memory ─────────────────────────

/**
 * Extract memories from all knowledge nodes in the brain.
 * Groups nodes by category and runs extraction on batches.
 */
export async function importFromBrain(options?: {
  category?: string
  maxNodes?: number
}): Promise<{ processed: number; stored: number; errors: string[] }> {
  const where: Record<string, unknown> = {}
  if (options?.category) where.category = options.category

  const nodes = await db.knowledgeNode.findMany({
    where,
    take: options?.maxNodes ?? 200,
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, content: true, category: true },
  })

  let totalStored = 0
  const allErrors: string[] = []

  for (const node of nodes) {
    const text = `${node.title}\n${node.content}`
    const result = await extractMemories(text, `brain:${node.id}`)
    totalStored += result.stored
    allErrors.push(...result.errors)
  }

  return { processed: nodes.length, stored: totalStored, errors: allErrors }
}

// ─── Format Memories for Prompt Injection ─────────────────────────────

/**
 * Format recent/relevant memories as a system prompt block for LLM injection.
 * Used by external agents to give the AI context from the brain.
 */
export async function formatMemoriesForPrompt(options?: {
  categories?: MemoryCategory[]
  limit?: number
  minRelevance?: number
  context?: string
}): Promise<string> {
  const limit = options?.limit ?? 20
  const minRelevance = options?.minRelevance ?? 0.3

  const where: Record<string, unknown> = {
    relevance: { gte: minRelevance },
  }

  if (options?.categories && options.categories.length > 0) {
    where.category = { in: options.categories }
  }

  const memories = await db.agentMemory.findMany({
    where,
    orderBy: [
      { relevance: 'desc' },
      { lastAccessedAt: { sort: 'desc', nulls: 'first' } },
      { createdAt: 'desc' },
    ],
    take: limit,
  })

  if (memories.length === 0) {
    return ''
  }

  // Group by category for clean formatting
  const byCategory = new Map<string, string[]>()
  for (const mem of memories) {
    const arr = byCategory.get(mem.category)
    if (arr) arr.push(mem.content)
    else byCategory.set(mem.category, [mem.content])
  }

  const sections: string[] = []
  for (const [cat, items] of byCategory) {
    const bulletList = items.map((c, i) => `  ${i + 1}. ${c}`).join('\n')
    sections.push(`<${cat.toUpperCase()}>\n${bulletList}\n</${cat.toUpperCase()}>`)
  }

  const header = options?.context
    ? `[AGENT MEMORY — ${options.context}]`
    : '[AGENT MEMORY — Persistent Knowledge]'

  const result = `${header}\nThe following memories are extracted from the Second Brain knowledge graph. Use them to inform your responses.\n\n${sections.join('\n\n')}`

  // Update access counts
  const ids = memories.map((m) => m.id)
  await db.agentMemory.updateMany({
    where: { id: { in: ids } },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  })

  return result
}

/**
 * Quick count of memories by category for dashboard display.
 */
export async function getMemoryStats(): Promise<{
  total: number
  byCategory: Record<string, number>
  recentCount: number
}> {
  const [total, byCategoryRaw, recentCount] = await Promise.all([
    db.agentMemory.count(),
    db.agentMemory.groupBy({
      by: ['category'],
      _count: true,
    }),
    db.agentMemory.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ])

  const byCategory: Record<string, number> = {}
  for (const row of byCategoryRaw) {
    byCategory[row.category] = row._count
  }

  return { total, byCategory, recentCount }
}