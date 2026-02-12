# Group Chat Bot - Documentation

**Created:** 2026-02-12  
**Purpose:** Simplified bot optimized for group conversations with full message tracking

---

## Overview

The Group Chat Bot is a streamlined version of the orchestrator designed specifically for Telegram group rooms and multi-user conversations. Unlike the full orchestrator which uses landscape analysis, plan steps, and notes, this bot focuses on:

- **Tracking ALL messages** from all participants (not just bot interactions)
- **Maintaining a running global summary** that updates after every interaction
- **Using only baseAgent** for simpler, faster responses
- **Group context awareness** with participant tracking

---

## Architecture

### Components

1. **groupChatManager.js** - Core group chat logic
   - Message storage and retrieval
   - Global summary management
   - Bot response generation
   - Atomic file operations

2. **chat-group-cli.js** - CLI interface for testing
   - Simulate multi-user conversations
   - View summaries
   - Test bot responses

3. **telegram-group-bot.js** - Telegram integration
   - Tracks all group messages
   - Responds when mentioned
   - Per-group isolation
   - Inline approval buttons

### Data Structure

Each group maintains a JSON file: `groupchat-{groupId}.json`

```json
{
  "groupId": "tg_-123456789",
  "globalSummary": "Current conversation summary...",
  "messages": [
    {
      "id": 1,
      "timestamp": "2026-02-12T10:00:00.000Z",
      "userId": "123",
      "username": "Alice",
      "text": "Hey everyone!",
      "isBot": false
    }
  ],
  "totalMessages": 5,
  "lastUpdated": "2026-02-12T10:05:00.000Z",
  "participants": ["Alice", "Bob", "LumenBot"]
}
```

---

## Key Features

### 1. Full Message Tracking

Unlike the standard bot that only tracks its own interactions, this bot tracks **every message** in the group:

```javascript
// Every message is recorded, even if bot doesn't respond
await addMessage(groupId, {
  userId: msg.from.id.toString(),
  username: username,
  text: text,
  isBot: false
});
```

**Benefits:**
- Complete conversation context
- Better understanding of group dynamics
- Can reference earlier discussions
- Participant awareness

### 2. Running Global Summary

Summary updates automatically after each bot response:

```javascript
// Summary is regenerated considering all recent messages
await updateGlobalSummary(groupId);
```

**Summary includes:**
- Main topics being discussed
- Decisions and action items
- Ongoing conversations
- Active participants
- Important information

**Example Summary:**
```
The conversation involves deploying Node.js applications. Alice asked 
about deployment methods. Bob suggested PM2, Charlie recommended Docker. 
LumenBot compared both approaches. Participants: Alice, Bob, Charlie, 
LumenBot. No action items yet.
```

### 3. Message Window

Keeps last 50 messages in active window to prevent unbounded growth:

```javascript
const MAX_MESSAGES_WINDOW = 50;

if (chatData.messages.length > MAX_MESSAGES_WINDOW) {
  chatData.messages.shift(); // Remove oldest
}
```

Older messages are captured in the global summary before being removed.

### 4. Context Building

Bot receives rich context for every response:

```
═══ CONVERSATION SUMMARY ═══
[Global summary of entire conversation]

═══ PARTICIPANTS ═══
Alice, Bob, Charlie, LumenBot

═══ RECENT MESSAGES (Last 20) ═══
[10:00:15] Alice: Hey everyone!
[10:00:32] Bob: Hi Alice!
[10:01:05] Charlie: What's up?
...
```

### 5. Smart Response Triggering

In group chats, bot only responds when:
- Mentioned: `@botusername`
- Keywords: "lumen", "bot"
- Prefixes: "hey bot", "bot,"
- DMs: Always responds

This prevents spam while staying aware of all context.

---

## Usage

### CLI Testing

```bash
npm run chat-group
```

Commands:
- `/help` - Show help
- `/summary` - View current summary
- `/simulate` - Add message from another user
- `/clear` - Clear conversation
- `/exit` - Exit

Example session:
```
You: Hey everyone, I need help with Docker

🤖 LumenBot: I'd be happy to help! What specific aspect...

You: /simulate
Username: Bob
Message: I can help with that

You: /summary
[Shows full conversation summary]
```

### Telegram Bot

Start the bot:
```bash
npm run telegram-group
```

In your group:
```
Alice: Hey @botusername, what's Docker?
Bot: Docker is a containerization platform...

Bob: Thanks for explaining!
[Bot tracks Bob's message but doesn't respond]

Charlie: @bot can you give an example?
Bot: Sure! Here's a Dockerfile example...
```

View summary:
```
/summary
📊 Conversation Summary
[Full summary with participants and topics]
```

---

## Comparison with Full Orchestrator

