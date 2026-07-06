/**
 * Architect Agent - The Second Brain Analyst
 * This agent reads all logs and creates long-term plans.
 */
const architectAgent = {
  id: 'architect',
  name: 'Architect',
  subtitle: 'The master analyst. He reads the Second Brain and designs the future.',
  button: 'Run Architect',
  requires: [],

  buildPrompt(product, context = {}) {
    const logs = context.logs || { deals: [], agents: [] };
    const analytics = context.analytics || {};

    // We prioritize analytics data as it's more token-efficient
    const analyticsSummary = JSON.stringify(analytics, null, 2);

    // We still include some raw logs but limited to provide "flavor" and specific details
    const recentLogs = [...logs.deals, ...logs.agents]
      .sort((a, b) => b.file.localeCompare(a.file))
      .slice(0, 10);

    const logSummary = JSON.stringify(recentLogs).substring(0, 5000);

    return `
You are the ARCHITECT — the Master Analyst of this AI ecosystem's Second Brain.
Your role is to analyze all past activities and deals to find patterns, identify successful products, and point out failures.

AGGREGATED ANALYTICS:
${analyticsSummary}

RECENT LOG DETAILS (Sample):
${logSummary}

YOUR TASK:
Analyze the data and create a master plan for the future.
Focus on:
1. Identifying which pipeline steps are failing most often based on the analytics.
2. Spotting which agents are high-performers vs bottlenecks.
3. Correlating success with specific models or personas if visible in the data.
4. Recommending optimizations for the 5-stage pipeline (Brainstorm -> Research -> Production -> Publishing -> Early Signal).

Output a JSON object:
{
  "agent": "Architect",
  "headline": "Architectural Analysis & Future Plan",
  "summary": "High-level summary of what you discovered in the logs and analytics.",
  "insights": [
    "Insight 1 about pipeline bottlenecks (e.g., 'Dennis is failing at step 2')",
    "Insight 2 about cost/performance (e.g., 'High token usage in Bunk agent')"
  ],
  "future_plan": [
    "Step 1: Strategic optimization (e.g., 'Switch Dennis to a different model for research')",
    "Step 2: Process improvement",
    "Step 3: Scaling strategy"
  ],
  "recommendedNext": "Share this plan with Hermes to update the global strategy."
}

RULES:
- Be data-driven based on the analytics provided.
- If data is sparse, suggest specific logging improvements to gather better signal.
- Focus on scaling what works and cutting what doesn't.
`.trim();
  },

  parseResponse(rawResponse) {
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : rawResponse;
      return JSON.parse(jsonStr);
    } catch (e) {
      return {
        agent: 'Architect',
        headline: 'Architectural Analysis',
        summary: 'The Architect has analyzed the data and is formulating a plan.',
        insights: ['Data analysis in progress.'],
        future_plan: ['Continue standard operations while more data is gathered.'],
        recommendedNext: 'Continue monitoring performance.'
      };
    }
  }
};

module.exports = { architectAgent };