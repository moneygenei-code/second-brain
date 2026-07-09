import { NextRequest, NextResponse } from 'next/server'
import { callLLM, chunkText } from '@/lib/llm'
import { authenticateRequest } from '@/lib/api-auth'

// ─── In-memory conversation store ──────────────────────────────────────
const MAX_MESSAGES = 50
const conversations = new Map<string, { role: 'user' | 'assistant' | 'system'; content: string }[]>()

const ARCHITECT_SYSTEM_PROMPT =
  'You are the Architect, an AI assistant for a knowledge management system. Help users think through ideas, analyze stored knowledge, and provide useful insights. Be concise but thorough.'

// ─── POST /api/architect ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const body = await req.json()
    const { message, sessionId, pastMessages } = body as {
      message: string
      sessionId?: string
      pastMessages?: { role: string; content: string }[]
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 },
      )
    }

    const sid = sessionId || 'default'
    let history = conversations.get(sid) || []

    // Pre-populate history from pastMessages if provided
    if (pastMessages && Array.isArray(pastMessages) && history.length === 0) {
      for (const pm of pastMessages.slice(-MAX_MESSAGES)) {
        if (pm.role === 'user' || pm.role === 'assistant') {
          history.push({ role: pm.role, content: pm.content })
        }
      }
    }

    // Build the messages array for the LLM
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
      ...history.slice(-MAX_MESSAGES + 1),
      { role: 'user', content: message },
    ]

    let response: string

    // For very long messages, chunk and process
    if (message.length > 6000) {
      const chunks = chunkText(message, 6000, 200)
      const results: string[] = []

      for (const chunk of chunks) {
        const chunkMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
          { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
          ...history.slice(-20), // Recent context for each chunk
          { role: 'user', content: chunk },
        ]
        const chunkResponse = await callLLM(chunkMessages, { temperature: 0.7, maxTokens: 2048 })
        results.push(chunkResponse)
      }

      // Combine results with a follow-up synthesis call
      if (results.length > 1) {
        response = await callLLM(
          [
            { role: 'system', content: 'Combine these partial responses into one coherent, complete response. Maintain the same tone and depth.' },
            { role: 'user', content: results.join('\n\n---\n\n') },
          ],
          { temperature: 0.5, maxTokens: 2048 },
        )
      } else {
        response = results[0]
      }
    } else {
      response = await callLLM(messages, { temperature: 0.7, maxTokens: 2048 })
    }

    // Update conversation history
    history.push({ role: 'user', content: message })
    history.push({ role: 'assistant', content: response })

    // Trim to max
    if (history.length > MAX_MESSAGES) {
      history = history.slice(-MAX_MESSAGES)
    }

    conversations.set(sid, history)

    return NextResponse.json({
      success: true,
      response,
      messageCount: history.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── DELETE /api/architect ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { searchParams } = req.nextUrl
    const sessionId = searchParams.get('sessionId') || 'default'
    conversations.delete(sessionId)
    return NextResponse.json({ success: true, cleared: sessionId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}