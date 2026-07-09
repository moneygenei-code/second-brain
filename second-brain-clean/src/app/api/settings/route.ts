import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, isSensitiveKey, redactValue } from '@/lib/api-auth'

// ─── GET /api/settings ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const settings = await db.systemSetting.findMany()
    const map: Record<string, { value: string; category: string; redacted?: boolean }> = {}
    for (const s of settings) {
      if (isSensitiveKey(s.key)) {
        map[s.key] = { value: redactValue(s.value), category: s.category, redacted: true }
      } else {
        map[s.key] = { value: s.value, category: s.category }
      }
    }
    return NextResponse.json({ success: true, settings: map })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── PUT /api/settings ─────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const body = await req.json()
    const { key, value } = body as { key: string; value: string }

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 },
      )
    }

    // Guard: never overwrite a real API key with a redacted/masked value
    if (isSensitiveKey(key) && value && value.includes('•')) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Value appears redacted — key was not updated.',
      })
    }

    const setting = await db.systemSetting.upsert({
      where: { key },
      update: { value: value ?? '' },
      create: { key, value: value ?? '' },
    })

    // Invalidate LLM key cache if an API key or provider setting changed
    if (key === 'nvidiaApiKey' || key === 'groqApiKey' || key === 'llmProvider') {
      // Dynamic import to avoid circular dependency at module level
      const { invalidateApiKeyCache } = await import('@/lib/llm')
      invalidateApiKeyCache()
    }

    return NextResponse.json({
      success: true,
      setting: { key: setting.key, value: setting.value, category: setting.category },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}