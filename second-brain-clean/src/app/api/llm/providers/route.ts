import { NextResponse } from 'next/server'
import { NVIDIA_API_KEY, NVIDIA_MODEL, GROQ_API_KEY, GROQ_MODEL } from '@/lib/llm'
import { db } from '@/lib/db'

// ─── GET /api/llm/providers ─────────────────────────────────────────
// Returns which providers have API keys configured (key presence only, never the key itself).
// Checks both env vars and DB-stored keys.
export async function GET() {
  // Check DB for stored keys (non-redacted values)
  let dbNvidia = false
  let dbGroq = false
  try {
    const rows = await db.systemSetting.findMany({
      where: { key: { in: ['nvidiaApiKey', 'groqApiKey'] } },
      select: { key: true, value: true },
    })
    for (const row of rows) {
      const val = row.value || ''
      // A redacted value (contains •) means the real key exists but we can't see it
      if (val.includes('•') || val.length > 0) {
        if (row.key === 'nvidiaApiKey') dbNvidia = true
        if (row.key === 'groqApiKey') dbGroq = true
      }
    }
  } catch {
    // DB unavailable — just use env vars
  }

  return NextResponse.json({
    success: true,
    providers: {
      nvidia: !!NVIDIA_API_KEY || dbNvidia,
      groq: !!GROQ_API_KEY || dbGroq,
    },
    models: {
      nvidia: NVIDIA_MODEL,
      groq: GROQ_MODEL,
    },
  })
}