/**
 * Memory System - Rolling window memory with JSON persistence
 * 
 * Implements the strategy from MEMORY.md:
 * - Stores last 21 interactions (full JSON request + response)
 * - Maintains up to 3 summaries of previous 21-interaction blocks
 * - Persists to memory.json file
 * - Provides temporal awareness with timestamps
 */

import fs from 'fs/promises';
import path from 'path';
import { queryOpenAI } from './openaiWrapper.js';
import { summarizeAgentResponseSchema } from '../schemas/summarizeAgent.js';

const MAX_INTERACTIONS = 21;
const MAX_SUMMARIES = 3;

/**
 * Get memory file path (supports user-specific files)
 */
function getMemoryFile() {
  return process.env.USER_MEMORY_FILE || path.join(process.cwd(), 'memory.json');
}

/**
 * Load memory from disk
 */
async function loadMemory() {
  try {
    const data = await fs.readFile(getMemoryFile(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty structure
    return {
      interactions: [],
      summaries: [],
      count: 0
    };
  }
}

/**
 * Save memory to disk
 */
async function saveMemory(memory) {
  await fs.writeFile(getMemoryFile(), JSON.stringify(memory, null, 2), 'utf-8');
}

/**
 * Add an interaction to memory
 * @param {object} userRequest - Full JSON request from user
 * @param {object} aiResponse - Full JSON response from AI
 */
export async function addInteraction(userRequest, aiResponse) {
  const memory = await loadMemory();
  
  // Create interaction with timestamp for temporal awareness
  const interaction = {
    userRequest,
    aiResponse,
    ts: new Date().toISOString(),
    id: memory.count + 1
  };
  
  // Step 1: Add interaction to array
  memory.interactions.push(interaction);
  
  // Step 2: Update count
  memory.count += 1;
  
  // Step 3: Check if we've reached 22 interactions (trigger summarization)
  if (memory.interactions.length > MAX_INTERACTIONS) {
    await summarizeAndShift(memory);
  }
  
  // Save to disk
  await saveMemory(memory);
  
  return interaction;
}

/**
 * Summarize interactions 2-22, shift window, add summary
 */
async function summarizeAndShift(memory) {
  // Get interactions to summarize (index 1 to end = interactions 2-22)
  const toSummarize = memory.interactions.slice(1);
  
  try {
    // Build context for summarization
    const contextText = toSummarize.map((interaction, idx) => {
      const userQuery = interaction.userRequest?.query || JSON.stringify(interaction.userRequest);
      const aiText = interaction.aiResponse?.response || 
                     interaction.aiResponse?.code || 
                     interaction.aiResponse?.summary ||
                     JSON.stringify(interaction.aiResponse);
      
      return `[${interaction.ts}] Interaction ${interaction.id}:\nUser: ${userQuery}\nAI: ${aiText}`;
    }).join('\n\n');
    
    // Create summary using AI
    const summaryResult = await queryOpenAI(
      `Summarize these ${toSummarize.length} conversation interactions. Preserve key facts, decisions, goals, code created, commands executed, and evolving context:\n\n${contextText}`,
      { 
        schema: summarizeAgentResponseSchema,
        temperature: 0.1
      }
    );
    
    // Create summary entry
    const summary = {
      range: {
        startId: toSummarize[0].id,
        endId: toSummarize[toSummarize.length - 1].id,
        startTs: toSummarize[0].ts,
        endTs: toSummarize[toSummarize.length - 1].ts
      },
      text: summaryResult.summary,
      reasoning: summaryResult.reasoning,
      ts: new Date().toISOString()
    };
    
    // Add summary to summaries array
    memory.summaries.push(summary);
    
    // Keep only last 3 summaries
    if (memory.summaries.length > MAX_SUMMARIES) {
      memory.summaries.shift(); // Drop oldest
    }
    
  } catch (error) {
    console.error('Error creating memory summary:', error.message);
    // Continue with shift even if summary fails
  }
  
  // Shift the window: drop oldest interaction (keep 2-22, which becomes new 1-21)
  memory.interactions.shift();
}

/**
 * Get current memory for context
 * Returns formatted memory for adding to AI chat context
 */
export async function getCurrentMemory() {
  const memory = await loadMemory();
  
  return {
    interactions: memory.interactions,
    summaries: memory.summaries,
    stats: {
      totalCount: memory.count,
      currentInteractions: memory.interactions.length,
      summariesStored: memory.summaries.length
    }
  };
}

/**
 * Get formatted context string for AI prompts
 */
export async function getMemoryContextString() {
  const memory = await loadMemory();
  let context = '';
  
  // Add summaries (historical context)
  if (memory.summaries.length > 0) {
    context += '═══ CONVERSATION HISTORY (SUMMARIES) ═══\n\n';
    memory.summaries.forEach((summary, i) => {
      context += `Summary ${i + 1} (Interactions ${summary.range.startId}-${summary.range.endId}, ${summary.range.startTs} to ${summary.range.endTs}):\n`;
      context += `${summary.text}\n\n`;
    });
  }
  
  // Add recent interactions
  if (memory.interactions.length > 0) {
    context += '═══ RECENT INTERACTIONS (Last ${memory.interactions.length}) ═══\n\n';
    memory.interactions.forEach(interaction => {
      const userQuery = interaction.userRequest?.query || 'Request data';
      const aiChoice = interaction.aiResponse?.choice || 'response';
      const aiContent = interaction.aiResponse?.response || 
                       interaction.aiResponse?.code || 
                       interaction.aiResponse?.summary || 
                       'Response data';
      
      context += `[${interaction.ts}] Interaction ${interaction.id}:\n`;
      context += `User Query: ${userQuery}\n`;
      context += `AI Response Type: ${aiChoice}\n`;
      context += `AI Content: ${aiContent.substring(0, 200)}${aiContent.length > 200 ? '...' : ''}\n\n`;
    });
  }
  
  return context.trim();
}

/**
 * Clear all memory (reset)
 */
export async function clearMemory() {
  const emptyMemory = {
    interactions: [],
    summaries: [],
    count: 0
  };
  await saveMemory(emptyMemory);
  return emptyMemory;
}

/**
 * Get memory statistics
 */
export async function getMemoryStats() {
  const memory = await loadMemory();
  
  return {
    totalInteractionsProcessed: memory.count,
    currentInteractionsStored: memory.interactions.length,
    summariesStored: memory.summaries.length,
    maxInteractions: MAX_INTERACTIONS,
    maxSummaries: MAX_SUMMARIES,
    oldestInteraction: memory.interactions[0]?.ts || null,
    newestInteraction: memory.interactions[memory.interactions.length - 1]?.ts || null,
    oldestSummaryCoverage: memory.summaries[0]?.range.startId || null,
    newestSummaryCoverage: memory.summaries[memory.summaries.length - 1]?.range.endId || null
  };
}

export default {
  addInteraction,
  getCurrentMemory,
  getMemoryContextString,
  clearMemory,
  getMemoryStats
};
