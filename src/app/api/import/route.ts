import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// ─── POST /api/import ──────────────────────────────────────────────────
// Import a Second Brain JSON export. Supports two modes:
//   - "merge"  (default): add imported nodes/connections alongside existing
//   - "replace": delete ALL existing nodes/connections first, then import
//
// IDs are remapped to avoid collisions with existing data. Connections that
// reference node IDs in the export are rewired to the new IDs.
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const body = (await req.json()) as {
      mode?: 'merge' | 'replace'
      data?: unknown
    }

    const mode: 'merge' | 'replace' = body.mode === 'replace' ? 'replace' : 'merge'
    const data = body.data

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "data" field' },
        { status: 400 },
      )
    }

    const exportData = data as {
      nodes?: Array<{
        id?: string
        title?: string
        content?: string
        category?: string
        source?: string
        pinned?: boolean
        createdAt?: string
        updatedAt?: string
        tags?: string[]
      }>
      connections?: Array<{
        fromNodeId?: string
        toNodeId?: string
        strength?: number
        label?: string
      }>
    }

    const rawNodes = Array.isArray(exportData.nodes) ? exportData.nodes : []
    const rawConnections = Array.isArray(exportData.connections)
      ? exportData.connections
      : []

    if (rawNodes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No nodes found in import data' },
        { status: 400 },
      )
    }

    // Basic validation + sanitization of nodes
    const validNodes = rawNodes
      .filter(
        (n) =>
          n &&
          typeof n === 'object' &&
          typeof n.title === 'string' &&
          n.title.trim().length > 0,
      )
      .map((n) => ({
        originalId: String(n.id || ''),
        title: String(n.title).slice(0, 500),
        content: typeof n.content === 'string' ? n.content : '',
        category:
          typeof n.category === 'string' && n.category.trim()
            ? n.category.trim().toLowerCase()
            : 'general',
        source: typeof n.source === 'string' && n.source.trim() ? n.source : 'imported',
        pinned: Boolean(n.pinned),
        tags: Array.isArray(n.tags)
          ? n.tags
              .filter((t) => typeof t === 'string' && t.trim().length > 0)
              .map((t) => String(t).trim().toLowerCase())
              .slice(0, 20)
          : [],
      }))

    if (validNodes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid nodes with a title found in import data' },
        { status: 400 },
      )
    }

    // Sanitize connections (must reference two node ids present in the import)
    const validOriginalIds = new Set(validNodes.map((n) => n.originalId))
    const validConnections = rawConnections
      .filter(
        (c) =>
          c &&
          typeof c === 'object' &&
          typeof c.fromNodeId === 'string' &&
          typeof c.toNodeId === 'string' &&
          validOriginalIds.has(c.fromNodeId) &&
          validOriginalIds.has(c.toNodeId) &&
          c.fromNodeId !== c.toNodeId,
      )
      .map((c) => ({
        fromNodeId: String(c.fromNodeId),
        toNodeId: String(c.toNodeId),
        strength:
          typeof c.strength === 'number' && c.strength >= 0 && c.strength <= 1
            ? c.strength
            : 0.5,
        label: typeof c.label === 'string' ? c.label : '',
      }))

    // ─── Perform the import in a transaction ───
    const result = await db.$transaction(async (tx) => {
      let removedCount = 0

      // "replace" mode: wipe existing knowledge first (tags cascade)
      if (mode === 'replace') {
        const delNodes = await tx.knowledgeNode.deleteMany({})
        removedCount = delNodes.count
        await tx.tag.deleteMany({})
      }

      // Build ID remap (originalId -> new cuid)
      const idRemap = new Map<string, string>()
      let importedNodes = 0
      let importedTags = 0

      // Create nodes + tags
      for (const n of validNodes) {
        const created = await tx.knowledgeNode.create({
          data: {
            title: n.title,
            content: n.content,
            category: n.category,
            source: n.source,
            pinned: n.pinned,
          },
        })
        idRemap.set(n.originalId, created.id)
        importedNodes++

        for (const tagName of n.tags) {
          const tag = await tx.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          })
          try {
            await tx.knowledgeNodeTag.create({
              data: { nodeId: created.id, tagId: tag.id },
            })
            importedTags++
          } catch {
            // unique constraint — ignore
          }
        }
      }

      // Create connections (rewired to new IDs)
      let importedConnections = 0
      for (const c of validConnections) {
        const fromId = idRemap.get(c.fromNodeId)
        const toId = idRemap.get(c.toNodeId)
        if (!fromId || !toId) continue
        try {
          await tx.nodeConnection.create({
            data: {
              fromNodeId: fromId,
              toNodeId: toId,
              strength: c.strength,
              label: c.label,
            },
          })
          importedConnections++
        } catch {
          // ignore individual connection failures
        }
      }

      return {
        mode,
        removedCount,
        importedNodes,
        importedConnections,
        importedTags,
        skippedNodes: rawNodes.length - validNodes.length,
        skippedConnections: rawConnections.length - validConnections.length,
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
