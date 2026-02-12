export const universalAgentResponseSchema = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskDescription": {
      "type": "string",
      "description": "A concise natural-language description of the task to be performed."
    },
    "parametersDescription": {
      "type": "string",
      "description": "JSON string containing the parameters as a serialized object. This allows flexible parameter structures while maintaining schema compatibility."
    },
    "expectedOutputDescription": {
      "type": "string",
      "description": "Description of the expected output format and structure, including examples if helpful."
    },
    "reasoning": {
      "type": "string",
      "description": "The reasoning or rationale that justifies why this task should be performed and how the result should be interpreted."
    },
    "missingContext": {
      "type": "array",
      "description": "List of information, data, or prerequisites that are not currently available but are required to execute the task effectively.",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "taskDescription",
    "parametersDescription",
    "expectedOutputDescription",
    "reasoning",
    "missingContext"
  ]
};