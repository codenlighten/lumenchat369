/**
 * Telegram Group Bot - Group-optimized bot using groupChatManager
 * 
 * Designed for Telegram group chats:
 * - Tracks ALL messages from all group members
 * - Maintains running summary per group
 * - Only responds when mentioned or in DMs
 * - Updates summary continuously
 */

import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { generateResponse, getGroupSummary, addMessage } from './lib/groupChatManager.js';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  dotenv.config();
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Store per-group approval states
const pendingApprovals = new Map();

console.log('[dotenv@17.2.4] injecting env (9) from .env -- tip: 🔑 add access controls to secrets: https://dotenvx.com/ops');
console.log('🤖 Telegram Group Bot started successfully!');

/**
 * Get group identifier (use chatId as groupId)
 */
function getGroupId(msg) {
  return `tg_${msg.chat.id}`;
}

/**
 * Check if bot should respond (mentioned, DM, or looks like a command)
 */
async function shouldRespond(msg) {
  // Always respond in private chats
  if (msg.chat.type === 'private') {
    return true;
  }
  
  // In groups, respond when mentioned
  const botInfo = await bot.getMe();
  const botUsername = botInfo.username;
  const text = msg.text || '';
  
  // Explicit mentions
  if (text.includes(`@${botUsername}`) || 
      text.toLowerCase().includes('lumen') ||
      text.toLowerCase().startsWith('bot,') ||
      text.toLowerCase().startsWith('hey bot')) {
    return true;
  }
  
  // Also respond to shell commands (ssh, docker, git, etc.)
  // This helps in collaborative scenarios where another bot directs us
  const commandPatterns = [
    /^ssh\s+/i,
    /^docker\s+/i,
    /^git\s+/i,
    /^npm\s+/i,
    /^node\s+/i,
    /^pm2\s+/i,
    /^curl\s+/i,
    /^wget\s+/i,
    /^systemctl\s+/i,
    /^cat\s+/i,
    /^ls\s+/i,
    /^grep\s+/i,
    /^find\s+/i
  ];
  
  return commandPatterns.some(pattern => pattern.test(text));
}

/**
 * Ask for approval with inline keyboard
 */
async function askApproval(chatId, messageId, command, reasoning) {
  const approvalId = `${chatId}_${messageId}_${Date.now()}`;
  
  return new Promise((resolve) => {
    pendingApprovals.set(approvalId, resolve);
    
    bot.sendMessage(chatId, 
      `⚠️ *APPROVAL REQUIRED*\n\n` +
      `*Command:* \`${command}\`\n` +
      `*Reasoning:* ${reasoning}\n\n` +
      `Execute this command?`,
      {
        parse_mode: 'Markdown',
        reply_to_message_id: messageId,
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Approve', callback_data: `approve_${approvalId}` },
            { text: '❌ Decline', callback_data: `decline_${approvalId}` }
          ]]
        }
      }
    );
    
    // Auto-decline after 60 seconds
    setTimeout(() => {
      if (pendingApprovals.has(approvalId)) {
        pendingApprovals.delete(approvalId);
        resolve(false);
        bot.sendMessage(chatId, '⏱️ Command approval timed out (declined)');
      }
    }, 60000);
  });
}

/**
 * Handle callback queries (approval buttons)
 */
bot.on('callback_query', async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  if (data.startsWith('approve_') || data.startsWith('decline_')) {
    const approvalId = data.substring(data.indexOf('_') + 1);
    const resolver = pendingApprovals.get(approvalId);
    
    if (resolver) {
      const approved = data.startsWith('approve_');
      resolver(approved);
      pendingApprovals.delete(approvalId);
      
      // Update message
      await bot.editMessageText(
        query.message.text + `\n\n${approved ? '✅ APPROVED' : '❌ DECLINED'} by @${query.from.username}`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        }
      );
      
      // Answer callback
      await bot.answerCallbackQuery(query.id, {
        text: approved ? 'Command approved' : 'Command declined'
      });
    } else {
      await bot.answerCallbackQuery(query.id, {
        text: 'Approval already handled or expired'
      });
    }
  }
});

/**
 * Handle all messages
 */
