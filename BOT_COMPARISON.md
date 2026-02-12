# Bot System Comparison

This project now includes TWO different bot architectures for different use cases.

---

## Quick Comparison

| Feature | Full Orchestrator | Group Chat Bot |
|---------|------------------|----------------|
| **File** | `telegram-bot.js` | `telegram-group-bot.js` |
| **Manager** | `agentOrchestrator.js` | `groupChatManager.js` |
| **Landscape Analysis** | ✅ Yes | ❌ No |
| **Plan Steps** | ✅ Yes | ❌ No |
| **Notes Scratch Pad** | ✅ Yes | ❌ No |
| **Continue Loop** | ✅ Yes (max 5) | ❌ No |
| **Message Tracking** | Bot interactions only | **ALL messages** |
| **Summary Type** | On-demand | **Always updated** |
| **Context Building** | Memory + Notes + Plan | **Global Summary + Recent Messages** |
| **Participants** | Single user focus | **Multi-user tracking** |
| **Response Trigger** | All mentions | Smart (mentioned/keywords) |
| **Best For** | Complex tasks | Group conversations |
| **Speed** | Slower (more analysis) | **Faster** |
| **API Costs** | Higher | **Lower** |
| **Use Case** | Coding assistant | Group chat bot |

---

## Full Orchestrator

**File:** `telegram-bot.js`  
**Core:** `lib/agentOrchestrator.js`  
**Storage:** `memory.json`, `notes.md`

### Architecture

```
User Query
    ↓
[Landscape Analysis] ← Complex query?
    ↓
[Plan Steps] ← High priority?
    ↓
[Base Agent] → Continue loop (up to 5 iterations)
    ↓
[Memory System] → Save interaction
    ↓
[Notes Manager] → Update scratch pad
```

### Features

1. **Landscape Analysis**
   - Analyzes query complexity
   - Determines priority
   - Suggests approach

2. **Plan Steps**
   - Breaks down complex tasks
   - Creates actionable steps
   - Auto-completion tracking

3. **Continue Loop**
   - Multi-iteration processing
   - Up to 5 automatic iterations
   - Terminal output feedback

4. **Notes System**
   - Scratch pad for tasks
   - Plan tracking
   - Context accumulation
   - Blocker recording

5. **Memory System**
   - Last 21 interactions
   - Up to 3 summaries
   - Temporal awareness

### Best For

- ✅ Complex coding tasks
- ✅ Multi-step workflows
- ✅ File system operations
- ✅ Terminal command sequences
- ✅ Code generation with planning
- ✅ Single-user interactions

### Commands

```bash
# Start full orchestrator bot
npm run telegram

# CLI version
npm run chat
```

### Example Usage

```
You: Create a new Express API with authentication and database

Bot: [Runs landscape analysis]
Priority: High
Approach: Multi-step implementation

[Creates plan]
1. Initialize npm project
2. Install dependencies
3. Create server structure
4. Implement authentication
5. Set up database

[Executes each step with continue loop]
[Updates notes with progress]
[Tracks completion]
```

---

## Group Chat Bot

**File:** `telegram-group-bot.js`  
**Core:** `lib/groupChatManager.js`  
**Storage:** `groupchat-{groupId}.json`

### Architecture

```
All Messages → [Add to History]
                      ↓
User @mentions → [Build Context: Summary + Recent Messages]
                      ↓
                [Base Agent] → Single response
                      ↓
                [Update Summary]
```

### Features

1. **Full Message Tracking**
   - Tracks EVERY message in group
   - Not just bot interactions
   - Complete conversation history

2. **Running Global Summary**
   - Updates after every bot response
   - Captures topics, decisions, participants
   - Max 2000 characters

3. **Message Window**
   - Keeps last 50 messages
   - Older messages in summary
   - Efficient memory usage

4. **Participant Tracking**
   - Set of all participants
   - Username tracking
   - Activity awareness

5. **Smart Response**
   - Only responds when mentioned
   - Or specific keywords
   - Prevents spam

### Best For

- ✅ Telegram group rooms
- ✅ Team discussions
- ✅ Support channels
- ✅ Learning communities
- ✅ Multi-user conversations
- ✅ Context-aware responses

### Commands

```bash
# Start group chat bot
npm run telegram-group

# CLI version (simulate multi-user)
npm run chat-group
```

### Example Usage

```
Alice: Hey everyone, anyone know Docker?
[Bot tracks but doesn't respond]

Bob: I use it for deployments
[Bot tracks but doesn't respond]

Charlie: @bot can you explain Docker?

Bot: [Sees full context: Alice asked, Bob uses it]
Docker is a containerization platform...
[Provides context-aware answer]
[Updates summary: "Discussion about Docker, Alice learning, Bob experienced"]
```

