import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callLLM } from '@/lib/llm'
import { VALID_CATEGORIES } from '@/lib/types'
import { authenticateRequest } from '@/lib/api-auth'

// ─── POST /api/nodes/smart-import ─────────────────────────────────────
// Takes extracted text from an uploaded file and uses AI to split it
// into multiple knowledge nodes with titles, categories, and tags.
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth

  try {
    const { text, filename } = (await req.json()) as {
      text?: string
      filename?: string
    }

    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: 'Text content is required (minimum 50 characters)' },
        { status: 400 },
      )
    }

    if (text.length > 100_000) {
      return NextResponse.json(
        { success: false, error: 'Text too large for smart import (max 100,000 characters). Use manual import or split the file.' },
        { status: 400 },
      )
    }

    const categoriesStr = VALID_CATEGORIES.join(', ')

    // For very long texts, truncate to avoid token limits but keep structure
    const maxInputChars = 30_000
    const inputText = text.length > maxInputChars
      ? text.slice(0, maxInputChars) + '\n\n[... content truncated for analysis ...]'
      : text

    const aiResponse = await callLLM(
      [
        {
          role: 'system',
          content: `You are a knowledge management assistant. Given a document or text file, split it into meaningful knowledge nodes.
Valid categories: ${categoriesStr}

Return ONLY a valid JSON array of objects. Each object must have:
- "title": A concise title for this section/topic (max 100 chars)
- "content": The actual content for this node (preserve the original text as much as possible)
- "category": One of: ${categoriesStr}
- "tags": Array of 2-5 lowercase tags

Rules:
- Split by natural topic boundaries (headings, paragraphs, sections, or logical groups)
- Each node should be self-contained and meaningful on its own
- Aim for 3-10 nodes depending on content length and structure
- If the text is very short or a single topic, return exactly 1 node
- Preserve important details, code snippets, and specific information
- Tags should be descriptive and useful for search
- Return ONLY the JSON array, no markdown fences or extra text`,
        },
        {
          role: 'user',
          content: `File: "${filename || 'imported.txt'}"\n\nContent:\n${inputText}`,
        },
      ],
      { temperature: 0.3, maxTokens: 4096 },
    )

    // Robust JSON extraction
    const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let nodes: Array<{ title: string; content: string; category: string; tags: string[] }>

    try {
      const parsed = JSON.parse(cleaned)
      nodes = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          nodes = JSON.parse(jsonMatch[0])
        } catch {
          return NextResponse.json({
            success: false,
            error: 'AI could not parse the document structure. Try a simpler file or import manually.',
          }, { status: 500 })
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'AI returned an unexpected format. Try importing manually instead.',
        }, { status: 500 })
      }
    }

    // Validate and sanitize each node
    const validNodes = nodes
      .filter((n) => n && typeof n.title === 'string' && n.title.trim().length > 0)
      .map((n) => ({
        title: String(n.title).trim().slice(0, 500),
        content: typeof n.content === 'string' ? n.content.trim() : '',
        category: (VALID_CATEGORIES as readonly string[]).includes(n.category) ? n.category : ('general' as const),
        tags: Array.isArray(n.tags)
          ? n.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim().toLowerCase()).slice(0, 10)
          : [],
      }))
      .filter((n) => n.content.length > 0)

    if (validNodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'AI could not extract any valid nodes from this file. Try importing manually.',
      }, { status: 500 })
    }

    // Create all nodes in the database
    const createdNodes: Array<{ id: string; title: string; category: string; tags: string[] }> = []

    for (const nodeData of validNodes) {
      const node = await db.knowledgeNode.create({
        data: {
          title: nodeData.title,
          content: nodeData.content,
          category: nodeData.category,
          source: 'imported',
        },
      })

      // Create tags
      const tagNames: string[] = []
      for (const tagName of nodeData.tags) {
        const tag = await db.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        })
        try {
          await db.knowledgeNodeTag.create({
            data: { nodeId: node.id, tagId: tag.id },
          })
          tagNames.push(tag.name)
        } catch {
          // unique constraint — ignore duplicate
        }
      }

      createdNodes.push({
        id: node.id,
        title: node.title,
        category: node.category,
        tags: tagNames,
      })
    }

    return NextResponse.json({
      success: true,
      imported: createdNodes.length,
      nodes: createdNodes,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}