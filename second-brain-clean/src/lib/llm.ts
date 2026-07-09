// ─── Second Brain — Server-side Utilities ────────────────────────────

// Provider types
export type LLMProvider = 'nvidia' | 'groq'

// NVIDIA API config
export const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
export const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct'
export const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || ''

// Groq API config
export const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
export const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
export const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

// ─── Text Chunking for Large Inputs ──────────────────────────────────
// NVIDIA llama-3.1-70b has a 128k context window, but we chunk
// to keep requests fast and avoid token limit issues.

const MAX_CHARS_PER_CHUNK = 6000
const OVERLAP_CHARS = 200

export function chunkText(text: string, maxChars = MAX_CHARS_PER_CHUNK, overlap = OVERLAP_CHARS): string[] {
  if (text.length <= maxChars) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length)

    // Try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end)
      const lastNewline = text.lastIndexOf('\n', end)
      const breakPoint = Math.max(lastPeriod, lastNewline)

      if (breakPoint > start + maxChars * 0.5) {
        end = breakPoint + 1
      }
    }

    chunks.push(text.slice(start, end).trim())
    start = end - overlap

    if (start >= text.length) break
    // Avoid infinite loop on very small overlaps
    if (chunks.length > 100) break
  }

  return chunks.filter((c) => c.length > 0)
}

// ─── NVIDIA LLM Call ─────────────────────────────────────────────────
interface NvidiaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

function callNvidiaWithKey(
  apiKey: string,
  messages: NvidiaMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  return fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: false,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`NVIDIA API ${res.status}: ${errText.slice(0, 300)}`)
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('No response from NVIDIA API')
    return content
  })
}

export async function callNvidia(
  messages: NvidiaMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY not configured')
  return callNvidiaWithKey(NVIDIA_API_KEY, messages, options)
}

// ─── Groq LLM Call ─────────────────────────────────────────────────
function callGroqWithKey(
  apiKey: string,
  messages: NvidiaMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  return fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: false,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Groq API ${res.status}: ${errText.slice(0, 300)}`)
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('No response from Groq API')
    return content
  })
}

export async function callGroq(
  messages: NvidiaMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured')
  return callGroqWithKey(GROQ_API_KEY, messages, options)
}

// ─── DB-backed API key lookup (with in-memory cache) ────────────────
// Users can set API keys in the Settings UI, stored as SystemSetting rows.
// These are checked as a fallback when env vars are empty.
let _cachedDbKeys: { nvidia: string; groq: string; ts: number } | null = null
const DB_KEY_CACHE_TTL = 10_000 // 10 seconds

async function getDbApiKeys(): Promise<{ nvidia: string; groq: string }> {
  if (_cachedDbKeys && Date.now() - _cachedDbKeys.ts < DB_KEY_CACHE_TTL) {
    return { nvidia: _cachedDbKeys.nvidia, groq: _cachedDbKeys.groq }
  }
  try {
    const { db } = await import('@/lib/db')
    const rows = await db.systemSetting.findMany({
      where: { key: { in: ['nvidiaApiKey', 'groqApiKey'] } },
    })
    let nvidia = ''
    let groq = ''
    for (const row of rows) {
      const val = row.value || ''
      // Skip redacted values (contain •••)
      if (val.includes('•')) continue
      if (row.key === 'nvidiaApiKey') nvidia = val
      if (row.key === 'groqApiKey') groq = val
    }
    _cachedDbKeys = { nvidia, groq, ts: Date.now() }
    return { nvidia, groq }
  } catch {
    return { nvidia: '', groq: '' }
  }
}

/** Invalidate DB key cache (called after saving a new key) */
export function invalidateApiKeyCache(): void {
  _cachedDbKeys = null
}

// ─── Unified LLM Call ────────────────────────────────────────────────
// Reads provider preference from DB settings. Tries chosen provider, then fallback.
// Provider is read once per request and cached for the call duration.
let _cachedProvider: { provider: LLMProvider; ts: number } | null = null
const PROVIDER_CACHE_TTL = 5000 // 5 seconds

async function getActiveProvider(): Promise<LLMProvider> {
  // Check memory cache
  if (_cachedProvider && Date.now() - _cachedProvider.ts < PROVIDER_CACHE_TTL) {
    return _cachedProvider.provider
  }
  try {
    const { db } = await import('@/lib/db')
    const setting = await db.systemSetting.findUnique({ where: { key: 'llmProvider' } })
    const provider = (setting?.value as LLMProvider) || 'nvidia'
    _cachedProvider = { provider, ts: Date.now() }
    return provider
  } catch {
    return 'nvidia'
  }
}

/** Resolve an API key: env var first, then DB setting */
async function resolveKey(provider: LLMProvider): Promise<string> {
  if (provider === 'nvidia' && NVIDIA_API_KEY) return NVIDIA_API_KEY
  if (provider === 'groq' && GROQ_API_KEY) return GROQ_API_KEY
  const dbKeys = await getDbApiKeys()
  return provider === 'nvidia' ? dbKeys.nvidia : dbKeys.groq
}

export async function callLLM(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const provider = await getActiveProvider()
  const calls: Array<{ fn: () => Promise<string>; name: string }> = []

  // Resolve keys from env or DB (async)
  const [nvidiaKey, groqKey] = await Promise.all([
    resolveKey('nvidia'),
    resolveKey('groq'),
  ])

  if (provider === 'nvidia' && nvidiaKey) {
    calls.push({ fn: () => callNvidiaWithKey(nvidiaKey, messages, options), name: 'NVIDIA' })
    if (groqKey) calls.push({ fn: () => callGroqWithKey(groqKey, messages, options), name: 'Groq' })
  } else if (provider === 'groq' && groqKey) {
    calls.push({ fn: () => callGroqWithKey(groqKey, messages, options), name: 'Groq' })
    if (nvidiaKey) calls.push({ fn: () => callNvidiaWithKey(nvidiaKey, messages, options), name: 'NVIDIA' })
  } else {
    // No API key for chosen provider — try whichever is available
    if (nvidiaKey) calls.push({ fn: () => callNvidiaWithKey(nvidiaKey, messages, options), name: 'NVIDIA' })
    if (groqKey) calls.push({ fn: () => callGroqWithKey(groqKey, messages, options), name: 'Groq' })
  }

  // Try each provider
  for (const { fn, name } of calls) {
    try {
      return await fn()
    } catch (err) {
      console.warn(`[llm] ${name} call failed:`, err instanceof Error ? err.message : err)
    }
  }

  const hasAnyKey = nvidiaKey || groqKey
  throw new Error(
    `All AI providers unavailable. ` +
    (hasAnyKey
      ? `Configured providers (NVIDIA/Groq) all failed. Check your API keys and try again.`
      : `No LLM API keys configured. Go to Settings → Configuration → LLM Backend to add a key.`)
  )
}