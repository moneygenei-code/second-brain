const { BaseAgent } = require('./baseAgent');
const { z } = require('zod');
const { loadPrompt, fillTemplate } = require('./promptUtils');

class HermesManager extends BaseAgent {
  constructor() {
    super({
      id: 'hermes',
      name: 'Hermes Manager',
      description: 'Strategic orchestrator. He runs the business and delegates to specialists.',
      version: '2.0.0'
    });
  }

  getSchema() {
    return super.getSchema().extend({
      delegation: z.object({
        to_dennis: z.string(),
        to_bunk: z.string()
      })
    });
  }

  buildPrompt(product, context = {}) {
    const template = loadPrompt('hermes', 'orchestration');
    const data = {
      name: (product.name || 'Unnamed business').trim(),
      niche: (product.niche || 'general market').trim(),
      goals: (product.notes || '').trim(),
      strategyHistory: (context.globalStrategy || 'No established strategy yet.').trim(),
      persona: context.persona || 'Balanced'
    };
    return fillTemplate(template, data);
  }
}

// Keep the old object export for compatibility if needed, or transition fully
const hermesInstance = new HermesManager();
const hermesManager = {
  id: hermesInstance.id,
  name: hermesInstance.name,
  subtitle: hermesInstance.description,
  button: 'Run Hermes',
  requires: [],
  buildPrompt: (p, c) => hermesInstance.buildPrompt(p, c),
  parseResponse: (r, p) => hermesInstance.parseResponse(r)
};

module.exports = { hermesManager, HermesManager };