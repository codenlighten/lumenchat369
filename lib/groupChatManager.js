/**
 * Group Chat Manager - Simplified chat bot for group conversations
 * 
 * Designed for group chats (Telegram rooms) where the bot needs to:
 * - Track ALL messages from all participants
 * - Maintain running global summary
 * - Respond using baseAgent only
 * - Update summary after every interaction
 * 
 * Simpler than full orchestrator - no landscape, no plan steps, no notes
 */

import fs from 'fs/promises';
import path from 'path';
import { queryOpenAI } from './openaiWrapper.js';
import { baseAgentExtendedResponseSchema } from '../schemas/baseAgent.js';
import { executeCommand } from './terminalExecutor.js';

const MAX_MESSAGES_WINDOW = 50; // Keep last 50 messages in active window
const MAX_SUMMARY_LENGTH = 2000; // Max chars for global summary

/**
 * Get group chat file path (supports per-group files)
 */
function getGroupChatFile(groupId = 'default') {
  const filename = `groupchat-${groupId}.json`;
  return process.env.USER_GROUPCHAT_FILE || path.join(process.cwd(), filename);
}

/**
 * Load group chat data
 */
async function loadGroupChat(groupId) {
  try {
    const data = await fs.readFile(getGroupChatFile(groupId), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist, return empty structure
    return {
      groupId,
      globalSummary: 'New conversation started.',
      messages: [],
      totalMessages: 0,
      lastUpdated: new Date().toISOString(),
      participants: new Set()
    };
  }
}

/**
 * Save group chat data (atomic write)
 */
async function saveGroupChat(groupId, chatData) {
  const chatFile = getGroupChatFile(groupId);
  const tempFile = chatFile + '.tmp';
  
  try {
    // Convert Set to Array for JSON serialization
    const dataToSave = {
      ...chatData,
      participants: Array.from(chatData.participants)
    };
    
    // Write to temp file first
    await fs.writeFile(tempFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
    
    // Atomic rename
    await fs.rename(tempFile, chatFile);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempFile);
    } catch (unlinkError) {
      // Ignore
    }
    throw error;
  }
}

/**
 * Add message to group chat (from any participant)
 */
export async function addMessage(groupId, message) {
  const chatData = await loadGroupChat(groupId);
  
  // Restore Set from Array
  chatData.participants = new Set(chatData.participants || []);
  
  // Add message
  const messageEntry = {
    id: chatData.totalMessages + 1,
    timestamp: new Date().toISOString(),
    userId: message.userId,
    username: message.username,
    text: message.text,
    isBot: message.isBot || false
  };
  
  chatData.messages.push(messageEntry);
  chatData.totalMessages += 1;
  chatData.participants.add(message.username || message.userId);
  chatData.lastUpdated = messageEntry.timestamp;
  
  // Slide window if too many messages
  if (chatData.messages.length > MAX_MESSAGES_WINDOW) {
    chatData.messages.shift();
  }
  
  await saveGroupChat(groupId, chatData);
  return messageEntry;
}

/**
 * Update global summary after each interaction
 */
export async function updateGlobalSummary(groupId) {
  const chatData = await loadGroupChat(groupId);
  
  // Restore Set from Array
  chatData.participants = new Set(chatData.participants || []);
  
  // Build message history string
  const recentMessages = chatData.messages.slice(-20); // Last 20 messages
  const messageHistory = recentMessages.map(m => 
    `[${m.timestamp}] ${m.username}: ${m.text}`
  ).join('\n');
  
  // Generate updated summary
  const summaryPrompt = `Update the conversation summary based on recent messages.

CURRENT SUMMARY:
${chatData.globalSummary}

RECENT MESSAGES:
${messageHistory}

Provide an updated summary that:
1. Captures the main topics being discussed
2. Notes any decisions or action items
3. Tracks ongoing conversations
4. Mentions active participants
5. Highlights important information

Keep it concise (max ${MAX_SUMMARY_LENGTH} chars) but informative.`;

  try {
    // Use simpler response schema for summarization
    const summaryResponse = await queryOpenAI(summaryPrompt, {
      schema: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Updated conversation summary"
          }
        },
        required: ["summary"],
        additionalProperties: false
      },
      temperature: 0.5
    });
    
    // Update summary (truncate if needed)
    chatData.globalSummary = summaryResponse.summary.substring(0, MAX_SUMMARY_LENGTH);
    chatData.lastUpdated = new Date().toISOString();
    
    await saveGroupChat(groupId, chatData);
    
    return chatData.globalSummary;
  } catch (error) {
    console.error('Error updating summary:', error.message);
    // Return existing summary on error
    return chatData.globalSummary;
  }
}

