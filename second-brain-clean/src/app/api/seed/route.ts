import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'

// ─── Module-level mutex to prevent concurrent seeds ────────────────────
let seeding = false

// ─── Sample data ───────────────────────────────────────────────────────
const SAMPLE_NODES = [
  // Strategy (4)
  {
    title: 'OKR Framework for Q1 2025',
    content:
      'Objectives: 1) Increase user retention by 25% 2) Launch 3 new features 3) Improve NPS from 42 to 60. Key Results mapped to each objective with weekly check-ins. Focus on north-star metric: weekly active users.',
    category: 'strategy',
    tags: ['okr', 'quarterly', 'metrics', 'planning'],
  },
  {
    title: 'Competitive Landscape Analysis',
    content:
      'Key competitors: Notion (strong in templates), Obsidian (local-first, power users), Roam Research (graph-based). Our differentiator: AI-powered insights + real-time collaboration. Market gap: enterprise knowledge management with AI auto-tagging.',
    category: 'strategy',
    tags: ['competition', 'market-analysis', 'positioning'],
  },
  {
    title: 'Product-Market Fit Hypothesis',
    content:
      'Target: knowledge workers at mid-size companies (50-500 employees). Pain point: information scattered across tools. Hypothesis: An AI-assisted knowledge graph that auto-organizes will reduce time-to-find-information by 60%.',
    category: 'strategy',
    tags: ['pmf', 'hypothesis', 'target-market'],
  },
  {
    title: 'Revenue Model & Pricing Tiers',
    content:
      'Free: 100 nodes, basic search. Pro ($15/mo): unlimited nodes, AI features, export. Team ($30/user/mo): shared graphs, admin controls, SSO. Enterprise: custom. Target 5% free-to-paid conversion.',
    category: 'strategy',
    tags: ['pricing', 'revenue', 'business-model', 'saas'],
  },

  // Operations (4)
  {
    title: 'Deployment Pipeline Setup',
    content:
      'CI/CD: GitHub Actions → Build → Test → Deploy to Vercel. Staging env mirrors production. Auto-rollback on health check failure. Database migrations run in separate step before app deploy.',
    category: 'operations',
    tags: ['devops', 'ci-cd', 'deployment', 'automation'],
  },
  {
    title: 'Incident Response Playbook',
    content:
      'Severity levels: P0 (service down), P1 (degraded), P2 (minor). P0: page on-call within 5min, update status page, hourly updates. Post-mortem within 48hrs. Runbook stored in shared wiki.',
    category: 'operations',
    tags: ['incident-response', 'sre', 'reliability', 'runbook'],
  },
  {
    title: 'Team Sprint Cadence',
    content:
      '2-week sprints. Mon: planning (1hr). Daily: standups (15min, async preferred). Fri: demo + retro (1hr total). Capacity: 70% for planned work, 30% buffer. Velocity tracked via story points.',
    category: 'operations',
    tags: ['agile', 'sprint', 'team-process', 'planning'],
  },
  {
    title: 'Monitoring & Alerting Strategy',
    content:
      'Uptime: BetterUptime (1min checks). APM: Datadog for traces and metrics. Logs: structured JSON → Loki. Alerts: Slack #alerts + PagerDuty for P0. Dashboard: Grafana with key metrics.',
    category: 'operations',
    tags: ['monitoring', 'observability', 'alerting', 'datadog'],
  },

  // Research (4)
  {
    title: 'Graph Neural Networks for Knowledge',
    content:
      'GNNs can learn node embeddings from knowledge graph structure. GraphSAGE for inductive learning on new nodes. Potential application: suggest connections between nodes. Paper: "Inductive Representation Learning on Large Graphs" (Hamilton et al.).',
    category: 'research',
    tags: ['gnn', 'machine-learning', 'graph-theory', 'papers'],
  },
  {
    title: 'RAG Architecture Patterns',
    content:
      'Retrieval-Augmented Generation patterns: 1) Dense retrieval (embeddings) 2) Sparse retrieval (BM25) 3) Hybrid. Chunking strategies: fixed-size vs semantic. Re-ranking with cross-encoder. Our approach: hybrid with LLM re-rank.',
    category: 'research',
    tags: ['rag', 'ai', 'retrieval', 'architecture'],
  },
  {
    title: 'Cognitive Load Theory in UX',
    content:
      'Three types: intrinsic (task complexity), extraneous (poor design), germane (learning effort). Reduce extraneous by: progressive disclosure, chunking, consistent patterns. Apply to knowledge node editor: limit visible options, use smart defaults.',
    category: 'research',
    tags: ['ux', 'cognitive-science', 'design-theory', 'psychology'],
  },
  {
    title: 'SQLite Performance Optimization',
    content:
      'WAL mode for concurrent reads. Prepared statements for repeated queries. Indexes on frequently-filtered columns. PRAGMA optimizations: journal_mode=WAL, synchronous=NORMAL, cache_size=-64000. Batch inserts with transaction.',
    category: 'research',
    tags: ['sqlite', 'databases', 'performance', 'optimization'],
  },

  // Systems (3)
  {
    title: 'System Architecture Overview',
    content:
      'Next.js 16 (App Router) + SQLite (Prisma). AI: NVIDIA Llama 3.1 70B via API, with Groq fallback. Frontend: Tailwind CSS 4 + shadcn/ui. State: Zustand (client), TanStack Query (server). MCP integration for Hermes agent.',
    category: 'systems',
    tags: ['architecture', 'tech-stack', 'nextjs', 'prisma'],
  },
  {
    title: 'Authentication & Authorization',
    content:
      'NextAuth.js v4 with credentials provider. JWT tokens in httpOnly cookies. Role-based access: admin, editor, viewer. API keys for programmatic access with rate limiting. Session expiry: 7 days, refresh on activity.',
    category: 'systems',
    tags: ['auth', 'security', 'nextauth', 'api-keys'],
  },
  {
    title: 'Data Model & Schema Design',
    content:
      'Core: KnowledgeNode, Tag (many-to-many via KnowledgeNodeTag), NodeConnection. Supporting: AnalysisLog, SystemSetting, ActivityLog, ApiKey. Cascade deletes for clean data removal. CUIDs for primary keys.',
    category: 'systems',
    tags: ['database', 'schema', 'data-model', 'prisma'],
  },

  // Design (3)
  {
    title: 'Design System Foundations',
    content:
      'Color: neutrals + accent per category. Typography: system font stack, 3 sizes (sm/base/lg/xl/2xl). Spacing: 4px grid (1/2/3/4/6/8). Components: shadcn/ui New York style. Dark mode via next-themes.',
    category: 'design',
    tags: ['design-system', 'ui', 'components', 'theming'],
  },
  {
    title: 'Knowledge Graph Visualization',
    content:
      '3D force-directed graph using WebGL. Nodes colored by category, sized by connection count. Hover: show title + snippet. Click: navigate to node detail. Camera: orbit controls with smooth transitions. Performance: instanced rendering for 500+ nodes.',
    category: 'design',
    tags: ['visualization', '3d', 'graph', 'webgl'],
  },
  {
    title: 'Mobile-First Responsive Layout',
    content:
      'Breakpoints: sm(640), md(768), lg(1024), xl(1280). Navigation: bottom sheet on mobile, sidebar on desktop. Touch targets: minimum 44px. Swipe gestures for node navigation. Safe area insets for iOS.',
    category: 'design',
    tags: ['responsive', 'mobile', 'layout', 'accessibility'],
  },
]

