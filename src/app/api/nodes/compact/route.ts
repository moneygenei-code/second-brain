import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// ─── POST /api/nodes/compact ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { category } = (await req.json()) as { category: string }

    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Category is required' },
        { status: 400 },
      )
    }

    const where = category === 'all' ? {} : { category: category.trim() }
    const nodes = await db.knowledgeNode.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'asc' },
    })

    if (nodes.length < 2) {
      return NextResponse.json({
        success: false,
        error: `Need at least 2 nodes to compact. Found ${nodes.length}.`,
      })
    }

    // Collect all unique tag names
    const allTags = new Set<string>()
    for (const node of nodes) {
      for (const t of node.tags) {
        allTags.add(t.tag.name)
      }
    }

    // Build combined content
    const combinedContent = nodes
      .map((n) => `## ${n.title}\n${n.content}`)
      .join('\n\n---\n\n')

    const compactedTitle =
      category === 'all'
        ? `Compacted Knowledge (${nodes.length} nodes)`
        : `Compacted ${category} (${nodes.length} nodes)`

    // Create the compacted node in a transaction
    const newNode = await db.$transaction(async (tx) => {
      const compacted = await tx.knowledgeNode.create({
        data: {
          title: compactedTitle,
          content: combinedContent,
          category: 'compacted',
          source: 'compaction',
        },
      })

      // Sync tags
      for (const name of allTags) {
        const tag = await tx.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
        await tx.knowledgeNodeTag.create({
          data: { nodeId: compacted.id, tagId: tag.id },
        })
      }

      // Delete source nodes (cascade handles their tags/connections)
      const ids = nodes.map((n) => n.id)
      await tx.knowledgeNode.deleteMany({ where: { id: { in: ids } } })

      return compacted
    })

    // Fetch the new node with tags
    const created = await db.knowledgeNode.findUnique({
      where: { id: newNode.id },
      include: { tags: { include: { tag: true } } },
    })

    const mapped = created
      ? {
          ...created,
          tags: created.tags.map((t) => t.tag.name),
        }
      : { ...newNode, tags: [] }

    return NextResponse.json({
      success: true,
      removedCount: nodes.length,
      newNode: mapped,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}