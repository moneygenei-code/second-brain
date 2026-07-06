const chokidar = require('chokidar');
const matter = require('gray-matter');
const fs = require('fs');
const path = require('path');
const { upsertLog, updateRoadmap } = require('./database');

const VAULT_PATH = path.join(__dirname, 'second-brain-vault');

function startSync() {
  console.log(`[Sync] Watching ${VAULT_PATH}...`);

  const watcher = chokidar.watch(VAULT_PATH, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  watcher.on('add', (filePath) => syncFile(filePath));
  watcher.on('change', (filePath) => syncFile(filePath));
}

async function syncFile(filePath) {
  if (!filePath.endsWith('.md')) return;

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    const id = path.basename(filePath, '.md');

    upsertLog({
      id,
      agentId: String(data.agent || ''),
      agentName: String(data.agentName || ''),
      type: String(data.type || ''),
      status: String(data.status || ''),
      timestamp: String(data.timestamp || ''),
      content: String(content || ''),
      filePath: String(filePath || '')
    });

    // If it's an Architect log, update the roadmap
    if (data.agent === 'architect') {
        try {
            // Find JSON block or the whole content if it looks like JSON
            let jsonStr = content;
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            } else {
                // If no backticks, try to extract first { to last }
                const firstBrace = content.indexOf('{');
                const lastBrace = content.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonStr = content.substring(firstBrace, lastBrace + 1);
                }
            }

            const payload = JSON.parse(jsonStr);
            if (payload.future_plan && Array.isArray(payload.future_plan)) {
                updateRoadmap(payload.future_plan);
            }
        } catch (e) {
            console.error('[Sync] Failed to parse Architect future_plan:', e.message);
        }
    }

    console.log(`[Sync] Synced: ${id}`);
  } catch (err) {
    console.error(`[Sync] Error syncing ${filePath}:`, err.message);
  }
}

module.exports = { startSync };
