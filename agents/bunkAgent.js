const { BaseAgent } = require('./baseAgent');
const { z } = require('zod');
const { loadPrompt, fillTemplate } = require('./promptUtils');

class BunkAgent extends BaseAgent {
  constructor() {
    super({
      id: 'bunk',
      name: 'Bunk',
      description: 'Focused on production, design of physical goods (T-shirts, bottles), and logistics.',
      version: '2.0.0'
    });
  }

  getSchema() {
    return super.getSchema().extend({
      launch_plan: z.array(z.string()),
      next_steps: z.array(z.string()),
      generated_price: z.number()
    });
  }

  buildPrompt(product, context = {}) {
    const template = loadPrompt('bunk', 'production');
    const data = {
      strategy: context.summary || 'Follow the project goals.',
      persona: context.persona || 'Balanced'
    };
    return fillTemplate(template, data);
  }
}

const bunkInstance = new BunkAgent();
const bunkAgent = {
  id: bunkInstance.id,
  name: bunkInstance.name,
  subtitle: bunkInstance.description,
  button: 'Run Bunk',
  requires: ['hermes'],
  buildPrompt: (p, c) => bunkInstance.buildPrompt(p, c),
  parseResponse: (r) => bunkInstance.parseResponse(r)
};

module.exports = { bunkAgent, BunkAgent };