// ─── API Key Authentication ─────────────────────────────────────────────
//
// Validates Bearer tokens against the hashed ApiKey entries in the database.
//
// Design decision:
//   - If NO Authorization header is present → request is from the local
//     browser UI and is allowed through (single-user personal knowledge base).
//   - If an Authorization header IS present → the token MUST be a valid
//     API key (sk-brain-...) that hashes to an entry in the ApiKey table.
//     This protects external API access (e.g. secondbrain-client.ts).
//
// Usage in route handlers:
//   import { authenticateRequest } from '@/lib/api-auth'
//   const auth = await authenticateRequest(req)
//   if (auth) return auth  // Returns 401 NextResponse if invalid
//

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// In-memory cache of valid key hashes to avoid a DB round-trip on every request.
// Map: SHA-256 hash → { expiresAt }
const _hashCache = new Map<string, number>()
const HASH_CACHE_TTL = 30_000 // 30 seconds

// Keys that are considered sensitive and should be redacted in GET /api/settings
const SENSITIVE_KEY_PATTERNS = [
  'apikey',
  'apiclientid',
  'apisecret',
  'token',
  'secret',
  'password',
  'credential',
  'private_key',
]

/** Check if a setting key name looks sensitive */
export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return SENSITIVE_KEY_PATTERNS.some((p) => lower.includes(p))
}

/** Redact a sensitive value, showing only first 8 chars + mask */
export function redactValue(value: string): string {
  if (value.length <= 12) return '••••••••'
  return value.slice(0, 8) + '••••••••'
}

/**
 * Authenticate a request.
 *
 * Returns `null` if the request is allowed (no auth header = browser UI).
 * Returns a 401 NextResponse if auth header present but invalid.
 */
export async function authenticateRequest(
  req: NextRequest,
): Promise<NextResponse | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null // No auth header → browser UI, allow

  // Must be Bearer scheme
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Invalid authorization scheme. Use: Bearer sk-brain-...' },
      { status: 401 },
    )
  }

  const token = authHeader.slice(7).trim()
  if (!token || !token.startsWith('sk-brain-')) {
    return NextResponse.json(
      { success: false, error: 'Invalid API key format. Keys start with sk-brain-' },
      { status: 401 },
    )
  }

  // Hash the provided token
  const hash = createHash('sha256').update(token).digest('hex')

  // Check in-memory cache first
  const cached = _hashCache.get(hash)
  if (cached && cached > Date.now()) {
    return null // Valid cached hash
  }

  // Validate against database
  try {
    const { db } = await import('@/lib/db')
    const keyEntry = await db.apiKey.findFirst({
      where: { keyHash: hash },
    })

    if (!keyEntry) {
      return NextResponse.json(
        { success: false, error: 'Invalid or revoked API key' },
        { status: 401 },
      )
    }

    // Check expiration
    if (keyEntry.expiresAt && keyEntry.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'API key has expired' },
        { status: 401 },
      )
    }

    // Update last used (fire-and-forget)
    db.apiKey
      .update({
        where: { id: keyEntry.id },
        data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
      })
      .catch(() => {})

    // Cache the valid hash
    _hashCache.set(hash, Date.now() + HASH_CACHE_TTL)

    return null // Authorized
  } catch {
    // DB error — fail open for browser UI, but this is a server error
    console.error('[api-auth] Database error during key validation')
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable' },
      { status: 503 },
    )
  }
}