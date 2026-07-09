import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// ─── DELETE /api/connections/[id] ──────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Connection ID is required' },
        { status: 400 },
      )
    }

    const existing = await db.nodeConnection.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 },
      )
    }

    await db.nodeConnection.delete({ where: { id } })

    return NextResponse.json({ success: true, deleted: id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}