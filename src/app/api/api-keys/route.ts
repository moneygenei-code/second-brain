import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'
import { authenticateRequest } from '@/lib/api-auth'

// ─── Helpers ──────────────────────────────────────────────────────────

function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const bytes = randomBytes(24)
  const hex = bytes.toString('hex')
  const fullKey = `sk-brain-${hex}`
  const prefix = fullKey.slice(0, 20) // "sk-brain-" + first 12 chars
  const hash = createHash('sha256').update(fullKey).digest('hex')
  return { fullKey, prefix, hash }
}

// ─── GET /api/api-keys ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const keys = await db.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      success: true,
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.keyPrefix,
        lastUsedAt: k.lastUsedAt,
        requestCount: k.requestCount,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── POST /api/api-keys ──────────────────────────────────────────────
// Body: { name?: string }
// Returns the full key ONLY on creation (never again).
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const body = await req.json().catch(() => ({}))
    const name = (body?.name as string) || 'Default'

    const { fullKey, prefix, hash } = generateApiKey()

    const key = await db.apiKey.create({
      data: {
        name,
        keyPrefix: prefix,
        keyHash: hash,
      },
    })

    // Return full key ONLY at creation time
    return NextResponse.json({
      success: true,
      apiKey: {
        id: key.id,
        name: key.name,
        key: fullKey,       // Full key — shown once
        prefix: key.keyPrefix,
        createdAt: key.createdAt,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── DELETE /api/api-keys ────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const body = await req.json()
    const { id } = body as { id: string }

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    }

    await db.apiKey.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}