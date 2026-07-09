import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// ─── GET /api/activity ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const url = req.nextUrl
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200)
    const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0)

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.activityLog.count(),
    ])

    return NextResponse.json({ success: true, logs, total })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── POST /api/activity ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const body = await req.json()
    const { action, detail, category } = body as {
      action: string
      detail?: string
      category?: string
    }

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 },
      )
    }

    const log = await db.activityLog.create({
      data: {
        action: action.trim(),
        detail: detail || '',
        category: category || 'general',
      },
    })

    return NextResponse.json({ success: true, log })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── DELETE /api/activity ──────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    await db.activityLog.deleteMany()
    return NextResponse.json({ success: true, cleared: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}