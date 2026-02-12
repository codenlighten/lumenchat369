# Telegram Bot Setup Guide

Complete guide to set up and run the Agent Orchestrator Telegram bot.

## Prerequisites

1. **Node.js 20+** installed
2. **OpenAI API Key** 
3. **Telegram Bot Token** from BotFather

## Step 1: Create Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the prompts:
   - Choose a name for your bot (e.g., "Agent Orchestrator")
   - Choose a username (must end in 'bot', e.g., "my_agent_orchestrator_bot")
4. BotFather will give you a **token** - save this!

Example token format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

## Step 2: Configure Environment

Edit your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o-2024-08-06

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

## Step 3: Install Dependencies

```bash
npm install
```

The required package `node-telegram-bot-api` is already in package.json.

## Step 4: Start the Bot

```bash
npm run telegram
```

Or directly:

```bash
node telegram-bot.js
```

You should see:

```
🤖 Telegram bot started successfully!
👥 Bot username: @your_bot_username
📡 Polling for messages...
```

## Step 5: Test Your Bot

1. Open Telegram
2. Search for your bot by username
3. Click **Start** or send `/start`
4. Try these commands:
   - `/help` - See all commands
   - `/simple` - Toggle simple mode
   - Send any message to chat with the agent

## Bot Commands

### User Commands

- `/start` - Welcome message and introduction
- `/help` - Show all available commands
- `/simple` - Toggle simple mode (skip landscape/plan)
- `/clear` - Clear your conversation memory
- `/clearnotes` - Clear your notes only
- `/notes` - View agent's working notes
- `/memory` - View your memory statistics
- `/status` - Check bot status

### Example Usage

**Simple Question:**
```
You: What is the capital of France?
Bot: The capital of France is Paris.
```

**Code Generation:**
```
You: Create a function to calculate fibonacci numbers in Python
Bot: [Generates Python code with explanation]
```

**Terminal Command (with approval):**
```
You: Show me all JavaScript files in this project
Bot: ⚠️ Command Approval Required
     Command: `find . -name '*.js'`
     Reasoning: To list all JavaScript files...
     [Approve] [Deny] buttons
```

**Complex Task with Planning:**
```
You: First check if package.json exists, then install dependencies, then start the server
Bot: [Landscape Analysis]
     Priority: high
     Intent: Setup and run project
     
     [Plan Steps]
     1. Check for package.json
     2. Install npm dependencies
     3. Start development server
     
     [Execution - Multiple iterations with continue loop]
```

## Features

### Per-User Memory Isolation

Each user gets their own memory and notes files:
- `memory-<user-id>.json` - Your conversation history
- `notes-<user-id>.md` - Agent's notes about your work

### Approval System

The bot will ask for approval on:
- Potentially dangerous commands
- Commands that modify files
- Commands that require user confirmation

Approval is handled via inline buttons - just click **✅ Approve** or **❌ Deny**.

### Continue Loop

The agent can chain multiple actions:
1. Analyze your request
2. Execute first action
3. If needed, continue with next action (shows "🤔 Thinking...")
4. Up to 5 iterations maximum
5. Shows completion summary

### Simple Mode

Toggle with `/simple` command:
- **Enabled**: Direct processing, faster responses
- **Disabled**: Uses landscape analysis and planning for complex queries

## Architecture

```
User Message
     ↓
Session Management (per user)
     ↓
Orchestrator (landscape + plan + base)
     ↓
Execution (code/response/terminal)
     ↓
Approval Flow (if needed)
     ↓
Continue Loop (if continue flag)
     ↓
Response to User
     ↓
Save to User's Memory & Notes
```

## Monitoring

### Check Bot Status

Send `/status` to see:
- Your session info (simple mode, processing state)
- Active user count
- Pending approval count

### View Memory

Send `/memory` to see:
- Recent conversation history
- Summaries of older conversations
- Interaction count

### View Notes

