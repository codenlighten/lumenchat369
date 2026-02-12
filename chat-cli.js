/**
 * CLI Chat Interface for Agent Orchestrator
 * 
 * Interactive command-line interface to test the agent system
 */

import readline from 'readline';
import { orchestrate, orchestrateSimple } from './lib/agentOrchestrator.js';
import { clearMemory } from './lib/memorySystem.js';
import { clearNotes } from './lib/notesManager.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

/**
 * Ask for approval to execute command
 */
async function askApproval(command, reasoning) {
  console.log('\n⚠️  APPROVAL REQUIRED');
  console.log('─────────────────────────────────────────────────────────');
  console.log('Command:', command);
  console.log('Reasoning:', reasoning);
  console.log('─────────────────────────────────────────────────────────');
  
  const answer = await ask('Execute this command? (y/n): ');
  return answer.toLowerCase().trim() === 'y';
}

/**
 * Show thinking indicator
 */
function onThinking(iteration) {
  console.log(`\n🤔 Thinking... (iteration ${iteration})`);
}

/**
 * Handle response display
 */
async function onResponse(response, iteration) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`📤 Response (iteration ${iteration})`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Type:', response.choice);
  
  switch (response.choice) {
    case 'response':
      console.log('\n💬 Response:');
      console.log(response.response);
      break;
      
    case 'code':
      console.log('\n💻 Code Generated:');
      console.log(`Language: ${response.language}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log(response.code);
      console.log('─────────────────────────────────────────────────────────');
      console.log('Explanation:', response.codeExplanation);
      break;
      
    case 'terminalCommand':
      console.log('\n⚡ Terminal Command:');
      console.log('Command:', response.terminalCommand);
      console.log('Reasoning:', response.commandReasoning);
      
      if (response.terminalResult) {
        console.log('\n📊 Execution Result:');
        console.log('Executed:', response.terminalResult.executed);
        if (response.terminalResult.executed) {
          console.log('Exit Code:', response.terminalResult.exitCode);
          console.log('Output:');
          console.log(response.terminalResult.output);
        } else {
          console.log(response.terminalResult.output);
        }
      }
      break;
  }
  
  // Show questions if any
  if (response.questionsForUser && response.questions.length > 0) {
    console.log('\n❓ Questions:');
    response.questions.forEach((q, idx) => {
      console.log(`${idx + 1}. ${q}`);
    });
  }
  
  // Show missing context
  if (response.missingContext && response.missingContext.length > 0) {
    console.log('\n⚠️  Missing Context:');
    response.missingContext.forEach(m => {
      console.log(`- ${m}`);
    });
  }
  
  // Show continue flag
  if (response.continue) {
    console.log('\n🔄 Agent will continue processing...');
  }
}

/**
 * Display help
 */
function displayHelp() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🤖 Agent Chat CLI - Commands');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('/help         - Show this help');
  console.log('/clear        - Clear memory and notes');
  console.log('/clearmemory  - Clear conversation memory only');
  console.log('/clearnotes   - Clear notes only');
  console.log('/simple       - Toggle simple mode (skip landscape/plan)');
  console.log('/exit         - Exit chat');
  console.log('\nJust type your message to chat with the agent.');
  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Main chat loop
 */
async function chatLoop() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║        🤖 Agent Orchestrator - CLI Chat Interface         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log('Type /help for commands, or just start chatting!');
  console.log('The agent has access to:');
  console.log('  - Conversation memory (memory.json)');
  console.log('  - Scratch pad notes (notes.md)');
  console.log('  - Terminal execution');
  console.log('  - Multi-iteration processing with continue flag\n');
  
  let simpleMode = false;
  
  while (true) {
    try {
      const input = await ask('\n📝 You: ');
      const trimmed = input.trim();
      
      if (!trimmed) continue;
      
      // Handle commands
      if (trimmed.startsWith('/')) {
        const cmd = trimmed.toLowerCase();
        
        switch (cmd) {
          case '/help':
            displayHelp();
            continue;
            
          case '/exit':
            console.log('\n👋 Goodbye!');
            rl.close();
            process.exit(0);
            
          case '/clear':
            await clearMemory();
            await clearNotes();
            console.log('✅ Memory and notes cleared');
            continue;
            
          case '/clearmemory':
            await clearMemory();
            console.log('✅ Memory cleared');
            continue;
            
          case '/clearnotes':
            await clearNotes();
            console.log('✅ Notes cleared');
            continue;
            
          case '/simple':
            simpleMode = !simpleMode;
            console.log(`✅ Simple mode ${simpleMode ? 'enabled' : 'disabled'}`);
            console.log(simpleMode 
              ? '   (Will skip landscape and plan steps)' 
              : '   (Will use landscape and plan for complex queries)');
            continue;
            
          default:
            console.log('❌ Unknown command. Type /help for available commands.');
            continue;
        }
      }
      
      // Process query through orchestrator
      console.log('\n🤖 Processing...');
      
      const orchestrateFunc = simpleMode ? orchestrateSimple : orchestrate;
      
      const result = await orchestrateFunc(trimmed, {
        askApproval,
        onThinking,
        onResponse
      });
      
      // Show summary
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('✅ Complete');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Iterations: ${result.iterations}`);
      
      if (result.landscape) {
        console.log(`Priority: ${result.landscape.priority}`);
        console.log(`Intent: ${result.landscape.overallIntent}`);
      }
      
      if (result.plan) {
        console.log(`Plan steps: ${result.plan.steps.length}`);
      }
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
    }
  }
}

// Start chat
chatLoop().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
