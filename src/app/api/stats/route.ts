import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const [
      nodeCount,
      connectionCount,
      analysisCount,
      pinnedCount,
      tagCount,
      categoryRows,
      recentLogs,
    ] = await Promise.all([
      db.knowledgeNode.count(),
      db.nodeConnection.count(),
      db.analysisLog.count(),
      db.knowledgeNode.count({ where: { pinned: true } }),
      db.tag.count(),
      db.knowledgeNode.groupBy({ by: ['category'], _count: { category: true } }),
      db.analysisLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, type: true, summary: true, createdAt: true },
      }),
    ])

    const allContent = await db.knowledgeNode.findMany({ select: { content: true } })
    const totalCharacters = allContent.reduce((sum, n) => sum + (n.content?.length || 0), 0)

    const categories = categoryRows.map((r) => ({
      name: r.category,
      count: r._count.category,
    }))

    return NextResponse.json({
      success: true,
      stats: {
        nodeCount,
        connectionCount,
        analysisCount,
        totalCharacters,
        pinnedCount,
        tagCount,
        categories,
        recentLogs,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}