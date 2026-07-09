import { NextRequest, NextResponse } from 'next/server'
import { callLLM } from '@/lib/llm'
import { VALID_CATEGORIES } from '@/lib/types'
import { authenticateRequest } from '@/lib/api-auth'

// ─── POST /api/nodes/auto-tag ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { title, content } = (await req.json()) as {
      title?: string
      content?: string
    }

    const safeTitle = typeof title === 'string' ? title.trim() : ''
    const safeContent = typeof content === 'string' ? content.trim() : ''

    if (!safeTitle && !safeContent) {
      return NextResponse.json(
        { success: false, error: 'Title or content is required' },
        { status: 400 },
      )
    }

    const categoriesStr = VALID_CATEGORIES.join(', ')

    const aiResponse = await callLLM(
      [
        {
          role: 'system',
          content: `You are a knowledge management tagger. Given a title and optional content, suggest relevant tags and a category.
Valid categories: ${categoriesStr}

Return ONLY valid JSON with exactly this shape:
{ "tags": ["tag1", "tag2", "tag3"], "category": "one-of-the-categories" }

Rules:
- Suggest 2-5 tags that are concise, lowercase, and descriptive
- Tags should be single words or short phrases (max 3 words)
- Choose the most appropriate category from the valid list
- Return ONLY the JSON object, no other text`,
        },
        {
          role: 'user',
          content: `${safeTitle ? `Title: "${safeTitle}"\n` : ''}${safeContent ? `Content: ${safeContent.slice(0, 2000)}` : ''}`,
        },
      ],
      { temperature: 0.3, maxTokens: 200 },
    )

    const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Robust JSON extraction — handle LLMs that wrap JSON in prose
    let result: Record<string, unknown>
    try {
      result = JSON.parse(cleaned)
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0])
        } catch {
          return NextResponse.json({
            success: false,
            error: 'LLM returned invalid JSON — could not parse tag suggestions',
          }, { status: 500 })
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'LLM did not return any parseable JSON',
        }, { status: 500 })
      }
    }

    const tags = Array.isArray(result.tags)
      ? result.tags.filter((t: unknown) => typeof t === 'string').slice(0, 10)
      : []
    const category =
      typeof result.category === 'string' && VALID_CATEGORIES.includes(result.category as typeof VALID_CATEGORIES[number])
        ? result.category
        : 'general'

    return NextResponse.json({ success: true, tags, category })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}