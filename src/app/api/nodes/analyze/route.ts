import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callLLM } from '@/lib/llm'
import { authenticateRequest } from '@/lib/api-auth'

// ─── POST /api/nodes/analyze ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const nodes = await db.knowledgeNode.findMany({
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    if (nodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No nodes to analyze',
      })
    }

    const summaries = nodes
      .map(
        (n) =>
          `- [${n.category}] "${n.title}" | Tags: ${n.tags.map((t) => t.tag.name).join(', ')} | ${n.content.slice(0, 400)}`,
      )
      .join('\n')

    const systemPrompt = `You are an expert knowledge analyst. Analyze the following collection of knowledge nodes and provide a structured JSON response with these fields:
- "summary": A 2-3 sentence executive summary of the overall knowledge base
- "insights": An array of 3-6 key insights discovered across the nodes
- "suggestions": An array of 3-5 actionable suggestions for improving the knowledge base
- "patterns": A 1-2 paragraph description of patterns and themes found

Return ONLY valid JSON, no markdown fences.`

    const aiResponse = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here are my knowledge nodes:\n\n${summaries}` },
      ],
      { temperature: 0.4, maxTokens: 2048 },
    )

    const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Robust JSON extraction — handle LLMs that wrap JSON in prose
    let analysis: Record<string, unknown>
    try {
      analysis = JSON.parse(cleaned)
    } catch {
      // Try to extract a JSON object from the response using regex
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0])
        } catch {
          return NextResponse.json({
            success: false,
            error: 'LLM returned invalid JSON — could not parse analysis results',
          }, { status: 500 })
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'LLM did not return any parseable JSON',
        }, { status: 500 })
      }
    }

    // Validate expected fields with safe defaults
    const summary = typeof analysis.summary === 'string' ? analysis.summary : ''
    const insights = Array.isArray(analysis.insights) ? analysis.insights.filter((i: unknown) => typeof i === 'string') : []
    const suggestions = Array.isArray(analysis.suggestions) ? analysis.suggestions.filter((s: unknown) => typeof s === 'string') : []
    const patterns = typeof analysis.patterns === 'string' ? analysis.patterns : ''

    // Save to AnalysisLog
    await db.analysisLog.create({
      data: {
        type: 'comprehensive',
        summary,
        detail: JSON.stringify({
          insights,
          suggestions,
          patterns,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      nodeCount: nodes.length,
      analysis: {
        summary,
        insights,
        suggestions,
        patterns,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}