import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callLLM } from '@/lib/llm'
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings'
import { authenticateRequest } from '@/lib/api-auth'

/** Tokenise a string into lowercase words (2+ chars), keeping CJK characters. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/)
    .filter((w) => w.length >= 2)
}

/** Cosine similarity between two equal-length Float64Arrays. */
function cosineSimilarityTfIdf(a: Float64Array, b: Float64Array): number {
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

/**
 * Rebuild the shared vocabulary + IDF from all node texts.
 * Must match the logic in /api/nodes/embeddings exactly.
 */
function buildVocabAndIDF(
  allNodes: {
    title: string
    content: string
    tags: { tag: { name: string } }[]
  }[],
) {
  const vocabSet = new Set<string>()
  const nodeTexts: string[] = []

  for (const node of allNodes) {
    const tagNames = node.tags.map((t) => t.tag.name)
    const text = [node.title, node.title, node.title, node.content, ...tagNames, ...tagNames].join(' ')
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

  // Document frequency
  const docFreq = new Float64Array(vocabSize)
  for (const text of nodeTexts) {
    const seen = new Set(tokenize(text))
    for (const w of seen) {
      const idx = wordIndex.get(w)
      if (idx !== undefined) docFreq[idx]++
    }
  }

  const idf = new Float64Array(vocabSize)
  for (let i = 0; i < vocabSize; i++) {
    idf[i] = Math.log(totalNodes / (1 + docFreq[i]))
  }

  return { vocab, wordIndex, idf, vocabSize }
}

/**
 * Compute a TF-IDF vector for the given query string using the shared vocab + IDF.
 */
function queryToTfIdf(
  query: string,
  vocab: string[],
  wordIndex: Map<string, number>,
  idf: Float64Array,
): Float64Array {
  const words = tokenize(query)
  const vec = new Float64Array(vocab.length)
  if (words.length === 0) return vec

  const tfCounts = new Map<string, number>()
  for (const w of words) tfCounts.set(w, (tfCounts.get(w) || 0) + 1)

  for (let vi = 0; vi < vocab.length; vi++) {
    const count = tfCounts.get(vocab[vi]) || 0
    if (count > 0) {
      vec[vi] = (count / words.length) * idf[vi]
    }
  }
  return vec
}

/** Check if a stored embedding looks like a real vector (not TF-IDF). */
function isVectorEmbedding(embeddingStr: string): boolean {
  try {
    const arr = JSON.parse(embeddingStr)
    if (!Array.isArray(arr) || arr.length === 0) return false
    // Real vector embeddings (NV-Embed-V1, text-embedding-3-small) are high-dimensional (256+)
    // TF-IDF vectors are typically small (vocab size), rarely > 1000
    // Heuristic: if dimension > 100, treat as real vector embedding
    return arr.length > 100
  } catch {
    return false
  }
}

// ─── POST /api/nodes/search ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const { query } = (await req.json()) as { query: string }
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 },
      )
    }

    const q = query.trim().toLowerCase()

    // ── 1. Simple text search ──────────────────────────────────────────
    const textResults = await db.knowledgeNode.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
        ],
      },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // ── 2. AI semantic search ──────────────────────────────────────────
    const allNodes = await db.knowledgeNode.findMany({
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    })

    let aiRankedIds: string[] = []

    if (allNodes.length > 0 && allNodes.length <= 200) {
      try {
        const nodeList = allNodes
          .map(
            (n, i) =>
              `[${i}] Title: "${n.title}" | Category: ${n.category} | Tags: ${n.tags.map((t) => t.tag.name).join(', ')} | Content: ${n.content.slice(0, 300)}`,
          )
          .join('\n')

        const aiResponse = await callLLM(
          [
            {
              role: 'system',
              content:
                'You are a search relevance ranker. Given a user query and a list of knowledge nodes, return ONLY a JSON array of the indices of the most relevant nodes, ranked by relevance. Return at most 10 indices. If no nodes are relevant, return an empty array []. Return ONLY the JSON array, nothing else.',
            },
            {
              role: 'user',
              content: `Query: "${query}"\n\nNodes:\n${nodeList}`,
            },
          ],
          { temperature: 0.1, maxTokens: 200 },
        )

        const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed)) {
          aiRankedIds = parsed
            .filter((i: unknown) => typeof i === 'number' && i >= 0 && i < allNodes.length)
            .map((i: number) => allNodes[i].id)
        }
      } catch {
        // AI search failed, continue with other results
      }
    }

    // ── 3. Vector Embedding Search (NEW) ───────────────────────────────
    // Generate query embedding and compare with stored vector embeddings
    let vectorRankedIds: string[] = []

    try {
      const queryEmbedding = await generateEmbedding(query)

      if (queryEmbedding.length > 0) {
        const VECTOR_SIMILARITY_THRESHOLD = 0.5
        const scored: { id: string; score: number }[] = []

        for (const node of allNodes) {
          if (!node.embedding || node.embedding.length <= 2) continue
          if (!isVectorEmbedding(node.embedding)) continue

          try {
            const nodeVec = JSON.parse(node.embedding) as number[]
            const sim = cosineSimilarity(queryEmbedding, nodeVec)
            if (sim >= VECTOR_SIMILARITY_THRESHOLD) {
              scored.push({ id: node.id, score: sim })
            }
          } catch {
            // Skip malformed embeddings
          }
        }

        // Sort descending by similarity
        scored.sort((a, b) => b.score - a.score)
        vectorRankedIds = scored.map((s) => s.id)
      }
    } catch {
      // Vector embedding generation failed, skip this phase gracefully
    }

    // ── 4. TF-IDF Embedding cosine similarity search ──────────────────
    let tfidfRankedIds: string[] = []

    const nodesWithTfIdfEmbeddings = allNodes.filter(
      (n) => n.embedding && n.embedding.length > 2 && !isVectorEmbedding(n.embedding),
    )
    if (nodesWithTfIdfEmbeddings.length > 0) {
      try {
        // Rebuild vocab + IDF from all node texts (must match embeddings route)
        const { vocab, wordIndex, idf } = buildVocabAndIDF(allNodes)
        const queryVec = queryToTfIdf(query, vocab, wordIndex, idf)

        const scored: { id: string; score: number }[] = []
        for (const node of nodesWithTfIdfEmbeddings) {
          const nodeVec = new Float64Array(JSON.parse(node.embedding) as number[])
          if (nodeVec.length === queryVec.length) {
            const sim = cosineSimilarityTfIdf(queryVec, nodeVec)
            if (sim > 0.1) {
              scored.push({ id: node.id, score: sim })
            }
          }
        }
        // Sort descending by cosine similarity
        scored.sort((a, b) => b.score - a.score)
        tfidfRankedIds = scored.map((s) => s.id)
      } catch {
        // TF-IDF embedding search failed, continue with other results
      }
    }

    // ── 5. Merge and deduplicate ───────────────────────────────────────
    // Order: AI results → Vector results → TF-IDF results → Text results
    const resultMap = new Map<string, (typeof allNodes)[0]>()
    for (const node of allNodes) {
      resultMap.set(node.id, node)
    }

    const seen = new Set<string>()
    const finalIds: string[] = []

    for (const id of aiRankedIds) {
      if (!seen.has(id)) {
        seen.add(id)
        finalIds.push(id)
      }
    }
    for (const id of vectorRankedIds) {
      if (!seen.has(id)) {
        seen.add(id)
        finalIds.push(id)
      }
    }
    for (const id of tfidfRankedIds) {
      if (!seen.has(id)) {
        seen.add(id)
        finalIds.push(id)
      }
    }
    for (const node of textResults) {
      if (!seen.has(node.id)) {
        seen.add(node.id)
        finalIds.push(node.id)
      }
    }

    const results = finalIds
      .slice(0, 10)
      .map((id) => resultMap.get(id))
      .filter(Boolean)
      .map((n) => {
        const { tags, ...rest } = n as Record<string, unknown>
        return {
          ...rest,
          tags: (tags as { tag: { name: string } }[]).map((t) => t.tag.name),
        }
      })

    return NextResponse.json({ success: true, results, query })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}