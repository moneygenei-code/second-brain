import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// ─── GET /api/nodes/[id]/connections ───────────────────────────────────
// Returns all connections for a node (both outgoing and incoming).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Node ID is required' },
        { status: 400 },
      )
    }

    // Verify node exists
    const node = await db.knowledgeNode.findUnique({ where: { id } })
    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 },
      )
    }

    const [outgoing, incoming] = await Promise.all([
      db.nodeConnection.findMany({
        where: { fromNodeId: id },
        orderBy: { createdAt: 'desc' },
      }),
      db.nodeConnection.findMany({
        where: { toNodeId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      success: true,
      connections: {
        outgoing,
        incoming,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── POST /api/nodes/[id]/connections ──────────────────────────────────
// Create a new connection from this node to another.
// Body: { toNodeId: string, strength?: number, label?: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { id } = await params
    const body = await req.json()
    const { toNodeId, strength, label } = body as {
      toNodeId: string
      strength?: number
      label?: string
    }

    if (!id || !toNodeId) {
      return NextResponse.json(
        { success: false, error: 'Node ID and toNodeId are required' },
        { status: 400 },
      )
    }

    if (id === toNodeId) {
      return NextResponse.json(
        { success: false, error: 'Cannot connect a node to itself' },
        { status: 400 },
      )
    }

    // Verify both nodes exist
    const [fromNode, toNode] = await Promise.all([
      db.knowledgeNode.findUnique({ where: { id } }),
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
        fromNodeId: id,
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