| Feature | Full Orchestrator | Group Chat Bot |
|---------|------------------|----------------|
| **Landscape Analysis** | ✅ Yes | ❌ No |
| **Plan Steps** | ✅ Yes | ❌ No |
| **Notes Scratch Pad** | ✅ Yes | ❌ No |
| **Message Tracking** | Bot only | Everyone |
| **Summary** | On-demand | Always updated |
| **Complexity** | High | Low |
| **Response Speed** | Slower | Faster |
| **Best For** | Complex tasks | Group chat |
| **Multi-user** | No | Yes |

---

## Configuration

### Constants

```javascript
// lib/groupChatManager.js
const MAX_MESSAGES_WINDOW = 50;      // Keep last 50 messages
const MAX_SUMMARY_LENGTH = 2000;     // Max summary characters
```

### Environment Variables

- `USER_GROUPCHAT_FILE` - Custom file path for group data
- `OPENAI_API_KEY` - OpenAI API key
- `TELEGRAM_BOT_TOKEN` - Telegram bot token

---

## API Reference

### addMessage(groupId, message)

Add a message to the group chat history.

```javascript
await addMessage('my-group', {
  userId: '123',
  username: 'Alice',
  text: 'Hello world',
  isBot: false
});
```

### updateGlobalSummary(groupId)

Update the running summary for a group.

```javascript
const summary = await updateGlobalSummary('my-group');
console.log(summary);
```

### generateResponse(groupId, userMessage, options)

Generate bot response with full context.

```javascript
const result = await generateResponse('my-group', {
  userId: '123',
  username: 'Alice',
  text: 'What is Docker?',
  isBot: false
}, {
  askApproval: approvalFunction,
  autoUpdateSummary: true
});

console.log(result.response);
```

### getGroupSummary(groupId)

Get current group statistics and summary.

```javascript
const info = await getGroupSummary('my-group');
// Returns: { summary, messageCount, participants, lastUpdated }
```

### clearGroupChat(groupId)

Clear all messages and reset summary.

```javascript
await clearGroupChat('my-group');
```

---

## Technical Details

### Atomic File Operations

Like the main system, uses temp file + rename for data safety:

```javascript
// Write to temp file
await fs.writeFile(chatFile + '.tmp', data, 'utf-8');

// Atomic rename
await fs.rename(chatFile + '.tmp', chatFile);
```

### Memory Efficiency

- Max 50 messages in memory (window slides)
- Summary limited to 2000 chars
- Old messages captured in summary before removal
- Per-group isolation prevents data mixing

### Participant Tracking

Uses `Set` for efficient participant management:

```javascript
chatData.participants = new Set(['Alice', 'Bob', 'Charlie']);
chatData.participants.add('Dave'); // O(1) operation
```

Serialized to array for JSON storage.

---

## Use Cases

### 1. Project Discussion Groups

Track all team conversations, maintain summary of decisions and action items.

```
Team: Discussing feature implementation
Bot: Tracks all messages, provides summary on request
Bot: Can answer questions with full context
```

### 2. Support Groups

Monitor all support requests, provide context-aware assistance.

```
User1: Having issue with deployment
User2: Me too!
Bot: [Sees both users have same issue]
Bot: Provides solution considering both contexts
```

### 3. Learning Communities

Track educational discussions, maintain topic summaries.

```
Students: Discussing React hooks
Bot: Tracks all questions and explanations
Bot: Provides summary of key concepts discussed
```

---

## Testing

Test file included in codebase demonstrates:
- Message tracking from multiple users
- Summary generation
- Bot response with context
- Participant management

Run test:
```bash
node -e "$(cat test-script-here)"
```

---

## Future Enhancements

### Potential Improvements

1. **Message Search**
   - Search through message history
   - Find specific topics or users
   - Timeline visualization

2. **Analytics**
   - Most active participants
   - Topic clustering
   - Sentiment analysis
   - Activity heatmaps

3. **Smart Summarization**
   - Different summary types (technical, casual)
   - Custom summary triggers
   - Export summaries

4. **Advanced Context**
   - Thread tracking
   - Reply chains
   - Media content awareness
   - Link extraction

---

## Troubleshooting

### Bot not tracking messages

Check that messages are being added:
```javascript
console.log('Tracking message:', text);
await addMessage(groupId, ...);
```

### Summary not updating

Ensure `autoUpdateSummary: true`:
```javascript
await generateResponse(groupId, message, {
  autoUpdateSummary: true  // <-- Must be true
});
```

### Group ID issues

Verify group ID format:
```javascript
const groupId = `tg_${msg.chat.id}`;
console.log('Group ID:', groupId);
```

---

## Conclusion

The Group Chat Bot provides a streamlined, efficient solution for multi-user conversations. By tracking all messages and maintaining a running summary, it offers superior context awareness for group scenarios while remaining fast and cost-effective.

**Key Advantages:**
- ✅ Full conversation tracking
- ✅ Always up-to-date summary
- ✅ Simpler than full orchestrator
- ✅ Faster response times
- ✅ Better for groups
- ✅ Lower API costs

**When to Use:**
- Group chats with multiple participants
- Need full conversation context
- Want fast, simple responses
- Don't need complex task planning
- Multi-user environments
