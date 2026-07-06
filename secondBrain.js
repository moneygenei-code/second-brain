const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const VAULT_PATH = path.join(__dirname, 'second-brain-vault');
const { upsertLog } = require('./database');

/**
 * Log agent activity or a deal to the Second Brain vault
 * @param {Object} entry
 * @param {string} entry.agentId
 * @param {string} entry.agentName
 * @param {string} entry.type - 'activity' or 'deal'
 * @param {string} entry.status - 'success' or 'failure'
 * @param {Object} entry.data - The actual content/payload
 * @param {string} [entry.error] - Error message if failed
 * @param {string} [entry.missionId] - ID of the current mission
 * @param {string} [entry.pipelineStep] - Step in the 5-stage pipeline
 * @param {Object} [entry.metrics] - Performance metrics (durationMs, tokensPrompt, tokensCompletion, tokensTotal)
 * @param {Object} [entry.metadata] - Additional metadata (model, persona, etc.)
 * @param {Object} [entry.errorDetails] - Categorized error information (errorCode, category)
 */
async function logToSecondBrain({
  agentId,
  agentName,
  type,
  status,
  data,
  error,
  missionId = 'unknown',
  pipelineStep = 'none',
  metrics = {},
  metadata = {},
  errorDetails = {}
}) {
  try {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    const timeStr = timestamp.split('T')[1].replace(/:/g, '-').split('.')[0];

    const fileName = `${dateStr}_${timeStr}_${agentId}.md`;
    const folder = type === 'deal' ? 'deals' : 'agents';
    const folderPath = path.join(VAULT_PATH, folder);

    if (!fs.existsSync(folderPath)) {
      await fs.promises.mkdir(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, fileName);

    // Build Frontmatter
    let frontmatter = `---\nagent: ${agentId}\nagentName: ${agentName}\ntimestamp: ${timestamp}\ntype: ${type}\nstatus: ${status}\nmissionId: ${missionId}\npipelineStep: ${pipelineStep}\n`;

    if (metrics.durationMs) frontmatter += `durationMs: ${metrics.durationMs}\n`;
    if (metrics.tokensTotal) frontmatter += `tokensTotal: ${metrics.tokensTotal}\n`;
    if (metadata.model) frontmatter += `model: ${metadata.model}\n`;
    if (metadata.persona) frontmatter += `persona: ${metadata.persona}\n`;
    if (errorDetails.errorCode) frontmatter += `errorCode: ${errorDetails.errorCode}\n`;

    frontmatter += `---\n\n`;

    let content = frontmatter;
    content += `# ${type.charAt(0).toUpperCase() + type.slice(1)} Log - ${agentName}\n\n`;
    content += `**Status:** ${status === 'success' ? '✅ Success' : '❌ Failure'}\n`;
    content += `**Time:** ${timestamp}\n`;
    content += `**Mission:** ${missionId}\n`;
    content += `**Pipeline Step:** ${pipelineStep}\n\n`;

    if (Object.keys(metrics).length > 0) {
      content += `## Metrics\n`;
      content += `\`\`\`json\n${JSON.stringify(metrics, null, 2)}\n\`\`\`\n\n`;
    }

    content += `## Data\n`;
    content += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n`;

    if (error || Object.keys(errorDetails).length > 0) {
      content += `## Error\n`;
      if (error) content += `**Message:** ${error}\n`;
      if (Object.keys(errorDetails).length > 0) {
        content += `\`\`\`json\n${JSON.stringify(errorDetails, null, 2)}\n\`\`\`\n`;
      }
      content += `\n`;
    }

    await fs.promises.writeFile(filePath, content, 'utf8');

    // NEW: Sync to DB immediately (best-effort)
    try {
      await upsertLog({
        id: `${dateStr}_${timeStr}_${agentId}`,
        agentId,
        agentName,
        type,
        status,
        timestamp,
        content,
        filePath
      });
    } catch (dbErr) {
      console.error('[SecondBrain] DB log failed:', dbErr && dbErr.message ? dbErr.message : dbErr);
    }

    // Auto-commit to the second brain repo
    try {
      if (fs.existsSync(path.join(VAULT_PATH, '.git'))) {
        execFileSync('git', ['add', `${folder}/${fileName}`], { cwd: VAULT_PATH });
        execFileSync('git', ['commit', '-m', `Auto-log: ${type} from ${agentId} at ${timestamp}`], { cwd: VAULT_PATH });
      }
    } catch (gitErr) {
      console.error('[SecondBrain] Git auto-commit failed:', gitErr && gitErr.message ? gitErr.message : gitErr);
    }

    return { success: true, path: filePath };
  } catch (err) {
    console.error('[SecondBrain] Logging failed:', err && err.message ? err.message : err);
    return { success: false, error: err && err.message ? err.message : String(err) };
  }
}

