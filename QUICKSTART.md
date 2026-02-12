# 🚀 Quick Start Guide

Get up and running with Agent Orchestrator in 5 minutes!

## Prerequisites

- Node.js 20+ installed
- OpenAI API key

## Installation

### 1. Clone or navigate to project
```bash
cd /home/greg/conversation-bot369
```

### 2. Install dependencies (if not already done)
```bash
npm install
```

### 3. Create .env file
```bash
cat > .env << 'EOF'
OPENAI_API_KEY=your-openai-key-here
OPENAI_MODEL=gpt-4o-2024-08-06
EOF
```

Replace `your-openai-key-here` with your actual OpenAI API key.

## Start Chatting!

### Option 1: CLI (Easiest)

```bash
node chat-cli.js
```

Commands:
- Type any message to chat
- `/help` - See commands
- `/simple` - Toggle simple mode
- `/clear` - Clear memory
- `/exit` - Exit

### Option 2: Telegram Bot

1. Get a bot token from @BotFather on Telegram
2. Add to `.env`:
   ```bash
   echo "TELEGRAM_BOT_TOKEN=your-bot-token" >> .env
   ```
3. Start bot:
   ```bash
   npm run telegram
   ```
4. Find your bot on Telegram and send `/start`

## Test Everything Works

Run the test suite:

```bash
# Quick test
node test-orchestrator.js

# All tests
node test-openai-wrapper.js
node test-summarize-agent.js  
node test-memory-system.js
node test-orchestrator.js
node test-telegram-integration.js
```

All should show: ✅ All tests passed successfully!

## Try These Examples

### 1. Simple Question
```
You: What is the capital of France?
Bot: The capital of France is Paris.
```

### 2. Generate Code
```
You: Create a hello world function in JavaScript
Bot: [Generates code with explanation]
```

### 3. Terminal Command
```
You: Show me the current directory
Bot: [Executes pwd command and shows result]
```

### 4. Complex Task
```
You: First check if package.json exists, then list all JS files
Bot: [Analyzes, plans, executes multiple steps]
```

### 5. With Memory
```
You: My favorite color is blue
Bot: Got it!

You: What's my favorite color?
Bot: Your favorite color is blue.
```

## Understanding the System

### Response Types

The agent can respond in 3 ways:

1. **Response** - Text answer
2. **Code** - Generated code with explanation
3. **Terminal Command** - Executes command (with approval)

### Continue Loop

When the agent sets `continue: true`, it will:
1. Show "🤔 Thinking..."
2. Process results
3. Continue with next action
4. Max 5 iterations

### Memory

- Stores last 21 interactions
- Older interactions are summarized
- Up to 3 summaries kept
- Check `memory.json` to see stored data

### Notes

- Agent's working scratch pad
- Tracks current task
- Records plan steps
- Notes context and blockers
- Check `notes.md` to see agent's notes

## File Structure

```
conversation-bot369/
├── chat-cli.js              ← CLI interface
├── telegram-bot.js          ← Telegram bot
├── lib/
│   ├── agentOrchestrator.js ← Main logic
│   ├── memorySystem.js      ← Memory
│   ├── notesManager.js      ← Notes
│   └── ...
├── schemas/                 ← Agent schemas
├── memory.json             ← Your conversations
├── notes.md                ← Agent's notes
└── .env                    ← Your config
```

## Common Issues

### "Cannot find module"
```bash
npm install
```

### "OPENAI_API_KEY not found"
Check your `.env` file has the key.

### "Unauthorized" (Telegram)
Check your `TELEGRAM_BOT_TOKEN` in `.env`.

### Tests failing
Make sure OpenAI API key is valid and has credits.

## What's Next?

1. ✅ **Chat with CLI** - Try different questions
2. ✅ **Test code generation** - Ask for code
3. ✅ **Try terminal commands** - Execute safe commands
4. ✅ **Test memory** - Have multi-turn conversation
5. 📱 **Setup Telegram bot** - See TELEGRAM_SETUP.md
6. 📚 **Read full docs** - See README.md

## Need Help?

- **README.md** - Complete documentation
- **TELEGRAM_SETUP.md** - Telegram bot setup
- **STATUS.md** - Current project status
- **SUMMARY.md** - Full system overview

## Tips

- Use `/simple` mode for faster responses
- Check `notes.md` to see what agent is thinking
- Review `audit.log` to see executed commands
- Test with simple queries first
- Agent improves with conversation context

---

**You're all set! Start chatting with your AI agent! 🎉**

```bash
node chat-cli.js
```