/**
 * Build context string for bot response
 */
function buildContextString(chatData) {
  let context = '';
  
  // Global summary
  context += '═══ CONVERSATION SUMMARY ═══\n';
  context += `${chatData.globalSummary}\n\n`;
  
  // Participants
  const participantList = Array.from(chatData.participants).join(', ');
  context += `═══ PARTICIPANTS ═══\n`;
  context += `${participantList}\n\n`;
  
  // Recent messages (last 20)
  const recentMessages = chatData.messages.slice(-20);
  context += `═══ RECENT MESSAGES (Last ${recentMessages.length}) ═══\n`;
  recentMessages.forEach(m => {
    const speaker = m.isBot ? '🤖 ' + m.username : m.username;
    context += `[${m.timestamp.substring(11, 19)}] ${speaker}: ${m.text}\n`;
  });
  
  return context;
}

/**
 * Execute terminal command with approval
 */
async function handleTerminalCommand(response, askApproval) {
  if (response.requiresApproval && askApproval) {
    const approved = await askApproval(
      response.terminalCommand,
      response.commandReasoning
    );
    
    if (!approved) {
      return {
        executed: false,
        output: 'User declined to execute command',
        approved: false
      };
    }
  }
  
  const result = await executeCommand(response.terminalCommand);
  
  return {
    executed: true,
    output: result.output,
    exitCode: result.exitCode,
    error: result.error,
    approved: true
  };
}

/**
 * Generate bot response using baseAgent
 */
export async function generateResponse(groupId, userMessage, options = {}) {
  const {
    askApproval = null,
    autoUpdateSummary = true
  } = options;
  
  try {
    // Load chat data
    const chatData = await loadGroupChat(groupId);
    chatData.participants = new Set(chatData.participants || []);
    
    // Add user message
    await addMessage(groupId, userMessage);
    
    // Reload to get updated data
    const updatedChatData = await loadGroupChat(groupId);
    updatedChatData.participants = new Set(updatedChatData.participants || []);
    
    // Build context
    const contextString = buildContextString(updatedChatData);
    
    // Get bot response
    const botResponse = await queryOpenAI(userMessage.text, {
      schema: baseAgentExtendedResponseSchema,
      context: contextString
    });
    
    // Handle terminal commands
    if (botResponse.choice === 'terminalCommand') {
      const terminalResult = await handleTerminalCommand(botResponse, askApproval);
      botResponse.terminalResult = terminalResult;
    }
    
    // Add bot response to messages
    const responseText = botResponse.response || 
                        botResponse.code || 
                        botResponse.terminalCommand ||
                        'Response generated';
    
    await addMessage(groupId, {
      userId: 'bot',
      username: 'LumenBot',
      text: responseText,
      isBot: true
    });
    
    // Update global summary
    if (autoUpdateSummary) {
      await updateGlobalSummary(groupId);
    }
    
    return {
      success: true,
      response: botResponse,
      summary: updatedChatData.globalSummary
    };
    
  } catch (error) {
    console.error('Error generating response:', error.message);
    throw error;
  }
}

/**
 * Get current group chat summary
 */
export async function getGroupSummary(groupId) {
  const chatData = await loadGroupChat(groupId);
  return {
    summary: chatData.globalSummary,
    messageCount: chatData.totalMessages,
    participants: Array.from(chatData.participants || []),
    lastUpdated: chatData.lastUpdated
  };
}

/**
 * Clear group chat history
 */
export async function clearGroupChat(groupId) {
  const emptyChat = {
    groupId,
    globalSummary: 'Conversation cleared.',
    messages: [],
    totalMessages: 0,
    lastUpdated: new Date().toISOString(),
    participants: []
  };
  
  await saveGroupChat(groupId, emptyChat);
  return emptyChat;
}

export default {
  addMessage,
  updateGlobalSummary,
  generateResponse,
  getGroupSummary,
  clearGroupChat
};
