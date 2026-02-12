/**
 * Group Chat CLI - Simplified interface for group conversation bot
 * 
 * Uses groupChatManager instead of full orchestrator
 * Tracks ALL messages and maintains running summary
 */

import readline from 'readline';
import { generateResponse, getGroupSummary, clearGroupChat, addMessage } from './lib/groupChatManager.js';

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
 * Display help
 */
function displayHelp() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🤖 Group Chat CLI - Commands');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('/help         - Show this help');
  console.log('/summary      - Show current conversation summary');
  console.log('/clear        - Clear conversation history');
  console.log('/simulate     - Simulate another user speaking');
  console.log('/exit         - Exit chat');
  console.log('\nJust type your message to chat with the bot.');
  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Main chat loop
 */
async function chatLoop() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          🤖 Group Chat Bot - CLI Interface                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log('This bot is designed for group conversations.');
  console.log('Features:');
  console.log('  - Tracks ALL messages from all participants');
  console.log('  - Maintains running global summary');
  console.log('  - Uses baseAgent only (simpler, faster)');
  console.log('  - Updates summary after every interaction\n');
  console.log('Type /help for commands, or start chatting!\n');
  
  const groupId = 'cli-test-group';
  const currentUser = 'TestUser';
  
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
            await clearGroupChat(groupId);
            console.log('✅ Conversation cleared');
            continue;
            
          case '/summary':
            const summary = await getGroupSummary(groupId);
            console.log('\n═══════════════════════════════════════════════════════════');
            console.log('📊 CONVERSATION SUMMARY');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(summary.summary);
            console.log('\n📈 Statistics:');
            console.log(`Messages: ${summary.messageCount}`);
            console.log(`Participants: ${summary.participants.join(', ')}`);
            console.log(`Last Updated: ${summary.lastUpdated}`);
            console.log('═══════════════════════════════════════════════════════════');
            continue;
            
          case '/simulate':
            const simUser = await ask('Username: ');
            const simMessage = await ask('Message: ');
            
            await addMessage(groupId, {
              userId: 'sim_' + simUser,
              username: simUser,
              text: simMessage,
              isBot: false
            });
            
            console.log(`✅ Added message from ${simUser}`);
            continue;
            
          default:
            console.log('❌ Unknown command. Type /help for available commands.');
            continue;
        }
      }
      
      // Process message through group chat manager
      console.log('\n🤖 Processing...');
      
      const result = await generateResponse(
        groupId,
        {
          userId: 'user_' + currentUser,
          username: currentUser,
          text: trimmed,
          isBot: false
        },
        {
          askApproval,
          autoUpdateSummary: true
        }
      );
      
      // Display response
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('🤖 LumenBot:');
      console.log('═══════════════════════════════════════════════════════════');
      
      const response = result.response;
      
      switch (response.choice) {
        case 'response':
          console.log(response.response);
          break;
          
        case 'code':
          console.log(`\n💻 Code (${response.language}):`);
          console.log('─────────────────────────────────────────────────────────');
          console.log(response.code);
          console.log('─────────────────────────────────────────────────────────');
          console.log('Explanation:', response.codeExplanation);
          break;
          
        case 'terminalCommand':
          console.log('\n⚡ Terminal Command:', response.terminalCommand);
          console.log('Reasoning:', response.commandReasoning);
          
          if (response.terminalResult) {
            console.log('\n📊 Result:');
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
      
      console.log('\n💡 Tip: Type /summary to see conversation summary');
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.stack) console.error(error.stack);
    }
  }
}

// Start chat
chatLoop().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
