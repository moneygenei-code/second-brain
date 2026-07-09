import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'

/**
 * POST /api/integrations/secondbrain
 * Test connection to an external Second Brain server.
 * Validates the URL and optionally the API key by hitting the /api/stats endpoint.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const body = await req.json()
    const { url, apiKey } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    // Basic URL validation
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { success: false, error: 'URL must use http:// or https://' },
        { status: 400 }
      )
    }

    // Clean the URL (remove trailing slash)
    const cleanUrl = parsedUrl.toString().replace(/\/+$/, '')

    // Test connection by hitting the server's stats endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    let response: Response
    try {
      response = await fetch(`${cleanUrl}/api/stats`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeout)
      return NextResponse.json(
        { success: false, error: `Could not reach server at ${cleanUrl}. Ensure the server is running.` },
        { status: 502 }
      )
    }
    clearTimeout(timeout)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed. Check your API key.' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { success: false, error: `Server returned ${response.status}. Is this a valid Second Brain instance?` },
        { status: 502 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: `Connected to ${cleanUrl}`,
      serverInfo: {
        url: cleanUrl,
        nodeCount: data?.stats?.nodeCount ?? 0,
        connectionCount: data?.stats?.connectionCount ?? 0,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}