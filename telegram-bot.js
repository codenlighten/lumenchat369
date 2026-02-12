/**
 * Telegram Bot with Agent Orchestrator Integration
 * 
 * Features:
 * - Per-user memory isolation
 * - Interactive approval flow
 * - Command execution
 * - Continue loop support
 * - Landscape and plan steps for complex queries
 */

import TelegramBot from 'node-telegram-bot-api';
import { orchestrate, orchestrateSimple } from './lib/agentOrchestrator.js';
import { addInteraction, getMemoryContextString, clearMemory } from './lib/memorySystem.js';
import { loadNotes, clearNotes } from './lib/notesManager.js';
import fs from 'fs/promises';
import path from 'path';

// Get bot token from environment
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// User sessions - stores per-user state
const userSessions = new Map();

// Pending approvals - stores commands waiting for user approval
const pendingApprovals = new Map();

/**
 * Get or create user session
 */
function getUserSession(userId) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      userId,
      simpleMode: false,
      processing: false,
      lastActivity: Date.now()
    });
  }
  return userSessions.get(userId);
}

/**
 * Get user-specific file paths
 */
function getUserFiles(userId) {
  return {
    memory: path.join(process.cwd(), `memory-${userId}.json`),
    notes: path.join(process.cwd(), `notes-${userId}.md`)
  };
}

/**
 * Set user-specific file paths (temporary override for orchestrator)
 */
function setUserContext(userId) {
  const files = getUserFiles(userId);
  process.env.USER_MEMORY_FILE = files.memory;
  process.env.USER_NOTES_FILE = files.notes;
}

/**
 * Clear user-specific context
 */
function clearUserContext() {
  delete process.env.USER_MEMORY_FILE;
  delete process.env.USER_NOTES_FILE;
}

/**
 * Ask user for approval (returns a promise)
 */
async function askApproval(userId, chatId, command, reasoning) {
  const approvalId = `${userId}-${Date.now()}`;
  
  return new Promise((resolve) => {
    // Store pending approval
    pendingApprovals.set(approvalId, {
      command,
      reasoning,
      resolve,
      timestamp: Date.now()
    });
    
    // Send approval request with inline keyboard
    bot.sendMessage(chatId, 
      `⚠️ *Command Approval Required*\n\n` +
      `*Command:* \`${command}\`\n\n` +
      `*Reasoning:* ${reasoning}\n\n` +
      `Do you want to execute this command?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Approve', callback_data: `approve:${approvalId}` },
            { text: '❌ Deny', callback_data: `deny:${approvalId}` }
          ]]
        }
      }
    );
  });
}

/**
 * Format response for Telegram
 */
function formatResponse(response, iteration) {
  let text = '';
  
  if (iteration > 1) {
    text += `🔄 *Iteration ${iteration}*\n\n`;
  }
  
  switch (response.choice) {
    case 'response':
      text += response.response;
      break;
      
    case 'code':
      text += `💻 *${response.language} Code*\n\n`;
      text += `\`\`\`${response.language.toLowerCase()}\n${response.code}\n\`\`\`\n\n`;
      if (response.codeExplanation) {
        text += `📝 ${response.codeExplanation}`;
      }
      break;
      
    case 'terminalCommand':
      text += `⚡ *Terminal Command*\n\n`;
      text += `\`${response.terminalCommand}\`\n\n`;
      text += `💭 ${response.commandReasoning}\n\n`;
      
      if (response.terminalResult) {
        if (response.terminalResult.executed) {
          text += `✅ *Executed*\n`;
          text += `Exit Code: ${response.terminalResult.exitCode}\n\n`;
          if (response.terminalResult.output) {
            const output = response.terminalResult.output.substring(0, 2000);
            text += `*Output:*\n\`\`\`\n${output}\n\`\`\``;
          }
        } else {
          text += `❌ ${response.terminalResult.output}`;
        }
      }
      break;
  }
  
  // Add questions if any
  if (response.questionsForUser && response.questions.length > 0) {
    text += `\n\n❓ *Questions:*\n`;
    response.questions.forEach((q, idx) => {
      text += `${idx + 1}. ${q}\n`;
    });
  }
  
  // Add missing context
  if (response.missingContext && response.missingContext.length > 0) {
    text += `\n\n⚠️ *Missing Context:*\n`;
    response.missingContext.forEach(m => {
      text += `• ${m}\n`;
    });
  }
  
  return text;
}

/**
 * Handle /start command
 */
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  getUserSession(userId);
  
  await bot.sendMessage(chatId,
    `🤖 *Welcome to Agent Orchestrator Bot!*\n\n` +
    `I'm an AI assistant with:\n` +
    `• 💾 Conversation memory\n` +
    `• 📝 Task planning\n` +
    `• ⚡ Terminal execution\n` +
    `• 🔄 Multi-step processing\n\n` +
    `*Commands:*\n` +
    `/help - Show help\n` +
    `/simple - Toggle simple mode\n` +
    `/clear - Clear memory\n` +
    `/notes - View my notes\n` +
    `/memory - View memory stats\n` +
    `/status - Check bot status\n\n` +
    `Just send me a message to get started!`,
    { parse_mode: 'Markdown' }
  );
});

