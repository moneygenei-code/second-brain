const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VAULT_PATH = path.join(__dirname, 'second-brain-vault');

/**
 * Log agent activity or a deal to the Second Brain vault
 * @param {Object} entry
 * @param {string} entry.agentId
 * @param {string} entry.agentName
 * @param {string} entry.type - 'activity' or 'deal'
 * @param {string} entry.status - 'success' or 'failure'
 * @param {Object} entry.data - The actual content/payload
 * @param {string} [entry.error] - Error message if failed
 */
async function logToSecondBrain({ agentId, agentName, type, status, data, error }) {
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

    let content = `---
agent: ${agentId}
agentName: ${agentName}
timestamp: ${timestamp}
type: ${type}
status: ${status}
---

# ${type.charAt(0).toUpperCase() + type.slice(1)} Log - ${agentName}

**Status:** ${status === 'success' ? '✅ Success' : '❌ Failure'}
**Time:** ${timestamp}

## Data
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

`;

    if (error) {
      content += `## Error\n${error}\n\n`;
    }

    await fs.promises.writeFile(filePath, content, 'utf8');

    // Auto-commit to the second brain repo
    try {
      // Check if git is initialized and user is configured
      try {
        execSync('git rev-parse --is-inside-work-tree', { cwd: VAULT_PATH, stdio: 'ignore' });
      } catch (e) {
        execSync('git init', { cwd: VAULT_PATH, stdio: 'ignore' });
      }

      try {
        execSync('git config user.name', { cwd: VAULT_PATH, stdio: 'ignore' });
      } catch (e) {
        execSync('git config user.name "Second Brain Agent"', { cwd: VAULT_PATH, stdio: 'ignore' });
        execSync('git config user.email "agent@secondbrain.ai"', { cwd: VAULT_PATH, stdio: 'ignore' });
      }

      execSync(`git add ${folder}/${fileName}`, { cwd: VAULT_PATH, stdio: 'ignore' });
      execSync(`git commit -m "Auto-log: ${type} from ${agentId} at ${timestamp}"`, { cwd: VAULT_PATH, stdio: 'ignore' });
    } catch (gitErr) {
      console.error('[SecondBrain] Git auto-commit failed:', gitErr.message);
      // Non-blocking error, we still saved the file
    }

    return { success: true, path: filePath };
  } catch (err) {
    console.error('[SecondBrain] Logging failed:', err);
    return { success: false, error: err.message };
  }
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
        logs[folder].push({ file, content });
      }
    }
  }

  return logs;
}

module.exports = {
  logToSecondBrain,
  getAllLogs,
  VAULT_PATH
};