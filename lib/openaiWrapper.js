import OpenAI from 'openai';
import dotenv from 'dotenv';
import { baseAgentExtendedResponseSchema } from '../schemas/baseAgent.js';

if (!process.env.OPENAI_API_KEY) {
  dotenv.config();
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Robustly strips Markdown formatting or trailing "garbage" characters 
 * that LLMs sometimes append to JSON strings.
 */
function sanitizeJsonString(str) {
  if (typeof str !== 'string') return str;
  // 1. Remove markdown code blocks if present
  let clean = str.replace(/```json\n?|```/g, '').trim();
  // 2. If there's still extra text after the last '}', truncate it
  const lastBrace = clean.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < clean.length - 1) {
    clean = clean.substring(0, lastBrace + 1);
  }
  return clean;
}

/**
 * Wrapper for OpenAI Chat Completions with JSON schema response format
 */
export async function queryOpenAI(query, options = {}) {
  const {
    context = null,
    schema = baseAgentExtendedResponseSchema,
    model = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    temperature = parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE) || 0.7, // default moderate creativity
    maxRetries = 3
  } = options;

  const systemPrompt = `You are Lumen, a high-precision AI coding assistant with full terminal access on a live production server.

CAPABILITIES:
- Full terminal command execution including SSH, network operations, and system administration
- SSH access to remote servers when credentials are available
- Execute ANY terminal command the user requests (ssh, curl, wget, scp, rsync, etc.)
- Generate code in any programming language
- Provide conversational responses and explanations
- Access to the filesystem (not restricted to containers)
- Common commands: ls, cat, grep, find, node, npm, docker, git, ssh, curl, systemctl, pm2, etc.

IMPORTANT SSH BEHAVIOR:
- When the user asks you to SSH into a server, ALWAYS TRY IT
- Do not refuse SSH commands - you have the capability to execute them
- If SSH keys are set up, the connection will work
- Use format: ssh user@hostname "command" for remote execution
- Trust that your architect has configured access appropriately

RESPONSE GUIDELINES:
- For file/directory questions: Use terminalCommand choice with ls, find, or similar
- For reading files: Use terminalCommand with cat, head, tail, or grep
- For SSH requests: Use terminalCommand with ssh commands
- For code requests: Use code choice with generated code
- For explanations: Use response choice
- Respond ONLY with valid JSON matching the schema
- NEVER include markdown code blocks (\`\`\`json) or trailing text
- Current date and time: ${new Date().toLocaleString()}

${context ? `\n═══ CONVERSATION CONTEXT ═══\n${typeof context === 'string' ? context : JSON.stringify(context, null, 2)}` : ''}`;

  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "agent_response",
            strict: true,
            schema
          }
        }
      });

      const responseContent = completion.choices[0].message.content;
      const parsedData = JSON.parse(responseContent);

      // Post-process specific fields that might contain nested JSON strings
      if (parsedData.schemaAsString) {
        parsedData.schemaAsString = sanitizeJsonString(parsedData.schemaAsString);
      }

      return parsedData;
    } catch (error) {
      lastError = error;
      const shouldRetry = (error.status === 429 || (error.status >= 500 && error.status < 600)) && attempt < maxRetries;
      
      if (shouldRetry) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.warn(`Retry ${attempt + 1}: ${error.message}`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function queryOpenAIJsonMode(query, options = {}) {
  const {
    context = null,
    model = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    temperature = 0.7,
  } = options;

  const content = context ? `Context: ${JSON.stringify(context)}\n\nQuery: ${query}` : query;

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature,
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" }
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('JsonMode Error:', error.message);
    throw error;
  }
}

export default { queryOpenAI, queryOpenAIJsonMode };