/**
 * Helper to parse YAML-like frontmatter from markdown
 * @param {string} content
 */
function parseFrontmatter(content) {
  const match = content.match(/^---([\s\S]*?)---/);
  if (!match) return {};

  const yaml = match[1];
  const obj = {};
  yaml.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim();
      const val = line.substring(colonIndex + 1).trim();
      if (key) obj[key] = val;
    }
  });
  return obj;
}

/**
 * Read all logs for analysis
 */
async function getAllLogs() {
  const logs = { deals: [], agents: [] };

  for (const folder of ['deals', 'agents']) {
    const dirPath = path.join(VAULT_PATH, folder);
    if (!fs.existsSync(dirPath)) continue;

    const files = await fs.promises.readdir(dirPath);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.promises.readFile(path.join(dirPath, file), 'utf8');
        const metadata = parseFrontmatter(content);
        logs[folder].push({ file, content, metadata });
      }
    }
  }

  return logs;
}

/**
 * Generate aggregated analytics from all logs
 */
async function getAggregatedAnalytics() {
  const allLogs = await getAllLogs();
  const combined = [...allLogs.agents, ...allLogs.deals];

  const stats = {
    totalLogs: combined.length,
    successRate: 0,
    byAgent: {},
    byPipelineStep: {},
    byErrorCode: {},
    averageDuration: 0,
    totalTokens: 0
  };

  if (combined.length === 0) return stats;

  let successCount = 0;
  let totalDuration = 0;
  let durationCount = 0;

  combined.forEach(log => {
    const meta = log.metadata;
    const agent = meta.agent || 'unknown';
    const step = meta.pipelineStep || 'none';
    const status = meta.status;
    const duration = parseInt(meta.durationMs);
    const tokens = parseInt(meta.tokensTotal);
    const errorCode = meta.errorCode;

    if (status === 'success') successCount++;

    // Agent breakdown
    if (!stats.byAgent[agent]) {
      stats.byAgent[agent] = { total: 0, success: 0, fail: 0 };
    }
    stats.byAgent[agent].total++;
    stats.byAgent[agent][status === 'success' ? 'success' : 'fail']++;

    // Pipeline breakdown
    if (!stats.byPipelineStep[step]) {
      stats.byPipelineStep[step] = { total: 0, success: 0, fail: 0 };
    }
    stats.byPipelineStep[step].total++;
    stats.byPipelineStep[step][status === 'success' ? 'success' : 'fail']++;

    // Error code breakdown
    if (errorCode) {
      stats.byErrorCode[errorCode] = (stats.byErrorCode[errorCode] || 0) + 1;
    }

    if (!isNaN(duration)) {
      totalDuration += duration;
      durationCount++;
    }
    if (!isNaN(tokens)) {
      stats.totalTokens += tokens;
    }
  });

  stats.successRate = (successCount / combined.length) * 100;
  stats.averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;

  return stats;
}

module.exports = {
  logToSecondBrain,
  getAllLogs,
  getAggregatedAnalytics,
  VAULT_PATH,
  parseFrontmatter
};
