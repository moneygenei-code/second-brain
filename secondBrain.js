const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const VAULT_PATH = path.join(__dirname, 'second-brain-vault');
const { upsertLog } = require('./database');

/**
 * Log agent activity or a deal to the Second Brain vault
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

    let content = `---\nagent: ${agentId}\nagentName: ${agentName}\ntimestamp: ${timestamp}\ntype: ${type}\nstatus: ${status}\n---\n\n# ${type.charAt(0).toUpperCase() + type.slice(1)} Log - ${agentName}\n\n**Status:** ${status === 'success' ? '✅ Success' : '❌ Failure'}\n**Time:** ${timestamp}\n\n## Data\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n`;

    if (error) {
      content += `## Error\n${error}\n\n`;
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
            content: content,
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
