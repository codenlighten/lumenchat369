# Agent Orchestrator System

A sophisticated multi-agent AI system that combines conversation memory, task planning, and terminal execution into a powerful development assistant.

## Architecture

```
User Query
    ↓
┌─────────────────────────────────────┐
│  Landscape Agent (optional)         │
│  - Analyzes query complexity        │
│  - Determines priority              │
│  - Suggests approach                │
└─────────────┬───────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Plan Steps Agent (optional)        │
│  - Breaks down complex tasks        │
│  - Creates actionable steps         │
│  - Identifies missing context       │
└─────────────┬───────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Base Agent (iteration loop)        │
│  Context includes:                  │
│  - Conversation memory              │
│  - Agent notes scratch pad          │
│  - Landscape analysis               │
│  - Plan steps                       │
│  - Previous terminal output         │
└─────────────┬───────────────────────┘
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Terminal Command    Response/Code
    ↓                   ↓
Execute/Approve         │
    └─────────┬─────────┘
              ↓
    Add to memory.json
              ↓
    Update notes.md
              ↓
    Continue flag = true?
         ↓ yes
    Loop with updated context
         ↓ no
    Wait for next query
```

## Components

### Core Libraries

- **lib/openaiWrapper.js** - OpenAI API integration with structured outputs
- **lib/memorySystem.js** - Rolling window memory with automatic summarization
- **lib/notesManager.js** - Agent scratch pad for task tracking
- **lib/agentOrchestrator.js** - Main coordination logic
- **lib/terminalExecutor.js** - Safe terminal command execution
- **lib/auditLogger.js** - Command audit trail
- **lib/secretRedactor.js** - Secret detection and redaction

### Agent Schemas

- **schemas/baseAgent.js** - Main agent for responses, code, and commands
- **schemas/landscapeAgent.js** - Meta-analysis of complex queries
- **schemas/planStepsAgent.js** - Task breakdown into steps
- **schemas/summarizeAgent.js** - Conversation summarization
- **schemas/universalAgent.js** - Universal response schema

### Interfaces

- **chat-cli.js** - Command-line chat interface
- **telegram-bot.js** - Telegram bot integration (exists)

## Features

### 1. Conversation Memory (memory.json)

- Stores last 21 interactions with full context
- Maintains up to 3 summaries of previous interaction blocks
- Automatic summarization when window slides
- Temporal awareness with timestamps

```javascript
import { addInteraction, getMemoryContextString } from './lib/memorySystem.js';

// Add interaction
await addInteraction(userRequest, aiResponse);

// Get formatted context for AI
const context = await getMemoryContextString();
```

### 2. Agent Notes (notes.md)

Scratch pad for tracking current work:

```markdown
## Current Task
Working on API integration

## Plan
- [x] 1. Check package.json
- [ ] 2. Install dependencies
- [ ] 3. Create API client

## Context
- Using Express.js framework
- Database: PostgreSQL

## Completed
- Installed npm packages
- Created project structure

## Blockers
- Missing API key
```

### 3. Multi-Agent Orchestration

**Simple queries** → Direct to Base Agent

**Complex queries** → Landscape → Plan Steps → Base Agent

```javascript
import { orchestrate, orchestrateSimple } from './lib/agentOrchestrator.js';

// Full orchestration with landscape/plan
const result = await orchestrate('Build a REST API with Express', {
  askApproval: (cmd, reason) => confirmWithUser(cmd),
  onThinking: (iteration) => showSpinner(iteration),
  onResponse: (response) => displayResponse(response)
});

// Simple mode (skip landscape/plan)
const result = await orchestrateSimple('What is 2+2?');
```

### 4. Continue Loop

The Base Agent can set `continue: true` to chain multiple iterations:

1. Agent processes query
2. If `continue: true`, shows "thinking..." 
3. Loops with updated context (terminal output, previous response, etc.)
4. Max 5 iterations to prevent infinite loops

### 5. Terminal Execution

Safe command execution with approval gates:

- Dangerous pattern detection
- User approval for sensitive commands
- Auto-approve option for trusted contexts
- Audit logging of all commands

```javascript
// In agent response
{
  choice: 'terminalCommand',
  terminalCommand: 'ls -la',
  commandReasoning: 'List all files to see project structure',
  requiresApproval: false
}
```

## Usage

### CLI Chat Interface

```bash
node chat-cli.js
```

