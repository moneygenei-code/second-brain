const { z } = require('zod');

/**
 * Base Agent Interface
 * All agents should ideally extend this or implement its contract.
 */
class BaseAgent {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.version = config.version || '1.0.0';
    this.description = config.description;
  }

  /**
   * Returns the Zod schema for the agent's output.
   */
  getSchema() {
    return z.object({
      agent: z.string(),
      headline: z.string(),
      summary: z.string(),
      confidence: z.number().optional(),
      reasoning: z.string().optional(),
      recommendedNext: z.string().optional()
    });
  }

  /**
   * Builds the prompt for the LLM.
   * To be implemented by subclasses.
   */
  buildPrompt(product, context) {
    throw new Error('buildPrompt() must be implemented');
  }

  /**
   * Validates the output against the schema.
   */
  validate(output) {
    const schema = this.getSchema();
    return schema.safeParse(output);
  }

  /**
   * Parses the raw response from the LLM.
   */
  parseResponse(rawResponse) {
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : rawResponse;
      const parsed = JSON.parse(jsonStr);

      const validation = this.validate(parsed);
      if (!validation.success) {
        console.warn(`[Agent:${this.id}] Validation failed:`, validation.error.format());
        // Return parsed anyway but maybe flag it or add defaults
      }

      return parsed;
    } catch (e) {
      console.error(`[Agent:${this.id}] Failed to parse response:`, e);
      return {
        agent: this.name,
        summary: rawResponse,
        error: 'Parse error'
      };
    }
  }
}

module.exports = { BaseAgent };