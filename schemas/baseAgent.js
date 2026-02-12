/**
 * Base Agent Extended Response Schema
 * 
 * Universal agent that can return:
 * - Conversational responses (with follow-up questions, missing context)
 * - Code generation (without questions/context)
 * - Terminal commands (without questions/context)
 * 
 * The 'choice' field determines which type of response is being provided.
 */
export const baseAgentExtendedResponseSchema = {
  type: "object",
  properties: {
    choice: {
      type: "string",
      enum: ["response", "code", "terminalCommand"],
      description: "Type of response being provided. 'response' for conversational, 'code' for code generation, 'terminalCommand' for terminal execution"
    },
    
    // Conversational response fields (used when choice = "response")
    response: { 
      type: "string",
      description: "Natural language response to the user"
    },
    questionsForUser: { 
      type: "boolean", 
      description: "Whether this agent has a follow-up question for the user (only applicable when choice='response')" 
    },
    questions: { 
      type: "array", 
      description: "The follow-up question(s) for the user (only if questionsForUser is true and choice='response')",
      items: { type: "string" }
    },
    missingContext: {
      type: "array",
      description: "List of strings indicating what information is missing for an ideal response (only applicable when choice='response')",
      items: { type: "string" }
    },
    
    // Code generation fields (used when choice = "code")
    code: { 
      type: "string",
      description: "Generated code (when choice='code')"
    },
    language: {
      type: "string",
      description: "Programming language of the generated code (when choice='code')"
    },
    codeExplanation: {
      type: "string",
      description: "Brief explanation of what the code does (when choice='code')"
    },
    
    // Terminal command fields (used when choice = "terminalCommand")
    terminalCommand: {
      type: "string",
      description: "The terminal command to execute (when choice='terminalCommand')"
    },
    commandReasoning: {
      type: "string",
      description: "Explanation of why this command was chosen and what it will do (when choice='terminalCommand')"
    },
    requiresApproval: {
      type: "boolean",
      description: "Whether this command requires user approval before execution (when choice='terminalCommand')"
    },
    tool: {
      type: "boolean",
      description: "whether another tool should be used or if we have responded fully to the user query."
    },
    // Universal fields (applicable to all choices)
    continue: { 
      type: "boolean", 
      description: "Whether this agent has more reasoning or work to do and should be called again automatically" 
    }
  },
  required: ["choice", "response", "questionsForUser", "questions", "missingContext", "code", "language", "codeExplanation", "terminalCommand", "commandReasoning", "requiresApproval", "tool", "continue"],
  additionalProperties: false
};

/**
 * Request Fulfilled Schema
 * 
 * Simple boolean response indicating whether the user's request
 * has been fully satisfied given the current conversation context.
 */
export const requestFulfilledSchema = {
  type: "object",
  properties: {
    requestFulfilled: {
      type: "boolean",
      description: "Whether the user's request has been fully fulfilled"
    }
  },
  required: ["requestFulfilled"],
  additionalProperties: false
};
