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

// ─── GET /api/nodes/[id] ───────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { id } = await params
    const node = await db.knowledgeNode.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    })

    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, node: mapNode(node) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── PUT /api/nodes/[id] ───────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { id } = await params
    const body = await req.json()
    const { title, content, category, pinned, tags } = body as {
      title?: string
      content?: string
      category?: string
      pinned?: boolean
      tags?: string[]
    }

    const existing = await db.knowledgeNode.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 },
      )
    }

    const updated = await db.knowledgeNode.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(pinned !== undefined ? { pinned } : {}),
      },
    })

    if (tags && Array.isArray(tags)) {
      await syncTags(id, tags.filter((t: string) => t.trim()))
    }

    // Re-embed only this node if title or content changed (non-blocking, best-effort)
    const needsReEmbed = (title !== undefined || content !== undefined)
    if (needsReEmbed) {
      const updatedNode = await db.knowledgeNode.findUnique({ where: { id } })
      if (updatedNode) {
        const text = `${updatedNode.title} ${updatedNode.content}`.trim()
        if (text) {
          embedText(text)
            .then((embeddingStr) =>
              db.knowledgeNode.update({
                where: { id },
                data: { embedding: embeddingStr },
              })
            )
            .catch(() => { /* best-effort — don't fail the save */ })
        }
      }
    }

    const node = await db.knowledgeNode.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    })

    return NextResponse.json({
      success: true,
      node: node ? mapNode(node) : { ...updated, tags: [] },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── DELETE /api/nodes/[id] ────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { id } = await params
    const existing = await db.knowledgeNode.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 },
      )
    }

    await db.knowledgeNode.delete({ where: { id } })
    return NextResponse.json({ success: true, deleted: id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}