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

    // Better log summary to avoid cutting JSON mid-string
    const logSummary = JSON.stringify(logs, null, 2);
    const truncatedSummary = logSummary.length > 20000
      ? logSummary.substring(0, 20000) + "\n... [TRUNCATED]"
      : logSummary;

    return `
You are the ARCHITECT — the Master Analyst of this AI ecosystem's Second Brain.
Your role is to analyze all past activities and deals to find patterns, identify successful products, and point out failures.

SECOND BRAIN DATA:
${truncatedSummary}

YOUR TASK:
Analyze the data and create a master plan for the future. Output a JSON object:
{
  "agent": "Architect",
  "headline": "Architectural Analysis & Future Plan",
  "summary": "High-level summary of what you discovered in the logs.",
  "insights": [
    "Insight 1 about successful products/platforms",
    "Insight 2 about common failure points"
  ],
  "future_plan": [
    "Step 1: Recommended strategic shift",
    "Step 2: New product category to explore",
    "Step 3: Optimization for specific platforms"
  ],
  "recommendedNext": "Share this plan with Hermes to update the global strategy."
}

RULES:
- Be data-driven based on the logs provided.
- If logs are empty, suggest a starting strategy to populate the brain.
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