//create agent schema for returning choice of schema from array of possible schemas, along with reasoning and missing context if applicable

export const schemaChoiceAgentResponseSchema = {
  type: "object",
  properties: {
    choice: {
      type: "string",
      enum: ["response", "code", "terminalCommand"],
      description: "Type of response being provided. 'response' for conversational, 'code' for code generation, 'terminalCommand' for terminal execution"
    },
    reasoning: {
      type: "string",
      description: "The reasoning or rationale that justifies why this particular choice was made and how the result should be interpreted."
    },
    missingContext: {
      type: "array",
      description: "List of information, data, or prerequisites that are not currently available but are required to execute the task effectively.",
      items: {
        type: "string"
      }
    }
  },
  required: ["choice", "reasoning", "missingContext"],
  additionalProperties: false
};