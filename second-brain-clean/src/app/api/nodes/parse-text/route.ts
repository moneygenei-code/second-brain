import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callLLM, chunkText } from '@/lib/llm'
import { authenticateRequest } from '@/lib/api-auth'
import { VALID_CATEGORIES } from '@/lib/types'

// ─── POST /api/nodes/parse-text ─────────────────────────────────────
// Takes raw text (e.g. from an uploaded .txt/.md file) and uses the LLM
// to split it into structured knowledge nodes, then creates them.
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { text, filename, source } = (await req.json()) as {
      text?: string
      filename?: string
      source?: string
    }

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Text content is required (min 10 chars)' },
        { status: 400 },
      )
    }

    const safeSource = typeof source === 'string' ? source : (filename || 'uploaded-file')

    // For very short texts, create a single node directly (no LLM needed)
    if (text.length <= 1500) {
      const lines = text.split('\n').filter((l) => l.trim())
      const title = filename
        ? filename.replace(/\.[^.]+$/, '')
        : (lines[0]?.slice(0, 100) || 'Untitled Note')
      const content = lines.slice(0, 50).join('\n')

      const node = await db.knowledgeNode.create({
        data: {
          title: title.slice(0, 200),
          content,
          category: 'general',
          source: safeSource,
        },
      })

      return NextResponse.json({
        success: true,
        nodesCreated: 1,
        nodes: [{ id: node.id, title: node.title }],
      })
    }

    // For longer texts, use LLM to parse into structured nodes
    const chunks = chunkText(text, 8000, 500)
    const allParsedNodes: Array<{ title: string; content: string; tags: string[]; category: string }> = []
    let llmFailures = 0

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const isLast = i === chunks.length - 1
      const chunkInfo = chunks.length > 1 ? ` (part ${i + 1} of ${chunks.length})` : ''

      const prompt = `Parse the following text into knowledge nodes. Each node should capture a distinct topic, idea, or section.

Rules:
- Extract 1-5 nodes from this text${chunkInfo}
- Each node needs a short title (max 100 chars) and detailed content
- Suggest 2-4 relevant tags per node (lowercase, concise)
- Assign one of these categories: strategy, operations, research, systems, design, general. Choose the best fit based on the content.
- If the text is one continuous topic, split it into logical sections
- Don't lose important information — capture key details in the content

Return ONLY valid JSON array with this exact shape:
[
  { "title": "Node Title", "content": "Detailed content here...", "tags": ["tag1", "tag2"], "category": "category-name" }
]

If the text is very short or is just a single note, return exactly one node.

Text to parse:
${chunk}`

      let aiResponse: string | null = null
      try {
        aiResponse = await callLLM(
          [
            {
              role: 'system',
              content: 'You are a knowledge extraction assistant. Parse text into structured knowledge nodes. Return ONLY valid JSON arrays.',
            },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.2, maxTokens: 3000 },
        )
      } catch (err) {
        llmFailures++
        console.warn(`[parse-text] LLM failed on chunk ${i + 1}/${chunks.length}:`, err instanceof Error ? err.message : err)
        // Create a fallback node from raw text for this chunk
        const fallbackTitle = filename
          ? `${filename.replace(/\.[^.]+$/, '')}${chunkInfo}`
          : `Untitled${chunkInfo}`
        allParsedNodes.push({
          title: fallbackTitle.slice(0, 200),
          content: chunk.slice(0, 5000),
          tags: [],
          category: 'general',
        })
        continue // skip to next chunk
      }

      // Parse the AI response
      const cleaned = (aiResponse || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      // Try to parse the JSON
      let parsed: unknown[]
      try {
        const result = JSON.parse(cleaned)
        parsed = Array.isArray(result) ? result : [result]
      } catch {
        // Try to extract JSON array from prose
        const match = cleaned.match(/\[[\s\S]*\]/)
        if (match) {
          try {
            parsed = JSON.parse(match[0])
          } catch {
            parsed = [{
              title: filename
                ? `${filename.replace(/\.[^.]+$/, '')}${chunkInfo}`
                : 'Untitled',
              content: chunk.slice(0, 5000),
              tags: [],
              category: 'general',
            }]
          }
        } else {
          parsed = [{
            title: filename
              ? `${filename.replace(/\.[^.]+$/, '')}${chunkInfo}`
              : 'Untitled',
            content: chunk.slice(0, 5000),
            tags: [],
            category: 'general',
          }]
        }
      }

      // Validate and normalize
      let chunkAdded = false
      for (const item of parsed) {
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          const title = typeof obj.title === 'string' && obj.title.trim()
            ? obj.title.trim().slice(0, 200)
            : 'Untitled'
          const content = typeof obj.content === 'string' ? obj.content.slice(0, 10000) : ''
          const tags = Array.isArray(obj.tags)
            ? obj.tags.filter((t: unknown) => typeof t === 'string').map((t: string) => t.trim().toLowerCase()).slice(0, 10)
            : []
          const rawCategory = typeof obj.category === 'string' ? obj.category.trim().toLowerCase() : ''
          const category = VALID_CATEGORIES.includes(rawCategory as typeof VALID_CATEGORIES[number]) ? rawCategory : 'general'
          if (title && content) {
            allParsedNodes.push({ title, content, tags, category })
            chunkAdded = true
          }
        }
      }

      // If AI returned nothing valid, create a fallback node from raw text
      if (!chunkAdded) {
        const fallbackTitle = filename
          ? `${filename.replace(/\.[^.]+$/, '')}${chunkInfo}`
          : `Untitled${chunkInfo}`
        allParsedNodes.push({
          title: fallbackTitle.slice(0, 200),
          content: chunk.slice(0, 5000),
          tags: [],
          category: 'general',
        })
      }
    }

    // Deduplicate by title
    const seen = new Set<string>()
    const uniqueNodes = allParsedNodes.filter((n) => {
      const key = n.title.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Create nodes in DB
    const createdNodes: Array<{ id: string; title: string }> = []
    for (const n of uniqueNodes) {
      try {
        const node = await db.knowledgeNode.create({
          data: {
            title: n.title,
            content: n.content,
            category: n.category,
            source: safeSource,
          },
        })

        // Create tags
        for (const tagName of n.tags) {
          if (!tagName.trim()) continue
          try {
            const tag = await db.tag.upsert({
              where: { name: tagName.trim().toLowerCase() },
              update: {},
              create: { name: tagName.trim().toLowerCase() },
            })
            await db.knowledgeNodeTag.create({
              data: { nodeId: node.id, tagId: tag.id },
            })
          } catch {
            // unique constraint — ignore
          }
        }

        createdNodes.push({ id: node.id, title: node.title })
      } catch (err) {
        console.warn('[parse-text] Failed to create node:', n.title, err)
      }
    }

    // Build warning message if LLM had issues
    let warning: string | undefined
    if (llmFailures > 0) {
      warning = `AI parsing failed on ${llmFailures} of ${chunks.length} chunk(s) due to rate limiting or provider errors. Those chunks were saved as raw text nodes. Configure an LLM provider in Settings for smarter parsing.`
    }

    return NextResponse.json({
      success: true,
      nodesCreated: createdNodes.length,
      nodes: createdNodes,
      ...(warning ? { warning } : {}),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}