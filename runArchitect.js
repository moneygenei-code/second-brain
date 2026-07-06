const { getAllLogs, logToSecondBrain } = require('./secondBrain');
const { architectAgent } = require('./agents/architectAgent');
const { callLLM } = require('./llm');

async function runArchitect() {
  console.log('[Architect] Starting analysis...');

  try {
    // 1. Get all logs from the Second Brain
    const logs = await getAllLogs();
    console.log(`[Architect] Loaded logs: ${logs.deals.length} deals, ${logs.agents.length} agent logs.`);

    // 2. Build the prompt
    const prompt = architectAgent.buildPrompt('General Ecosystem', { logs });

    // 3. Call the LLM
    console.log('[Architect] Consulting Gemini...');
    const rawResponse = await callLLM(prompt);

    // 4. Parse the response
    const analysis = architectAgent.parseResponse(rawResponse);
    console.log('[Architect] Analysis complete.');

    // 5. Log the results back to the Second Brain
    const result = await logToSecondBrain({
      agentId: architectAgent.id,
      agentName: architectAgent.name,
      type: 'activity',
      status: 'success',
      data: analysis
    });

    if (result.success) {
      console.log(`[Architect] Strategic plan saved to: ${result.path}`);
    } else {
      console.error('[Architect] Failed to save plan:', result.error);
    }

  } catch (error) {
    console.error('[Architect] Run failed:', error.message);

    // Log the failure
    await logToSecondBrain({
      agentId: architectAgent.id,
      agentName: architectAgent.name,
      type: 'activity',
      status: 'failure',
      data: {},
      error: error.message
    });
  }
}

// Run if called directly
if (require.main === module) {
  runArchitect();
}

module.exports = { runArchitect };
