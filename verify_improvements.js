const { logToSecondBrain, getAggregatedAnalytics } = require('./secondBrain');
const { architectAgent } = require('./agents/architectAgent');
const fs = require('fs');
const path = require('path');

async function runVerification() {
  console.log('--- Starting Second Brain Verification ---');

  // 1. Create some dummy logs with the new schema
  console.log('Creating sample logs...');

  const sampleLogs = [
    {
      agentId: 'dennis',
      agentName: 'Dennis',
      type: 'activity',
      status: 'success',
      missionId: 'mission-123',
      pipelineStep: 'research',
      metrics: { durationMs: 1200, tokensTotal: 500 },
      metadata: { model: 'gpt-4o', persona: 'academic' },
      data: { research: 'Market trends for AI agents' }
    },
    {
      agentId: 'bunk',
      agentName: 'Bunk',
      type: 'activity',
      status: 'failure',
      missionId: 'mission-123',
      pipelineStep: 'production',
      metrics: { durationMs: 4500, tokensTotal: 1200 },
      metadata: { model: 'gpt-3.5-turbo', persona: 'creative' },
      error: 'Generation failed due to timeout',
      errorDetails: { errorCode: 'TIMEOUT', category: 'network' },
      data: { attempt: 'UI Design for dashboard' }
    },
    {
      agentId: 'hermes',
      agentName: 'Hermes',
      type: 'deal',
      status: 'success',
      missionId: 'mission-124',
      pipelineStep: 'brainstorm',
      metrics: { durationMs: 800, tokensTotal: 300 },
      metadata: { model: 'claude-3-opus' },
      data: { deal: 'Partnered with TechCorp' }
    }
  ];

  for (const log of sampleLogs) {
    const result = await logToSecondBrain(log);
    console.log(`Log created: ${result.path}`);
  }

  // 2. Test analytics aggregation
  console.log('\nTesting Analytics Aggregation...');
  const analytics = await getAggregatedAnalytics();
  console.log('Analytics Result:', JSON.stringify(analytics, null, 2));

  if (analytics.totalLogs >= 3 && analytics.byAgent.dennis.success === 1 && analytics.byAgent.bunk.fail === 1) {
    console.log('✅ Analytics aggregation working correctly.');
  } else {
    console.log('❌ Analytics aggregation failed or returned unexpected data.');
  }

  // 3. Test Architect Agent Prompt Generation
  console.log('\nTesting Architect Prompt Generation...');
  const logs = { deals: [], agents: [] }; // In real usage, this would be from getAllLogs
  const prompt = architectAgent.buildPrompt('AI Ecosystem', { logs, analytics });

  console.log('--- PROMPT START ---');
  console.log(prompt);
  console.log('--- PROMPT END ---');

  if (prompt.includes('AGGREGATED ANALYTICS') && prompt.includes('TIMEOUT')) {
    console.log('✅ Architect prompt includes enhanced data.');
  } else {
    console.log('❌ Architect prompt missing data.');
  }

  console.log('\n--- Verification Complete ---');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});