/**
 * Handle /help command
 */
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId,
    `🤖 *Agent Orchestrator Bot - Help*\n\n` +
    `*Commands:*\n` +
    `/start - Welcome message\n` +
    `/help - This help message\n` +
    `/simple - Toggle simple mode (skip landscape/plan)\n` +
    `/clear - Clear your conversation memory\n` +
    `/clearnotes - Clear your notes only\n` +
    `/notes - View my working notes\n` +
    `/memory - View memory statistics\n` +
    `/status - Check bot status\n\n` +
    `*How it works:*\n` +
    `1. Send me a question or task\n` +
    `2. I analyze and create a plan (if complex)\n` +
    `3. I execute or respond with details\n` +
    `4. I ask for approval on sensitive commands\n` +
    `5. I can continue processing if needed\n\n` +
    `*Features:*\n` +
    `• Remembers conversation context\n` +
    `• Generates code in any language\n` +
    `• Executes terminal commands (with approval)\n` +
    `• Breaks down complex tasks\n` +
    `• Tracks work in progress`,
    { parse_mode: 'Markdown' }
  );
});

/**
 * Handle /simple command
 */
bot.onText(/\/simple/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = getUserSession(userId);
  
  session.simpleMode = !session.simpleMode;
  
  await bot.sendMessage(chatId,
    session.simpleMode
      ? `✅ Simple mode *enabled*\nI'll skip landscape analysis and planning.`
      : `✅ Simple mode *disabled*\nI'll use landscape and planning for complex queries.`,
    { parse_mode: 'Markdown' }
  );
});

/**
 * Handle /clear command
 */
bot.onText(/\/clear/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  setUserContext(userId);
  
  try {
    await clearMemory();
    await clearNotes();
    await bot.sendMessage(chatId, `✅ Your memory and notes have been cleared.`);
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error clearing data: ${error.message}`);
  } finally {
    clearUserContext();
  }
});

/**
 * Handle /clearnotes command
 */
bot.onText(/\/clearnotes/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  setUserContext(userId);
  
  try {
    await clearNotes();
    await bot.sendMessage(chatId, `✅ Your notes have been cleared.`);
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error clearing notes: ${error.message}`);
  } finally {
    clearUserContext();
  }
});

/**
 * Handle /notes command
 */