---

## When to Use Which?

### Use Full Orchestrator When:

- **Complex Task**: Multi-step coding projects
- **Planning Needed**: Breaking down requirements
- **Single User**: One-on-one assistance
- **Terminal Heavy**: Multiple system commands
- **Code Generation**: Need structured approach
- **Continue Loop**: Task needs iterations

**Example Scenarios:**
- "Build me a REST API with authentication"
- "Debug this production server"
- "Migrate database and update code"
- "Set up CI/CD pipeline"

### Use Group Chat Bot When:

- **Group Chat**: Multiple people talking
- **Context Matters**: Need full conversation
- **Quick Responses**: Simple, fast answers
- **Participant Awareness**: Who said what matters
- **Discussion Tracking**: Ongoing conversations
- **Lower Costs**: Simpler = cheaper

**Example Scenarios:**
- Team discussing architecture
- Support channel with multiple users
- Learning group asking questions
- Project planning meetings

---

## Technical Comparison

### Context Window Size

**Full Orchestrator:**
```
Memory: 21 interactions (~10-20KB)
Notes: Full scratch pad (~5-10KB)
Plan: If generated (~2-5KB)
Total: ~15-35KB per request
```

**Group Chat Bot:**
```
Summary: 2000 chars (~2KB)
Recent Messages: 20 messages (~5-10KB)
Total: ~7-12KB per request
```

**Winner:** Group Chat Bot (smaller context = lower costs)

### Response Time

**Full Orchestrator:**
```
Landscape Analysis: ~2-3 seconds
Plan Steps: ~2-3 seconds (if needed)
Base Agent: ~2-3 seconds
Continue Loop: +2-3 seconds per iteration
Total: 2-15 seconds
```

**Group Chat Bot:**
```
Base Agent: ~2-3 seconds
Summary Update: ~2-3 seconds
Total: 4-6 seconds
```

**Winner:** Group Chat Bot (faster by 50-70%)

### API Costs (Approximate)

**Full Orchestrator (Complex Query):**
```
Landscape: $0.01
Plan: $0.01
Base Agent: $0.02
Continue (3x): $0.06
Total: ~$0.10 per complex query
```

**Group Chat Bot:**
```
Base Agent: $0.02
Summary Update: $0.01
Total: ~$0.03 per interaction
```

**Winner:** Group Chat Bot (70% cheaper)

### Data Persistence

**Full Orchestrator:**
- `memory.json` - Interactions
- `notes.md` - Scratch pad
- Per-user isolation via env vars

**Group Chat Bot:**
- `groupchat-{groupId}.json` - Everything
- Per-group isolation
- Simpler file structure

**Winner:** Tie (both use atomic writes, both isolated)

---

## Migration Guide

### From Full Orchestrator to Group Chat

If you're currently using the full orchestrator but want group features:

```javascript
// Old (Full Orchestrator)
import { orchestrate } from './lib/agentOrchestrator.js';

const result = await orchestrate(query, {
  askApproval,
  onThinking,
  onResponse
});

// New (Group Chat)
import { generateResponse, addMessage } from './lib/groupChatManager.js';

// Track all messages (not just bot)
await addMessage(groupId, {
  userId: user.id,
  username: user.name,
  text: message,
  isBot: false
});

// Generate response when needed
const result = await generateResponse(groupId, userMessage, {
  askApproval,
  autoUpdateSummary: true
});
```

### Running Both Systems

You can run both simultaneously for different purposes:

```bash
# Terminal 1: Full orchestrator for individual users
npm run telegram

# Terminal 2: Group bot for group chats
npm run telegram-group
```

Use different Telegram bot tokens or configure routing logic.

---

## Future Improvements

### Full Orchestrator

- [ ] Async continue loop with progress updates
- [ ] Plan step dependencies
- [ ] Rollback on failure
- [ ] File operation batching

### Group Chat Bot

- [ ] Message search functionality
- [ ] Thread tracking
- [ ] Per-user summaries
- [ ] Export conversation logs
- [ ] Analytics dashboard

### Both Systems

- [ ] Shared memory system
- [ ] Cross-bot learning
- [ ] Unified configuration
- [ ] Performance monitoring

---

## Conclusion

Both systems excel in their respective domains:

**Full Orchestrator** = Swiss Army knife for complex individual tasks  
**Group Chat Bot** = Optimized for multi-user conversations

Choose based on your use case, or use both for maximum flexibility!
