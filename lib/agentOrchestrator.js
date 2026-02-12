/**
 * Agent Orchestrator - Coordinates the multi-agent system
 * 
 * Flow:
 * 1. Landscape Agent (optional - for complex queries)
 * 2. Plan Steps Agent (optional - for high priority tasks)
 * 3. Base Agent iteration loop with continue support
 * 4. Memory tracking
 * 5. Notes management
 */

import { queryOpenAI } from './openaiWrapper.js';
import { baseAgentExtendedResponseSchema } from '../schemas/baseAgent.js';
import { landscapeAgentResponseSchema } from '../schemas/landscapeAgent.js';
import { planStepsAgentResponseSchema } from '../schemas/planStepsAgent.js';
import { addInteraction, getMemoryContextString } from './memorySystem.js';
import { loadNotes, updateCurrentTask, setPlan, addContext, addCompleted, addBlocker, completeStep } from './notesManager.js';
import { executeCommand } from './terminalExecutor.js';

const MAX_CONTINUE_ITERATIONS = 5;
const MAX_DENIAL_RETRIES = 2; // Prevent infinite decline loops

/**
 * Determine if query is complex enough to warrant landscape analysis
 */
function shouldUseLandscape(query) {
  const complexityIndicators = [
    /and then/i,
    /first.*then/i,
    /multiple/i,
    /several/i,
    /\d+\./,  // numbered list
    /step \d+/i,
    query.split(/[.!?]/).length > 3  // Multiple sentences
  ];
  
  return complexityIndicators.some(pattern => 
    typeof pattern === 'object' ? pattern.test(query) : pattern
  );
}

/**
 * Run landscape analysis
 */
async function runLandscapeAnalysis(query, contextInfo) {
  const landscapePrompt = `Analyze this user query to understand overall intent and approach:

User Query: ${query}

${contextInfo ? `Additional Context: ${contextInfo}` : ''}

Provide a meta-analysis of what the user wants to accomplish.`;

  const landscape = await queryOpenAI(landscapePrompt, {
    schema: landscapeAgentResponseSchema
  });
  
  return landscape;
}

/**
 * Create plan steps for complex tasks
 */
async function createPlanSteps(query, landscape, contextInfo) {
  const planPrompt = `Break down this task into clear, actionable steps:

User Request: ${query}

Overall Intent: ${landscape.overallIntent}
Suggested Approach: ${landscape.suggestedApproach}

${contextInfo ? `Additional Context: ${contextInfo}` : ''}

Create a detailed step-by-step plan.`;

  const plan = await queryOpenAI(planPrompt, {
    schema: planStepsAgentResponseSchema
  });
  
  return plan;
}

/**
 * Execute terminal command with optional approval
 */