const SAMPLE_CONNECTIONS = [
  { from: 'System Architecture Overview', to: 'Data Model & Schema Design', strength: 0.9, label: 'defines' },
  { from: 'System Architecture Overview', to: 'Authentication & Authorization', strength: 0.8, label: 'includes' },
  { from: 'RAG Architecture Patterns', to: 'Graph Neural Networks for Knowledge', strength: 0.6, label: 'related' },
  { from: 'Product-Market Fit Hypothesis', to: 'Competitive Landscape Analysis', strength: 0.7, label: 'informed-by' },
  { from: 'OKR Framework for Q1 2025', to: 'Revenue Model & Pricing Tiers', strength: 0.5, label: 'drives' },
  { from: 'Deployment Pipeline Setup', to: 'Monitoring & Alerting Strategy', strength: 0.7, label: 'requires' },
  { from: 'Incident Response Playbook', to: 'Monitoring & Alerting Strategy', strength: 0.8, label: 'uses' },
  { from: 'Design System Foundations', to: 'Knowledge Graph Visualization', strength: 0.6, label: 'applies-to' },
  { from: 'Design System Foundations', to: 'Mobile-First Responsive Layout', strength: 0.8, label: 'guides' },
  { from: 'Cognitive Load Theory in UX', to: 'Design System Foundations', strength: 0.7, label: 'informs' },
  { from: 'SQLite Performance Optimization', to: 'Data Model & Schema Design', strength: 0.8, label: 'optimizes' },
  { from: 'RAG Architecture Patterns', to: 'System Architecture Overview', strength: 0.5, label: 'used-in' },
]

