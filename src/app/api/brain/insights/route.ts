import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { getMemoryStats, importFromBrain, extractMemories } from '@/lib/brain'

// ─── GET /api/brain/insights ──────────────────────────────────────
// Get memory statistics, or trigger brain import / auto-extraction.

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth

  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    // Action: import from brain nodes
    if (action === 'import') {
      const category = searchParams.get('category') || undefined
      const maxNodes = parseInt(searchParams.get('maxNodes') || '50', 10)
      const result = await importFromBrain({ category, maxNodes })
      return NextResponse.json({ success: true, action: 'import', ...result })
    }

    // Default: return stats
    const stats = await getMemoryStats()
    return NextResponse.json({ success: true, stats })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── POST /api/brain/insights ─────────────────────────────────────
// Extract memories from provided text using LLM.

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth

  try {
    const body = await req.json()
    const { text, source } = body as { text?: string; source?: string }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Provide "text" field to extract memories from' },
        { status: 400 }
      )
    }

    const result = await extractMemories(text, source || 'api-insights')
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}