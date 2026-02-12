/**
 * Agent Orchestrator - Coordinates multiple agents working together
 * 
 * Features:
 * - Sequential agent pipelines
 * - Parallel agent execution
 * - Shared memory context
 * - Result synthesis
 * - Error recovery
 */

import { processRequest as baseAgent } from '../baseAgent.js';
import { generateTerminalCommand } from '../terminalAgent.js';
import { createTask as universalAgent } from '../universalAgent.js';
import { generateSchema } from '../generateSchema.js';
import { executeAgentCommand } from './terminalExecutor.js';
import { MemoryManager } from './memoryManager.js';

export class AgentOrchestrator {
  constructor(options = {}) {
    this.memory = options.memory || new MemoryManager();
    this.agents = {
      base: baseAgent,
      terminal: generateTerminalCommand,
      universal: universalAgent,
      schema: generateSchema
    };
    this.envContext = options.envContext || {};
    this.config = {
      autoExecuteCommands: options.autoExecuteCommands || false,
      autoApprove: options.autoApprove || false,
      verbose: options.verbose !== false // Default true
    };
  }

  /**
   * Process a user request through the orchestrator
   * The base agent decides what to do, and orchestrator coordinates execution
   */
  async processRequest(userRequest, options = {}) {
    const startTime = Date.now();
    
    // Add user request to memory
    await this.memory.addInteraction({
      role: 'user',
      text: userRequest
    });

    try {
      // Get memory context
      const memoryContext = this.memory.getContextString();

      // Base agent decides how to handle the request
      if (this.config.verbose) {
        console.log('🧠 Consulting base agent...\n');
      }

      const decision = await this.agents.base(userRequest, {
        conversationHistory: memoryContext,
        environment: this.envContext
      });

      // Handle based on agent decision
      let result;
      
      if (decision.choice === 'response') {
        result = await this._handleResponse(decision);
      } else if (decision.choice === 'code') {
        result = await this._handleCode(decision);
      } else if (decision.choice === 'terminalCommand') {
        result = await this._handleTerminalCommand(decision, options);
      }

      // Add agent response to memory
      await this.memory.addInteraction({
        role: 'agent',
        agentType: 'orchestrator',
        text: JSON.stringify(result),
        metadata: { choice: decision.choice, executionTimeMs: Date.now() - startTime }
      });

      return {
        ...result,
        executionTimeMs: Date.now() - startTime,
        memoryStats: this.memory.getStats()
      };

    } catch (error) {
      console.error('❌ Orchestrator error:', error.message);
      
      // Add error to memory
      await this.memory.addInteraction({
        role: 'system',
        text: `Error: ${error.message}`,
        metadata: { error: true }
      });

      throw error;
    }
  }

  /**
   * Execute a multi-agent pipeline
   * @param {string[]} agentNames - Array of agent names to execute in sequence
   * @param {string} initialRequest - Starting request
   */
  async pipeline(agentNames, initialRequest) {
    if (this.config.verbose) {
      console.log(`🔄 Starting pipeline: ${agentNames.join(' → ')}\n`);
    }

    let currentInput = initialRequest;
    const results = [];

    for (const agentName of agentNames) {
      if (this.config.verbose) {
        console.log(`📍 Agent: ${agentName}`);
      }

      const agent = this.agents[agentName];
      if (!agent) {
        throw new Error(`Unknown agent: ${agentName}`);
      }

      const memoryContext = this.memory.getContextString();
      const result = await agent(currentInput, { conversationHistory: memoryContext });
      
      results.push({
        agent: agentName,
        input: currentInput,
        output: result
      });

      // Add to memory
      await this.memory.addInteraction({
        role: 'agent',
        agentType: agentName,
        text: JSON.stringify(result)
      });

      // Prepare input for next agent
      currentInput = this._extractOutputForNextAgent(result);
    }

    return results;
  }

  /**
   * Execute multiple agents in parallel
   * @param {string[]} agentNames - Array of agent names
   * @param {string} request - Request for all agents
   */
  async parallel(agentNames, request) {
    if (this.config.verbose) {
      console.log(`⚡ Executing ${agentNames.length} agents in parallel\n`);
    }

    const memoryContext = this.memory.getContextString();
    
    const promises = agentNames.map(agentName => {
      const agent = this.agents[agentName];
      if (!agent) {
        throw new Error(`Unknown agent: ${agentName}`);
      }
      return agent(request, { conversationHistory: memoryContext })
        .then(result => ({ agent: agentName, result }));
    });

    const results = await Promise.all(promises);

    // Add all results to memory
    for (const { agent, result } of results) {
      await this.memory.addInteraction({
        role: 'agent',
        agentType: agent,
        text: JSON.stringify(result)
      });
    }

    return results;
  }

  /**
   * Register a custom agent
   */
  registerAgent(name, agentFunction) {
    this.agents[name] = agentFunction;
  }

  /**
   * Get memory manager instance
   */
  getMemory() {
    return this.memory;
  }

  // Internal handlers

  async _handleResponse(decision) {
    if (this.config.verbose) {
      console.log('💬 Response mode\n');
    }
    return {
      type: 'response',
      content: decision.response,
      questions: decision.questions,
      missingContext: decision.missingContext,
      questionsForUser: decision.questionsForUser
    };
  }

  async _handleCode(decision) {
    if (this.config.verbose) {
      console.log(`💻 Code generation (${decision.language})\n`);
    }
    return {
      type: 'code',
      language: decision.language,
      code: decision.code,
      explanation: decision.codeExplanation
    };
  }

  async _handleTerminalCommand(decision, options) {
    if (this.config.verbose) {
      console.log(`⚡ Terminal command: ${decision.terminalCommand}\n`);
    }

    const result = {
      type: 'terminalCommand',
      command: decision.terminalCommand,
      reasoning: decision.commandReasoning,
      requiresApproval: decision.requiresApproval
    };

    // Execute if configured
    if (this.config.autoExecuteCommands || options.execute) {
      const execConfig = {
        autoApprove: this.config.autoApprove || options.autoApprove,
        dryRun: options.dryRun || false,
        cwd: this.envContext.cwd || process.cwd(),
        timeout: 30000
      };

      const execResult = await executeAgentCommand({
        command: decision.terminalCommand,
        reasoning: decision.commandReasoning,
        requiresApproval: decision.requiresApproval
      }, execConfig);

      result.execution = execResult;
    }

    return result;
  }

  _extractOutputForNextAgent(result) {
    // Extract meaningful output to pass to next agent
    if (typeof result === 'string') return result;
    if (result.response) return result.response;
    if (result.code) return result.code;
    if (result.command) return result.command;
    if (result.summary) return result.summary;
    return JSON.stringify(result);
  }
}

export default AgentOrchestrator;
