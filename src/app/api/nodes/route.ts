import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { embedText } from '@/lib/embeddings'
import { authenticateRequest } from '@/lib/api-auth'

// ─── Helper: sync tags for a node ──────────────────────────────────────
async function syncTags(nodeId: string, tagNames: string[]) {
  await db.knowledgeNodeTag.deleteMany({ where: { nodeId } })
  for (const name of tagNames) {
    const tag = await db.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    await db.knowledgeNodeTag.create({
      data: { nodeId, tagId: tag.id },
    })
  }
}

// ─── Helper: map node with tags ────────────────────────────────────────
function mapNode(node: Record<string, unknown>) {
  const { tags, ...rest } = node as any
  return {
    ...rest,
    tags: tags.map((t: { tag: { name: string } }) => t.tag.name),
  }
}

// ─── GET /api/nodes ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const nodes = await db.knowledgeNode.findMany({
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const mapped = nodes.map(mapNode)
    return NextResponse.json({ success: true, nodes: mapped })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── POST /api/nodes ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const body = await req.json()
    const { title, content, category, tags } = body as {
      title: string
      content?: string
      category?: string
      tags?: string[]
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 },
      )
    }

    const node = await db.knowledgeNode.create({
      data: {
        title: title.trim(),
        content: content || '',
        category: category || 'general',
        source: 'manual',
      },
    })

    if (tags && Array.isArray(tags) && tags.length > 0) {
      await syncTags(node.id, tags.filter((t: string) => t.trim()))
    }

    const created = await db.knowledgeNode.findUnique({
      where: { id: node.id },
      include: { tags: { include: { tag: true } } },
    })

    // Fire-and-forget: generate vector embedding for the new node
    const textForEmbedding = `${title.trim()} ${content || ''}`.trim()
    if (textForEmbedding) {
      embedText(textForEmbedding)
        .then((embeddingStr) =>
          db.knowledgeNode.update({
            where: { id: node.id },
            data: { embedding: embeddingStr },
          }),
        )
        .catch((err) =>
          console.warn('[nodes] Auto-embedding failed for node', node.id, ':', err instanceof Error ? err.message : err),
        )
    }

    return NextResponse.json({
      success: true,
      node: created ? mapNode(created) : { ...node, tags: [] },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}