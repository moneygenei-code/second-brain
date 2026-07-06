const { BaseAgent } = require('./baseAgent');
const { z } = require('zod');
const { loadPrompt, fillTemplate } = require('./promptUtils');

class DennisAgent extends BaseAgent {
  constructor() {
    super({
      id: 'dennis',
      name: 'Dennis',
      description: 'Hyper-focused on market research and creating compelling business ideas.',
      version: '2.0.0'
    });
  }

  getSchema() {
    return super.getSchema().extend({
      generated_title: z.string(),
      generated_description: z.string(),
      generated_tags: z.array(z.string())
    });
  }

  buildPrompt(product, context = {}) {
    const template = loadPrompt('dennis', 'research');
    const data = {
      strategy: context.summary || 'Follow the project goals.',
      persona: context.persona || 'Creative'
    };
    return fillTemplate(template, data);
  }
}

const dennisInstance = new DennisAgent();
const dennisAgent = {
  id: dennisInstance.id,
  name: dennisInstance.name,
  subtitle: dennisInstance.description,
  button: 'Run Dennis',
  requires: ['hermes'],
  buildPrompt: (p, c) => dennisInstance.buildPrompt(p, c),
  parseResponse: (r) => dennisInstance.parseResponse(r)
};

module.exports = { dennisAgent, DennisAgent };