Send `/notes` to see:
- Current task agent is working on
- Plan steps (checked/unchecked)
- Context discovered
- Completed items
- Blockers

## Troubleshooting

### Bot Not Responding

1. Check if bot is running: `ps aux | grep telegram-bot`
2. Check for errors in console output
3. Verify `TELEGRAM_BOT_TOKEN` in `.env`
4. Ensure bot token is valid (test with BotFather)

### "Unauthorized" Error

- Token is invalid or expired
- Get a new token from BotFather

### API Rate Limits

If you get rate limit errors:
1. Wait a few minutes
2. Use `/simple` mode to reduce API calls
3. Consider implementing rate limiting per user

### Commands Not Executing

Check that:
1. Terminal executor has proper permissions
2. Commands aren't being blocked by safety checks
3. User approved the command (if approval required)

### Memory Not Persisting

1. Check file permissions in bot directory
2. Ensure disk space available
3. Check for user-specific memory files: `ls memory-*.json`

## Advanced Configuration

### Custom Commands

Edit `telegram-bot.js` to add custom commands:

```javascript
bot.onText(/\/mycommand/, async (msg) => {
  const chatId = msg.chat.id;
  // Your code here
});
```

### Adjust Continue Loop Limit

In `lib/agentOrchestrator.js`:

```javascript
const MAX_CONTINUE_ITERATIONS = 5; // Change this
```

### Change Memory Window Size

In `lib/memorySystem.js`:

```javascript
const MAX_INTERACTIONS = 21; // Interactions to keep
const MAX_SUMMARIES = 3;     // Summary blocks to keep
```

## Security Best Practices

1. **Never share your bot token** - It's like a password
2. **Review commands before approving** - Especially file operations
3. **Monitor audit logs** - Check `audit.log` for command history
4. **Use environment variables** - Never commit `.env` to git
5. **Limit bot permissions** - Don't run as root
6. **Regular backups** - Backup user memory files periodically

## Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start telegram-bot.js --name agent-bot

# View logs
pm2 logs agent-bot

# Restart bot
pm2 restart agent-bot

# Stop bot
pm2 stop agent-bot

# Auto-start on system reboot
pm2 startup
pm2 save
```

### Using systemd

Create `/etc/systemd/system/agent-bot.service`:

```ini
[Unit]
Description=Agent Orchestrator Telegram Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/conversation-bot369
ExecStart=/usr/bin/node telegram-bot.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable agent-bot
sudo systemctl start agent-bot
sudo systemctl status agent-bot
```

### Environment Variables in Production

Use a secrets manager or secure environment:
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets
- Encrypted .env files

## Monitoring & Analytics

### Log Important Events

The bot logs to console. Redirect to file:

```bash
node telegram-bot.js > bot.log 2>&1 &
```

### Track Usage

Monitor:
- Number of users per day
- Commands per user
- API call frequency
- Error rates
- Response times

Add logging in `telegram-bot.js` callbacks.

## Cost Management

### OpenAI API Costs

Approximate costs per interaction:
- Simple query: ~$0.01
- Code generation: ~$0.02
- Complex with landscape+plan: ~$0.03-0.05

With continue loop (5 iterations max): ~$0.15

### Reducing Costs

1. Use `/simple` mode when possible
2. Set lower max_tokens in openaiWrapper
3. Use gpt-4o-mini for less critical tasks
4. Implement per-user rate limiting
5. Cache common responses

## Support

For issues or questions:
1. Check `STATUS.md` for current status
2. Review test files for examples
3. Check `audit.log` for command history
4. Review console output for errors

## Next Steps

Once your bot is running:
1. ✅ Test with simple queries
2. ✅ Test code generation
3. ✅ Test terminal commands with approval
4. ✅ Test continue loop with complex tasks
5. ✅ Invite friends to test
6. 📊 Monitor usage and costs
7. 🚀 Deploy to production

---

**Happy chatting with your AI agent! 🤖**