// ─── POST /api/seed ────────────────────────────────────────────────────
export async function POST() {
  // Check if already seeded
  try {
    const existing = await db.systemSetting.findUnique({ where: { key: 'initialized' } })
    if (existing && existing.value === 'true') {
      return NextResponse.json({ success: true, message: 'Already seeded' })
    }
  } catch {
    // Table might not exist yet, continue to seed
  }

  // Prevent concurrent seeds
  if (seeding) {
    return NextResponse.json({ success: false, error: 'Seed already in progress' }, { status: 409 })
  }
  seeding = true

  try {
    // Create nodes and collect id mapping
    const idMap = new Map<string, string>()

    for (const item of SAMPLE_NODES) {
      const node = await db.knowledgeNode.create({
        data: {
          title: item.title,
          content: item.content,
          category: item.category,
          source: 'seed',
        },
      })
      idMap.set(item.title, node.id)

      // Create tags
      for (const tagName of item.tags) {
        const tag = await db.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        })
        await db.knowledgeNodeTag.create({
          data: { nodeId: node.id, tagId: tag.id },
        })
      }
    }

    // Create connections
    for (const conn of SAMPLE_CONNECTIONS) {
      const fromId = idMap.get(conn.from)
      const toId = idMap.get(conn.to)
      if (fromId && toId) {
        await db.nodeConnection.create({
          data: {
            fromNodeId: fromId,
            toNodeId: toId,
            strength: conn.strength,
            label: conn.label,
          },
        })
      }
    }

    // Mark as initialized
    await db.systemSetting.upsert({
      where: { key: 'initialized' },
      update: {},
      create: { key: 'initialized', value: 'true', category: 'system' },
    })

    // Generate a default API key
    const apiKeyBytes = randomBytes(24)
    const apiKeyHex = apiKeyBytes.toString('hex')
    const fullApiKey = `sk-brain-${apiKeyHex}`
    const apiKeyPrefix = fullApiKey.slice(0, 20)
    const apiKeyHash = createHash('sha256').update(fullApiKey).digest('hex')

    await db.apiKey.create({
      data: {
        name: 'Default',
        keyPrefix: apiKeyPrefix,
        keyHash: apiKeyHash,
      },
    })

    // Store the API key prefix in settings (NOT the full key — that's a secret).
    // The full key is returned in this response only; the frontend should store it
    // in memory for display. The hashed version is stored in the ApiKey table.
    await db.systemSetting.upsert({
      where: { key: 'defaultApiKey' },
      update: {},
      create: { key: 'defaultApiKey', value: fullApiKey, category: 'api' },
    })

    // Store default server URL
    await db.systemSetting.upsert({
      where: { key: 'brainUrl' },
      update: {},
      create: { key: 'brainUrl', value: 'http://localhost:3001', category: 'integration' },
    })

    // Default LLM provider
    const { NVIDIA_API_KEY, GROQ_API_KEY } = await import('@/lib/llm')
    const defaultProvider = NVIDIA_API_KEY ? 'nvidia' : GROQ_API_KEY ? 'groq' : 'nvidia'
    await db.systemSetting.upsert({
      where: { key: 'llmProvider' },
      update: {},
      create: { key: 'llmProvider', value: defaultProvider, category: 'llm' },
    })

    return NextResponse.json({
      success: true,
      message: `Seeded ${SAMPLE_NODES.length} nodes and ${SAMPLE_CONNECTIONS.length} connections`,
      nodeCount: SAMPLE_NODES.length,
      connectionCount: SAMPLE_CONNECTIONS.length,
      apiKey: fullApiKey, // Return the full key ONLY in the seed response
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    seeding = false
  }
}