import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// ─── GET /api/connections ──────────────────────────────────────────────
// Supports ?unified=true to merge DB connections with tag-computed connections
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { searchParams } = new URL(req.url)
    const unified = searchParams.get('unified') === 'true'

    if (unified) {
      // 1. Fetch all DB connections
      const dbConns = await db.nodeConnection.findMany({
        orderBy: { createdAt: 'desc' },
      })

      // 2. Fetch all nodes with tags for tag-computed connections
      const allNodes = await db.knowledgeNode.findMany({
        include: { tags: { include: { tag: true } } },
      })

      // 3. Compute tag-based connections (same logic as InteractiveNodes)
      const tagMap = new Map<string, string[]>()
      for (const node of allNodes) {
        for (const nt of node.tags) {
          const tagName = nt.tag.name
          const ids = tagMap.get(tagName)
          if (ids) ids.push(node.id)
          else tagMap.set(tagName, [node.id])
        }
      }

      // Collect all pairs with score (number of shared tags)
      const pairScores = new Map<string, number>()
      for (const ids of tagMap.values()) {
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const key = [ids[i], ids[j]].sort().join('::')
            pairScores.set(key, (pairScores.get(key) ?? 0) + 1)
          }
        }
      }

      // 4. Build a set of DB connection keys for dedup
      const dbConnKeys = new Set<string>()
      for (const c of dbConns) {
        const key = [c.fromNodeId, c.toNodeId].sort().join('::')
        dbConnKeys.add(key)
      }

      // 5. Start with DB connections
      const unifiedConnections: Array<{
        from: string
        to: string
        source: string
        strength: number
        label: string
      }> = dbConns.map((c) => ({
        from: c.fromNodeId,
        to: c.toNodeId,
        source: 'db',
        strength: c.strength,
        label: c.label,
      }))

      // 6. Add tag-computed connections (skip if already in DB)
      const MAX_TAG_CONNECTIONS = 150
      const sortedPairs = Array.from(pairScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_TAG_CONNECTIONS)

      for (const [key, score] of sortedPairs) {
        if (dbConnKeys.has(key)) continue
        const [from, to] = key.split('::')
        unifiedConnections.push({
          from,
          to,
          source: 'tags',
          strength: Math.min(score / 5, 0.5), // Normalize tag strength
          label: '',
        })
      }

      // Sort: DB connections first, then tag connections
      unifiedConnections.sort((a, b) => {
        if (a.source === 'db' && b.source !== 'db') return -1
        if (a.source !== 'db' && b.source === 'db') return 1
        return b.strength - a.strength
      })

      return NextResponse.json({ success: true, unifiedConnections })
    }

    // Default: return raw DB connections
    const connections = await db.nodeConnection.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, connections })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── POST /api/connections ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const body = await req.json()
    const { fromNodeId, toNodeId, strength, label } = body as {
      fromNodeId: string
      toNodeId: string
      strength?: number
      label?: string
    }

    if (!fromNodeId || !toNodeId) {
      return NextResponse.json(
        { success: false, error: 'fromNodeId and toNodeId are required' },
        { status: 400 },
      )
    }

    if (fromNodeId === toNodeId) {
      return NextResponse.json(
        { success: false, error: 'Cannot connect a node to itself' },
        { status: 400 },
      )
    }

    // Verify both nodes exist
    const [fromNode, toNode] = await Promise.all([
      db.knowledgeNode.findUnique({ where: { id: fromNodeId } }),
      db.knowledgeNode.findUnique({ where: { id: toNodeId } }),
    ])

    if (!fromNode || !toNode) {
      return NextResponse.json(
        { success: false, error: 'One or both nodes not found' },
        { status: 404 },
      )
    }

    const connection = await db.nodeConnection.create({
      data: {
        fromNodeId,
        toNodeId,
        strength: typeof strength === 'number' ? Math.max(0, Math.min(1, strength)) : 0.5,
        label: label || '',
      },
    })

    return NextResponse.json({ success: true, connection })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}