bot.on('message', async (msg) => {
  try {
    // Ignore bot's own messages
    if (msg.from.is_bot) {
      return;
    }
    
    const groupId = getGroupId(msg);
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name || 'Anonymous';
    const text = msg.text || '';
    
    // Always track the message (even if bot doesn't respond)
    await addMessage(groupId, {
      userId: msg.from.id.toString(),
      username: username,
      text: text,
      isBot: false
    });
    
    // Check if bot should respond
    const respond = await shouldRespond(msg);
    
    if (!respond) {
      console.log(`[${groupId}] Message tracked but not responding: ${username}: ${text.substring(0, 50)}`);
      return;
    }
    
    console.log(`[${groupId}] Processing message from ${username}: ${text.substring(0, 50)}`);
    
    // Send "typing" indicator
    await bot.sendChatAction(chatId, 'typing');
    
    // Generate response
    const result = await generateResponse(
      groupId,
      {
        userId: msg.from.id.toString(),
        username: username,
        text: text,
        isBot: false
      },
      {
        askApproval: async (command, reasoning) => {
          return await askApproval(chatId, msg.message_id, command, reasoning);
        },
        autoUpdateSummary: true
      }
    );
    
    const response = result.response;
    
    // Format and send response
    let replyText = '';
    
    switch (response.choice) {
      case 'response':
        replyText = response.response;
        break;
        
      case 'code':
        replyText = `💻 *${response.language} Code:*\n\n\`\`\`${response.language}\n${response.code}\n\`\`\`\n\n${response.codeExplanation}`;
        break;
        
      case 'terminalCommand':
        if (response.terminalResult && response.terminalResult.executed) {
          const output = response.terminalResult.output.substring(0, 2000);
          replyText = `⚡ *Command:* \`${response.terminalCommand}\`\n\n*Output:*\n\`\`\`\n${output}\n\`\`\``;
          
          if (response.terminalResult.exitCode !== 0) {
            replyText += `\n⚠️ Exit code: ${response.terminalResult.exitCode}`;
          }
        } else {
          replyText = `Command declined: ${response.terminalCommand}`;
        }
        break;
    }
    
    // Add questions if any
    if (response.questionsForUser && response.questions.length > 0) {
      replyText += '\n\n❓ *Questions:*\n';
      response.questions.forEach((q, idx) => {
        replyText += `${idx + 1}. ${q}\n`;
      });
    }
    
    // Send response
    await bot.sendMessage(chatId, replyText, {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    });
    
  } catch (error) {
    console.error('Error handling message:', error.message);
    if (error.stack) console.error(error.stack);
    
    try {
      await bot.sendMessage(msg.chat.id, 
        `❌ Sorry, I encountered an error: ${error.message}`,
        { reply_to_message_id: msg.message_id }
      );
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
});

/**
 * Handle /summary command
 */
bot.onText(/\/summary/, async (msg) => {
  try {
    const groupId = getGroupId(msg);
    const summary = await getGroupSummary(groupId);
    
    const summaryText = `📊 *Conversation Summary*\n\n` +
      `${summary.summary}\n\n` +
      `📈 *Statistics:*\n` +
      `Messages: ${summary.messageCount}\n` +
      `Participants: ${summary.participants.join(', ')}\n` +
      `Last Updated: ${summary.lastUpdated}`;
    
    await bot.sendMessage(msg.chat.id, summaryText, {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    });
  } catch (error) {
    console.error('Error handling /summary:', error);
    await bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
  }
});

/**
 * Handle /start command
 */
bot.onText(/\/start/, async (msg) => {
  const welcomeText = `👋 Hello! I'm LumenBot, a group-aware AI assistant.\n\n` +
    `I track all messages in the group and maintain a running summary of conversations. ` +
    `I'll respond when you mention me (@${(await bot.getMe()).username}) or use keywords like "bot" or "lumen".\n\n` +
    `Commands:\n` +
    `/summary - View conversation summary\n` +
    `/help - Show help\n\n` +
    `Just chat naturally - I'm listening and learning!`;
  
  await bot.sendMessage(msg.chat.id, welcomeText);
});

/**
 * Handle /help command
 */
bot.onText(/\/help/, async (msg) => {
  const helpText = `🤖 *LumenBot Help*\n\n` +
    `I'm designed for group conversations. I track ALL messages and maintain context.\n\n` +
    `*How to interact:*\n` +
    `• Mention me: @${(await bot.getMe()).username}\n` +
    `• Use keywords: "bot", "lumen"\n` +
    `• Start with: "hey bot" or "bot,"\n\n` +
    `*Commands:*\n` +
    `/summary - View conversation summary\n` +
    `/help - Show this help\n\n` +
    `*Features:*\n` +
    `✓ Tracks all group messages\n` +
    `✓ Maintains running summary\n` +
    `✓ Can execute terminal commands\n` +
    `✓ Generates code\n` +
    `✓ Answers questions`;
  
  await bot.sendMessage(msg.chat.id, helpText, {
    parse_mode: 'Markdown'
  });
});

console.log('📡 Polling for messages...');
console.log('Bot username:', (await bot.getMe()).username);

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  bot.stopPolling();
  process.exit(0);
});