Commands:
- `/help` - Show help
- `/clear` - Clear memory and notes
- `/clearmemory` - Clear memory only
- `/clearnotes` - Clear notes only
- `/simple` - Toggle simple mode
- `/exit` - Exit

### Telegram Bot

See [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) for complete setup guide.

Quick start:
1. Get bot token from @BotFather on Telegram
2. Add to `.env`: `TELEGRAM_BOT_TOKEN=your-token`
3. Run: `npm run telegram`

Features:
- Per-user memory isolation
- Interactive approval buttons
- All orchestrator features
- Commands: /start, /help, /simple, /clear, /notes, /memory

### Running Tests

```bash
# Test individual components
node test-openai-wrapper.js
node test-summarize-agent.js
node test-memory-system.js

# Test full orchestrator
node test-orchestrator.js
```

## Configuration

Create a `.env` file:

```env
# Required
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4o-2024-08-06

# Optional - for Telegram bot
TELEGRAM_BOT_TOKEN=your-telegram-token
```

## Response Types

### 1. Conversational Response

```json
{
  "choice": "response",
  "response": "Here's the answer to your question...",
  "questionsForUser": false,
  "continue": false
}
```

### 2. Code Generation

```json
{
  "choice": "code",
  "code": "function hello() { return 'world'; }",
  "language": "JavaScript",
  "codeExplanation": "A simple hello function",
  "continue": false
}
```

### 3. Terminal Command

```json
{
  "choice": "terminalCommand",
  "terminalCommand": "npm install express",
  "commandReasoning": "Install Express framework",
  "requiresApproval": true,
  "continue": true
}
```

## Memory System Details

### Window Sliding

- Stores 21 most recent interactions
- On interaction #22, summarizes interactions 2-22
- Keeps interaction #1, adds summary, stores new interactions
- Maintains max 3 summaries (oldest dropped first)

### Context String Format

```
═══ CONVERSATION HISTORY (SUMMARIES) ═══
Summary 1 (Interactions 1-21, 2026-02-12T10:00:00Z to 2026-02-12T10:15:00Z):
[Summary text...]

═══ RECENT INTERACTIONS (Last 21) ═══
[2026-02-12T10:30:00Z] Interaction 23:
User Query: Build a REST API
AI Response: I'll help you build that...
```

## Landscape Agent

Analyzes complex queries before processing:

```json
{
  "situationSummary": "User wants to set up project and deploy",
  "overallIntent": "Complete project setup and deployment",
  "suggestedApproach": "First setup locally, then deploy",
  "messageCount": 1,
  "requiresImmediateAction": false,
  "priority": "high"
}
```

Triggers for:
- Multiple sentences
- Numbered lists
- "First... then..." patterns
- Complex multi-step requests

## Plan Steps Agent

Creates structured plans for high-priority tasks:

```json
{
  "steps": [
    {
      "stepDescription": "Check if Node.js is installed",
      "reasoning": "Required to run the application"
    },
    {
      "stepDescription": "Install dependencies",
      "reasoning": "Need packages before running"
    }
  ],
  "missingContext": ["Target deployment platform"]
}
```

## Best Practices

1. **Use Simple Mode** for basic queries to save API calls
2. **Enable Landscape** for complex multi-step tasks
3. **Review Terminal Commands** before approving
4. **Check notes.md** to see agent's current understanding
5. **Monitor memory.json** to verify conversation tracking

## Examples

### Example 1: Simple Question

```
You: What is the capital of France?
Agent: The capital of France is Paris.
```

### Example 2: Code Generation

```
You: Create a fibonacci function in JavaScript
Agent: [generates code]
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
```

### Example 3: Complex Task with Landscape

```
You: First check if package.json exists, then install dependencies, then start the server

[Landscape Analysis]
Priority: high
Intent: Setup and run project

[Plan]
1. Check for package.json
2. Install dependencies
3. Start development server

[Execution with Continue Loop]
Iteration 1: Check package.json ✓
Iteration 2: Run npm install ✓
Iteration 3: Start server ✓
```

## Troubleshooting

**Memory not persisting?**
- Check file permissions on memory.json
- Ensure process.cwd() is correct

**Commands not executing?**
- Verify terminal executor permissions
- Check if requiresApproval is blocking
- Review audit logs

**Continue loop not working?**
- Ensure continue: true in response
- Check MAX_CONTINUE_ITERATIONS (default: 5)
- Verify context is being passed correctly

## License

ISC

## Author

Gregory Ward (greg)

---

Built with ❤️ using OpenAI structured outputs and Node.js
