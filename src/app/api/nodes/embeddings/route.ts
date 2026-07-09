import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { embedText } from '@/lib/embeddings'
import { authenticateRequest } from '@/lib/api-auth'

type EmbedMode = 'vector' | 'tfidf' | 'auto'

// ─── TF-IDF Helpers (kept as fallback) ────────────────────────────────

/** Tokenise a string into lowercase words (2+ chars), keeping CJK characters. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/)
    .filter((w) => w.length >= 2)
}

/**
 * Generate TF-IDF embeddings for all nodes that don't have one yet.
 * This is the original logic preserved as fallback.
 */
async function generateTfIdfEmbeddings(): Promise<{ updated: number; totalNodes: number; vocabSize: number }> {
  const allNodes = await db.knowledgeNode.findMany({
    include: { tags: { include: { tag: true } } },
  })

  if (allNodes.length === 0) {
    return { updated: 0, totalNodes: 0, vocabSize: 0 }
  }

  // Build vocabulary
  const vocabSet = new Set<string>()
  const nodeTexts: string[] = []

  for (const node of allNodes) {
    const tagNames = node.tags.map((t) => t.tag.name)
    const text = [
      node.title,
      node.title,
      node.title,
      node.content,
      ...tagNames,
      ...tagNames,
    ].join(' ')
    nodeTexts.push(text)

    for (const w of tokenize(text)) {
      vocabSet.add(w)
    }
  }

  const vocab = Array.from(vocabSet).sort()
  const wordIndex = new Map<string, number>()
  vocab.forEach((w, i) => wordIndex.set(w, i))

  const vocabSize = vocab.length
  const totalNodes = allNodes.length

  // Compute IDF
  const docFreq = new Float64Array(vocabSize)
  for (let ni = 0; ni < allNodes.length; ni++) {
    const words = new Set(tokenize(nodeTexts[ni]))
    for (const w of words) {
      const idx = wordIndex.get(w)
      if (idx !== undefined) docFreq[idx]++
    }
  }

  const idf = new Float64Array(vocabSize)
  for (let i = 0; i < vocabSize; i++) {
    idf[i] = Math.log(totalNodes / (1 + docFreq[i]))
  }

  // Generate TF-IDF for nodes without embeddings
  let updatedCount = 0

  for (let ni = 0; ni < allNodes.length; ni++) {
    const node = allNodes[ni]
    if (node.embedding && node.embedding.length > 0) continue

    const words = tokenize(nodeTexts[ni])

    if (words.length === 0) {
      await db.knowledgeNode.update({
        where: { id: node.id },
        data: { embedding: JSON.stringify(new Array(vocabSize).fill(0)) },
      })
      updatedCount++
      continue
    }

    const tfCounts = new Map<string, number>()
    for (const w of words) {
      tfCounts.set(w, (tfCounts.get(w) || 0) + 1)
    }

    const tfidf = new Float64Array(vocabSize)
    for (let vi = 0; vi < vocabSize; vi++) {
      const word = vocab[vi]
      const count = tfCounts.get(word) || 0
      if (count > 0) {
        const tf = count / words.length
        tfidf[vi] = tf * idf[vi]
      }
    }

    await db.knowledgeNode.update({
      where: { id: node.id },
      data: { embedding: JSON.stringify(Array.from(tfidf)) },
    })
    updatedCount++
  }

  return { updated: updatedCount, totalNodes, vocabSize }
}

/**
 * Generate real vector embeddings for all nodes that don't have one yet,
 * or re-embed nodes that currently have TF-IDF embeddings.
 */
async function generateVectorEmbeddings(): Promise<{ updated: number; totalNodes: number; failed: number; skipped: number }> {
  const allNodes = await db.knowledgeNode.findMany({
    include: { tags: { include: { tag: true } } },
  })

  if (allNodes.length === 0) {
    return { updated: 0, totalNodes: 0, failed: 0, skipped: 0 }
  }

  /** Check if a node already has a high-dimensional vector embedding (not TF-IDF) */
  function isVectorEmbedding(embedding: string | null): boolean {
    if (!embedding) return false
    try {
      const parsed = JSON.parse(embedding)
      if (!Array.isArray(parsed) || parsed.length === 0) return false
      // TF-IDF vocabularies are typically very large (hundreds of dimensions matching word count)
      // Real vector embeddings from NVIDIA are typically 256-4096 dimensions
      // Heuristic: if dimension > 1000, it's likely a real vector embedding
      return parsed.length > 1000
    } catch {
      return false
    }
  }

  let updatedCount = 0
  let failedCount = 0
  let skippedCount = 0

  for (const node of allNodes) {
    // Skip nodes that already have a valid vector embedding
    if (isVectorEmbedding(node.embedding)) {
      skippedCount++
      continue
    }

    const text = `${node.title} ${node.content}`.trim()
    if (!text) continue

    try {
      const embeddingStr = await embedText(text)
      await db.knowledgeNode.update({
        where: { id: node.id },
        data: { embedding: embeddingStr },
      })
      updatedCount++
    } catch {
      failedCount++
    }
  }

  return { updated: updatedCount, totalNodes: allNodes.length, failed: failedCount, skipped: skippedCount }
}

// ─── POST /api/nodes/embeddings ────────────────────────────────────────
// Generate and store embeddings for nodes.
// Query params: mode=vector | mode=tfidf | mode=auto (default: auto)
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { searchParams } = new URL(req.url)
    const modeParam = searchParams.get('mode') as EmbedMode | null

    // Default: auto — try vector first, fall back to TF-IDF
    let mode: EmbedMode = 'auto'
    if (modeParam === 'vector' || modeParam === 'tfidf') {
      mode = modeParam
    }

    if (mode === 'vector') {
      // Force vector mode
      const result = await generateVectorEmbeddings()
      return NextResponse.json({
        success: true,
        mode: 'vector',
        ...result,
      })
    }

    if (mode === 'tfidf') {
      // Force TF-IDF mode
      const result = await generateTfIdfEmbeddings()
      return NextResponse.json({
        success: true,
        mode: 'tfidf',
        ...result,
      })
    }

    // Auto mode: try vector first, fall back to TF-IDF
    try {
      const result = await generateVectorEmbeddings()
      if (result.updated > 0) {
        return NextResponse.json({
          success: true,
          mode: 'vector',
          ...result,
        })
      }
      // No nodes needed updating with vector, or all failed — fall back to TF-IDF
      if (result.failed === result.totalNodes) {
        // All vector calls failed, use TF-IDF
        const tfidfResult = await generateTfIdfEmbeddings()
        return NextResponse.json({
          success: true,
          mode: 'tfidf',
          ...tfidfResult,
          note: 'Vector embedding failed for all nodes, fell back to TF-IDF',
        })
      }
      return NextResponse.json({
        success: true,
        mode: 'vector',
        ...result,
      })
    } catch {
      // Vector mode threw an error entirely, fall back to TF-IDF
      const result = await generateTfIdfEmbeddings()
      return NextResponse.json({
        success: true,
        mode: 'tfidf',
        ...result,
        note: 'Vector embedding unavailable, fell back to TF-IDF',
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}