bot.onText(/\/notes/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  setUserContext(userId);
  
  try {
    const notes = await loadNotes();
    const preview = notes.substring(0, 3000);
    await bot.sendMessage(chatId, 
      `📝 *My Working Notes:*\n\n\`\`\`\n${preview}\n\`\`\``,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error loading notes: ${error.message}`);
  } finally {
    clearUserContext();
  }
});

/**
 * Handle /memory command
 */
bot.onText(/\/memory/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  setUserContext(userId);
  
  try {
    const context = await getMemoryContextString();
    const lines = context.split('\n');
    const preview = lines.slice(0, 50).join('\n');
    
    await bot.sendMessage(chatId,
      `💾 *Memory Context:*\n\n\`\`\`\n${preview}\n...\`\`\``,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error loading memory: ${error.message}`);
  } finally {
    clearUserContext();
  }
});

/**
 * Handle /status command
 */
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = getUserSession(userId);
  
  await bot.sendMessage(chatId,
    `📊 *Bot Status*\n\n` +
    `*Your Session:*\n` +
    `Simple Mode: ${session.simpleMode ? 'Enabled' : 'Disabled'}\n` +
    `Processing: ${session.processing ? 'Yes' : 'No'}\n\n` +
    `*Active Users:* ${userSessions.size}\n` +
    `*Pending Approvals:* ${pendingApprovals.size}`,
    { parse_mode: 'Markdown' }
  );
});

/**
 * Handle callback queries (approval buttons)
 */
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  
  // Parse callback data
  const [action, approvalId] = data.split(':');
  
  if (!pendingApprovals.has(approvalId)) {
    await bot.answerCallbackQuery(query.id, { text: 'Approval expired or already processed' });
    return;
  }
  
  const approval = pendingApprovals.get(approvalId);
  pendingApprovals.delete(approvalId);
  
  // Resolve the promise
  const approved = action === 'approve';
  approval.resolve(approved);
  
  // Update message
  await bot.editMessageText(
    `${approved ? '✅ *Approved*' : '❌ *Denied*'}\n\n` +
    `Command: \`${approval.command}\`\n\n` +
    `${approved ? 'Executing...' : 'Command was not executed.'}`,
    {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'Markdown'
    }
  );
  
  await bot.answerCallbackQuery(query.id, { 
    text: approved ? 'Command approved' : 'Command denied' 
  });
});

/**
 * Handle text messages
 */
bot.on('message', async (msg) => {
  // Ignore commands (already handled)
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userText = msg.text;
  
  if (!userText) return;
  
  const session = getUserSession(userId);
  
  // Check if already processing
  if (session.processing) {
    await bot.sendMessage(chatId, '⏳ Please wait, I\'m still processing your previous request...');
    return;
  }
  
  session.processing = true;
  session.lastActivity = Date.now();
  
  // Set user context
  setUserContext(userId);
  
  try {
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, '🤖 Processing...');
    
    let iterationCount = 0;
    
    // Callbacks for orchestrator
    const callbacks = {
      askApproval: async (command, reasoning) => {
        return await askApproval(userId, chatId, command, reasoning);
      },
      
      onThinking: async (iteration) => {
        iterationCount = iteration;
        await bot.editMessageText(
          `🤔 Thinking... (iteration ${iteration})`,
          {
            chat_id: chatId,
            message_id: processingMsg.message_id
          }
        );
      },
      
      onResponse: async (response, iteration) => {
        // Format and send response
        const text = formatResponse(response, iteration);
        
        // Send as new message (Telegram limits message edits)
        await bot.sendMessage(chatId, text, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true 
        });
      }
    };
    
    // Execute orchestrator
    const orchestrateFunc = session.simpleMode ? orchestrateSimple : orchestrate;
    const result = await orchestrateFunc(userText, callbacks);
    
    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    // Send completion summary if multiple iterations
    if (result.iterations > 1) {
      await bot.sendMessage(chatId,
        `✅ *Complete*\n\n` +
        `Iterations: ${result.iterations}\n` +
        `${result.landscape ? `Priority: ${result.landscape.priority}\n` : ''}` +
        `${result.plan ? `Plan steps: ${result.plan.steps.length}\n` : ''}`,
        { parse_mode: 'Markdown' }
      );
    }
    
  } catch (error) {
    console.error('Error processing message:', error);
    await bot.sendMessage(chatId, 
      `❌ *Error*\n\n${error.message}`,
      { parse_mode: 'Markdown' }
    );
  } finally {
    session.processing = false;
    clearUserContext();
  }
});

/**
 * Error handling
 */
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

// Cleanup old sessions every hour
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [userId, session] of userSessions.entries()) {
    if (now - session.lastActivity > maxAge) {
      userSessions.delete(userId);
      console.log(`Cleaned up session for user ${userId}`);
    }
  }
  
  // Clean up old pending approvals
  for (const [approvalId, approval] of pendingApprovals.entries()) {
    if (now - approval.timestamp > 5 * 60 * 1000) { // 5 minutes
      approval.resolve(false);
      pendingApprovals.delete(approvalId);
      console.log(`Cleaned up expired approval ${approvalId}`);
    }
  }
}, 60 * 60 * 1000);

console.log('🤖 Telegram bot started successfully!');
console.log(`👥 Bot username: @${bot.options.username || 'unknown'}`);
console.log('📡 Polling for messages...');
