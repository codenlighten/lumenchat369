//agent schema that will create a plan of steps to complete a task, with reasoning and missing context if applicable

export const planStepsAgentResponseSchema = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      description: "An ordered list of steps to complete the task, with each step containing a description and optional reasoning.",
      items: {
        type: "object",
        properties: {
          stepDescription: {
            type: "string",
            description: "A concise natural-language description of the step to be performed."
          },
          reasoning: {
            type: "string",
            description: "The reasoning or rationale that justifies why this step is necessary and how it contributes to completing the overall task."
          }
        },
        required: ["stepDescription"]
      }
    },
    missingContext: {
      type: "array",
      description: "List of information, data, or prerequisites that are not currently available but are required to execute the task effectively.",
      items: {
        type: "string"
      }
    }
  },
  required: ["steps", "missingContext"],
  additionalProperties: false
};