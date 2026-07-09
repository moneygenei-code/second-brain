// ─── Second Brain — Vector Embedding Utility ──────────────────────────
// Generates real vector embeddings using NVIDIA NV-Embed-V1.
// Falls back to TF-IDF in the embeddings API route if NVIDIA is unavailable.

import { NVIDIA_API_KEY, NVIDIA_BASE_URL } from '@/lib/llm'
import { createHash } from 'crypto'

// ─── In-memory embedding cache (session-level) ────────────────────────
const embeddingCache = new Map<string, number[]>()

/** Hash text for cache key using crypto (collision-safe) */
function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

// ─── Cosine Similarity ────────────────────────────────────────────────
/** Compute cosine similarity between two number arrays of equal length. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

// ─── NVIDIA Embedding Call ────────────────────────────────────────────
async function generateNvidiaEmbedding(text: string): Promise<number[]> {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured')
  }

  const res = await fetch(`${NVIDIA_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nv-embed-v1',
      input: text,
      input_type: 'query',
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`NVIDIA Embedding API ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  const embedding = data?.data?.[0]?.embedding
  if (!Array.isArray(embedding)) {
    throw new Error('No embedding returned from NVIDIA API')
  }

  return embedding as number[]
}

// ─── Main: Generate Embedding ─────────────────────────────────────────
/**
 * Generate a real vector embedding for the given text.
 * Uses NVIDIA NV-Embed-V1. Results are cached in memory for the session.
 * Throws if NVIDIA is unavailable — callers should fall back to TF-IDF.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return []
  }

  const cacheKey = hashText(text.trim())
  const cached = embeddingCache.get(cacheKey)
  if (cached) {
    return cached
  }

  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured')
  }

  const embedding = await generateNvidiaEmbedding(text.trim())
  embeddingCache.set(cacheKey, embedding)
  return embedding
}

// ─── Convenience: Embed + JSON Stringify for DB Storage ───────────────
/**
 * Generate an embedding and return it as a JSON string suitable for DB storage.
 */
export async function embedText(text: string): Promise<string> {
  const embedding = await generateEmbedding(text)
  return JSON.stringify(embedding)
}