async function handleTerminalCommand(response, askApproval) {
  if (response.requiresApproval) {
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
  
  // Execute the command
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
 * Main orchestration function
 */
export async function orchestrate(userQuery, options = {}) {
  const {
    userContext = null,
    askApproval = null,  // Function to ask user for approval
    onThinking = null,    // Callback when entering continue loop
    onResponse = null,    // Callback for each response
    skipLandscape = false
  } = options;
  
  const responses = [];
  let continueLoop = false;
  let iteration = 0;
  let landscape = null;
  let plan = null;
  let denialCount = 0;
  let lastDeniedCommand = null;
  
  try {
    // Load current notes and memory
    const notes = await loadNotes();
    const memoryContext = await getMemoryContextString();
    
    // Step 1: Landscape analysis (if complex)
    if (!skipLandscape && shouldUseLandscape(userQuery)) {
      landscape = await runLandscapeAnalysis(userQuery, userContext);
      
      // Step 2: Create plan if high priority
      if (landscape.priority === 'high' || landscape.priority === 'critical') {
        plan = await createPlanSteps(userQuery, landscape, userContext);
        
        // Update notes with task and plan
        await updateCurrentTask(`${landscape.overallIntent}\n\nPriority: ${landscape.priority}\nApproach: ${landscape.suggestedApproach}`);
        await setPlan(plan.steps);
        
        // Track missing context
        if (plan.missingContext && plan.missingContext.length > 0) {
          for (const missing of plan.missingContext) {
            await addBlocker(`Missing: ${missing}`);
          }
        }
      }
    }
    
    // Build initial context for base agent
    let agentContext = {
      memory: memoryContext,
      notes: notes,
      userContext: userContext,
      landscape: landscape,
      plan: plan,
      previousOutput: null
    };
    
    // Step 3: Base agent iteration loop
    do {
      iteration++;
      
      if (iteration > 1 && onThinking) {
        onThinking(iteration);
      }
      
      // Build context string for this iteration
      const contextString = buildContextString(agentContext);
      
      // Query base agent
      const response = await queryOpenAI(userQuery, {
        schema: baseAgentExtendedResponseSchema,
        context: contextString
      });
      
      responses.push(response);
      
      // Handle terminal commands
      if (response.choice === 'terminalCommand') {
        const terminalResult = await handleTerminalCommand(response, askApproval);
        response.terminalResult = terminalResult;
        
        // Add terminal output to context for next iteration
        agentContext.previousOutput = terminalResult.output;
        
        // Track in notes
        if (terminalResult.executed) {
          await addCompleted(`Executed: ${response.terminalCommand}`);
          
          // Try to match and complete a plan step
          if (plan && plan.steps) {
            await tryCompleteMatchingStep(plan.steps, response.terminalCommand, response.commandReasoning);
          }
          
          // Reset denial counter on success
          denialCount = 0;
          lastDeniedCommand = null;
        } else {
          await addBlocker(`Command declined: ${response.terminalCommand}`);
          
          // Track repeated denials
          if (lastDeniedCommand === response.terminalCommand) {
            denialCount++;
          } else {
            denialCount = 1;
            lastDeniedCommand = response.terminalCommand;
          }
          
          // Force exit if too many denials
          if (denialCount >= MAX_DENIAL_RETRIES) {
            await addBlocker(`Too many command denials - stopping iteration`);
            continueLoop = false;
            break;
          }
        }
      }
      
      // Handle code generation
      if (response.choice === 'code') {
        await addCompleted(`Generated ${response.language} code`);
        
        // Try to match and complete a plan step
        if (plan && plan.steps) {
          await tryCompleteMatchingStep(plan.steps, response.code, response.codeExplanation);
        }
      }
      
      // Track context additions
      if (response.missingContext && response.missingContext.length > 0) {
        for (const missing of response.missingContext) {
          await addBlocker(`Missing: ${missing}`);
        }
      }
      
      // Callback for response
      if (onResponse) {
        await onResponse(response, iteration);
      }
      
      // Save to memory
      await addInteraction(
        { query: userQuery, context: userContext },
        response
      );
      
      // Update context for next iteration
      agentContext.previousResponse = response;
      agentContext.iteration = iteration;
      
      // Check continue flag
      continueLoop = response.continue && iteration < MAX_CONTINUE_ITERATIONS;
      
    } while (continueLoop);
    
    return {
      success: true,
      responses,
      landscape,
      plan,
      iterations: iteration
    };
    
  } catch (error) {
    await addBlocker(`Error: ${error.message}`);
    throw error;
  }
}

/**
 * Build context string for agent
 */
function buildContextString(agentContext) {
  let context = '';
  
  // Memory context
  if (agentContext.memory) {
    context += `${agentContext.memory}\n\n`;
  }
  
  // Landscape analysis
  if (agentContext.landscape) {
    context += `═══ LANDSCAPE ANALYSIS ═══\n`;
    context += `Intent: ${agentContext.landscape.overallIntent}\n`;
    context += `Approach: ${agentContext.landscape.suggestedApproach}\n`;
    context += `Priority: ${agentContext.landscape.priority}\n\n`;
  }
  
  // Plan
  if (agentContext.plan) {
    context += `═══ PLAN ═══\n`;
    agentContext.plan.steps.forEach((step, idx) => {
      context += `${idx + 1}. ${step.stepDescription}\n`;
    });
    context += '\n';
  }
  
  // Notes
  if (agentContext.notes) {
    context += `═══ AGENT NOTES ═══\n${agentContext.notes}\n\n`;
  }
  
  // Previous response
  if (agentContext.previousResponse) {
    context += `═══ PREVIOUS RESPONSE ═══\n`;
    context += `Choice: ${agentContext.previousResponse.choice}\n`;
    if (agentContext.previousResponse.response) {
      context += `Response: ${agentContext.previousResponse.response}\n`;
    }
    context += '\n';
  }
  
  // Previous terminal output
  if (agentContext.previousOutput) {
    context += `═══ TERMINAL OUTPUT ═══\n${agentContext.previousOutput}\n\n`;
  }
  
  // User context
  if (agentContext.userContext) {
    context += `═══ USER CONTEXT ═══\n${agentContext.userContext}\n\n`;
  }
  
  // Iteration info
  if (agentContext.iteration) {
    context += `[Iteration ${agentContext.iteration}]\n\n`;
  }
  
  return context;
}

/**
 * Try to match and complete a plan step based on action taken
 */
async function tryCompleteMatchingStep(steps, actionContent, reasoning) {
  // Simple heuristic: look for keywords in step descriptions
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepText = step.stepDescription.toLowerCase();
    const actionText = (actionContent + ' ' + (reasoning || '')).toLowerCase();
    
    // Check for keyword matches
    const keywords = stepText.split(/\s+/).filter(w => w.length > 4);
    const matches = keywords.filter(kw => actionText.includes(kw));
    
    // If at least 2 keywords match, consider step completed
    if (matches.length >= 2) {
      await completeStep(i + 1);
      await addContext(`Auto-completed step ${i + 1}: ${step.stepDescription}`);
      break; // Only complete one step per action
    }
  }
}

/**
 * Simple helper to orchestrate without landscape/plan
 */
export async function orchestrateSimple(userQuery, options = {}) {
  return orchestrate(userQuery, { ...options, skipLandscape: true });
}
