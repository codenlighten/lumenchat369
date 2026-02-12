/**
 * Landscape Agent Schema
 * 
 * Meta-analysis of message batches to understand situational context
 * and strategic response approach before individual message processing
 */

const landscapeAgentResponseSchema = {
  type: "object",
  properties: {
    situationSummary: {
      type: "string",
      description: "A concise summary of all new messages in this batch. What is the user trying to accomplish across these messages?"
    },
    overallIntent: {
      type: "string",
      description: "The primary goal derived from the collective messages. Examples: 'Troubleshoot server', 'Deploy code', 'Request information', 'Multiple unrelated tasks'"
    },
    suggestedApproach: {
      type: "string",
      description: "Strategic guidance on how to sequence responses. Examples: 'Acknowledge greeting first, then diagnose server issue', 'Combine all questions into one response', 'Process each task separately in order'"
    },
    messageCount: {
      type: "number",
      description: "Number of messages in this batch"
    },
    requiresImmediateAction: {
      type: "boolean",
      description: "Whether any message requires urgent/immediate action (server down, critical error, etc.)"
    },
    priority: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      description: "Overall priority level of this batch"
    }
  },
  required: ["situationSummary", "overallIntent", "suggestedApproach", "messageCount", "requiresImmediateAction", "priority"],
  additionalProperties: false
};

export { landscapeAgentResponseSchema };
