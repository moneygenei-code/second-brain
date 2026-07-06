const fs = require('fs');
const path = require('path');

function loadPrompt(agentId, promptName) {
  const filePath = path.join(__dirname, '..', 'prompts', agentId, `${promptName}.md`);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`Failed to load prompt ${promptName} for agent ${agentId}:`, e);
    return '';
  }
}

function fillTemplate(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  }
  return result;
}

module.exports = { loadPrompt, fillTemplate };