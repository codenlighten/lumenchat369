/**
 * Summarize Agent Schema
 * 
 * Purpose: Generate clear, detailed, and coherent summaries based on a query and optional context.
 * Returns a summary with reasoning and identification of any missing information that would improve quality.
 * 
 * Use Cases:
 * - Summarize long articles or documentation
 * - Extract key information from meeting notes or conversations
 * - Analyze code repositories or pull requests
 * - Create executive summaries from detailed reports
 * - Condense research papers or technical documentation
 */
export const summarizeAgentResponseSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A clear, detailed, and coherent summary derived from the query and any provided context"
    },
    missingContext: {
      type: "array",
      items: { type: "string" },
      description: "List of missing information that would improve the quality, accuracy, or specificity of the summary. Empty array if complete"
    },
    reasoning: {
      type: "string",
      description: "Explanation of how the summary was constructed, including key assumptions, prioritization of information, and any notable omissions"
    }
  },
  required: ["summary", "missingContext", "reasoning"],
  additionalProperties: false
};
