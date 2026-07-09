#!/usr/bin/env node
// ─── Second Brain MCP Server ──────────────────────────────────────────
// Exposes the Second Brain API as MCP tools for Hermes (or any MCP client).
// Transport: stdio (Hermes launches this as a subprocess).
//
// Tools:
//   brain_query    — Search/query stored memories
//   brain_store    — Store new memories (manual or auto-extract)
//   brain_stats    — Get memory statistics
//   brain_reflect  — Run AI-powered reflection on memories
//   brain_import   — Import knowledge from brain nodes into agent memory

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// ─── Config ────────────────────────────────────────────────────────────
const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:3000'
const API_KEY = process.env.BRAIN_API_KEY || ''
const TIMEOUT_MS = 90_000

// ─── HTTP Helper ───────────────────────────────────────────────────────
async function brainFetch(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${BRAIN_URL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal })
    const data = await res.json()
    return { ok: res.ok, status: res.status, data }
  } finally {
    clearTimeout(timer)
  }
}

// ─── Tool Definitions ──────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'brain_query',
    description:
      'Search and query stored memories in the Second Brain. Returns matching memories as JSON, or formatted for LLM prompt injection if format="prompt". Supports keyword search, category filtering, and limit control.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query — keywords to match against memory content',
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Filter by categories: insight, strategy, pattern, lesson, fact, preference',
        },
        limit: {
          type: 'number',
          description: 'Max memories to return (default: 20, max: 100)',
        },
        format: {
          type: 'string',
          enum: ['json', 'prompt'],
          description:
            'Response format. "json" returns structured data. "prompt" returns a formatted block for LLM injection.',
        },
        context: {
          type: 'string',
          description: 'Optional context label for prompt format mode',
        },
      },
    },
  },
  {
    name: 'brain_store',
    description:
      'Store new memories into the Second Brain. Either provide an array of memories with content and category, or provide text with autoExtract=true to let the AI extract memories automatically.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        memories: {
          type: 'array',
          description: 'Array of memories to store (use instead of text+autoExtract)',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Memory content' },
              category: {
                type: 'string',
                description: 'Category: insight, strategy, pattern, lesson, fact, preference',
              },
              source: { type: 'string', description: 'Source identifier' },
            },
            required: ['content'],
          },
        },
        text: {
          type: 'string',
          description: 'Raw text to auto-extract memories from (requires autoExtract=true)',
        },
        autoExtract: {
          type: 'boolean',
          description: 'Set to true to auto-extract memories from the text field',
        },
        source: {
          type: 'string',
          description: 'Source label for all memories in this request',
        },
      },
    },
  },
  {
    name: 'brain_stats',
    description:
      'Get statistics about the Second Brain memory store: total count, breakdown by category, and recent memory count (last 24h).',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'brain_reflect',
    description:
      'Run an AI-powered reflection on all stored memories. In normal mode, it decays stale memories and boosts frequently accessed ones. In deep mode, it also uses LLM to find cross-memory patterns, contradictions, gaps, and recommendations.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deep: {
          type: 'boolean',
          description:
            'Set to true for deep reflection (includes AI pattern analysis). Requires LLM API keys to be configured.',
        },
      },
    },
  },
  {
    name: 'brain_import',
    description:
      'Import knowledge from brain nodes into the agent memory system. Runs AI extraction on node content to create structured, categorized memories.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'Optional: only import nodes of this category',
        },
        maxNodes: {
          type: 'number',
          description: 'Max nodes to process (default: 50)',
        },
      },
    },
  },
]

// ─── Tool Handler ──────────────────────────────────────────────────────

async function handleToolCall(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case 'brain_query': {
      const params = new URLSearchParams()
      if (args.categories?.length) params.set('categories', args.categories.join(','))
      if (args.limit) params.set('limit', String(Math.min(args.limit, 100)))
      if (args.format) params.set('format', args.format)
      if (args.context) params.set('context', args.context)

      const queryStr = params.toString()
      const path = `/api/brain/query${queryStr ? `?${queryStr}` : ''}`

      const { ok, data } = await brainFetch(path, {
        method: 'POST',
        body: JSON.stringify({ query: args.query || '' }),
      })

      if (!ok) return `Error: ${data.error || 'Query failed'}`
      return JSON.stringify(data, null, 2)
    }

    case 'brain_store': {
      const { ok, data } = await brainFetch('/api/brain/store', {
        method: 'POST',
        body: JSON.stringify({
          memories: args.memories || undefined,
          text: args.text || undefined,
          source: args.source || undefined,
          autoExtract: args.autoExtract || false,
        }),
      })

      if (!ok) return `Error: ${data.error || 'Store failed'}`
      return JSON.stringify(data, null, 2)
    }

    case 'brain_stats': {
      const { ok, data } = await brainFetch('/api/brain/insights')
      if (!ok) return `Error: ${data.error || 'Stats failed'}`
      return JSON.stringify(data, null, 2)
    }

    case 'brain_reflect': {
      const { ok, data } = await brainFetch('/api/brain/reflect', {
        method: 'POST',
        body: JSON.stringify({ deep: args.deep || false }),
      })

      if (!ok) return `Error: ${data.error || 'Reflect failed'}`
      return JSON.stringify(data, null, 2)
    }

    case 'brain_import': {
      const params = new URLSearchParams()
      if (args.category) params.set('category', args.category)
      if (args.maxNodes) params.set('maxNodes', String(args.maxNodes))

      const { ok, data } = await brainFetch(
        `/api/brain/insights?action=import${params.toString() ? `&${params.toString()}` : ''}`
      )

      if (!ok) return `Error: ${data.error || 'Import failed'}`
      return JSON.stringify(data, null, 2)
    }

    default:
      return `Unknown tool: ${name}`
  }
}

// ─── MCP Server Setup ─────────────────────────────────────────────────

const server = new Server(
  { name: 'second-brain', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  if (!TOOLS.find((t) => t.name === name)) {
    return {
      content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
      isError: true,
    }
  }

  try {
    const result = await handleToolCall(name, args || {})
    return {
      content: [{ type: 'text' as const, text: result }],
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text' as const, text: `Tool error: ${message}` }],
      isError: true,
    }
  }
})

// ─── Start ─────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // MCP servers log to stderr, not stdout (stdout is the transport)
  console.error('[brain-mcp] Second Brain MCP server running (stdio transport)')
  console.error(`[brain-mcp] Brain URL: ${BRAIN_URL}`)
  console.error(`[brain-mcp] API Key: ${API_KEY ? 'configured' : 'not set (using default)'}`)
}

main().catch((err) => {
  console.error('[brain-mcp] Fatal error:', err)
  process.exit(1)
})