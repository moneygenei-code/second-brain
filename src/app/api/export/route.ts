import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// ─── GET /api/export?format=json|csv ─────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth) return auth
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    const [nodes, connections] = await Promise.all([
      db.knowledgeNode.findMany({
        include: { tags: { include: { tag: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.nodeConnection.findMany(),
    ])

    const mappedNodes = nodes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category,
      source: n.source || '',
      pinned: n.pinned,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      tags: n.tags.map((t) => t.tag.name),
    }))

    const mappedConnections = connections.map((c) => ({
      id: c.id,
      fromNodeId: c.fromNodeId,
      toNodeId: c.toNodeId,
      strength: c.strength,
      label: c.label || '',
      createdAt: c.createdAt.toISOString(),
    }))

    if (format === 'csv') {
      // CSV export: nodes
      const escapeCsv = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }

      const header = ['ID', 'Title', 'Content', 'Category', 'Source', 'Pinned', 'Tags', 'Created At', 'Updated At']
      const rows = mappedNodes.map((n) => [
        escapeCsv(n.id),
        escapeCsv(n.title),
        escapeCsv(n.content),
        escapeCsv(n.category),
        escapeCsv(n.source),
        n.pinned ? 'true' : 'false',
        escapeCsv(n.tags.join('; ')),
        escapeCsv(n.createdAt),
        escapeCsv(n.updatedAt),
      ].join(','))

      // Add connections section
      const csv = [
        header.join(','),
        ...rows,
        '',
        'CONNECTIONS',
        'From Node ID,To Node ID,Strength,Label,Created At',
        ...mappedConnections.map((c) => [
          escapeCsv(c.fromNodeId),
          escapeCsv(c.toNodeId),
          String(c.strength),
          escapeCsv(c.label),
          escapeCsv(c.createdAt),
        ].join(',')),
      ].join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="second-brain-export.csv"',
        },
      })
    }

    // JSON export (default)
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: 2,
      appName: 'Second Brain — Neural Knowledge Mesh',
      stats: {
        nodeCount: mappedNodes.length,
        connectionCount: mappedConnections.length,
        categories: [...new Set(mappedNodes.map((n) => n.category))],
      },
      nodes: mappedNodes,
      connections: mappedConnections,
    }

    const json = JSON.stringify(exportData, null, 2)

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="second-brain-export.json"',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}