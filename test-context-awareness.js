/**
 * Test: Context Awareness and Temporal Understanding
 * 
 * Tests that the agent properly considers:
 * - Previous interactions
 * - Timestamps and temporal context
 * - Conversation continuity
 */

import { orchestrateSimple } from './lib/agentOrchestrator.js';
import { addInteraction, clearMemory } from './lib/memorySystem.js';
import { setTimeout as sleep } from 'timers/promises';

async function testContextAwareness() {
  console.log('═══ Test: Context Awareness ═══\n');
  
  try {
    // Clear memory to start fresh
    await clearMemory();
    console.log('✓ Memory cleared\n');
    
    // First interaction: User mentions a file
    console.log('Test 1: First interaction (mention a file)');
    const result1 = await orchestrateSimple(
      "I'm working on a file called database.js in the lib folder",
      { skipLandscape: true }
    );
    console.log('Response 1:', result1.responses[0].response);
    console.log('✓ First interaction recorded\n');
    
    // Wait a moment
    await sleep(1000);
    
    // Second interaction: Ask about the same file without repeating context
    console.log('Test 2: Reference previous context (should remember database.js)');
    const result2 = await orchestrateSimple(
      "What did I just tell you about that file?",
      { skipLandscape: true }
    );
    const response2 = result2.responses[0].response;
    console.log('Response 2:', response2);
    
    // Check if response references the file
    const remembersContext = response2.toLowerCase().includes('database') || 
                            response2.toLowerCase().includes('lib');
    if (remembersContext) {
      console.log('✅ PASS: Agent remembered previous context');
    } else {
      console.log('❌ FAIL: Agent did not remember file mentioned');
    }
    console.log();
    
    // Third interaction: Ask about time
    console.log('Test 3: Temporal awareness (time elapsed)');
    const result3 = await orchestrateSimple(
      "How long has it been since I first mentioned that file?",
      { skipLandscape: true }
    );
    const response3 = result3.responses[0].response;
    console.log('Response 3:', response3);
    
    // Check if response shows temporal awareness
    const showsTemporalAwareness = response3.toLowerCase().includes('moment') ||
                                   response3.toLowerCase().includes('second') ||
                                   response3.toLowerCase().includes('just') ||
                                   response3.toLowerCase().includes('recently') ||
                                   response3.toLowerCase().includes('ago');
    if (showsTemporalAwareness) {
      console.log('✅ PASS: Agent shows temporal awareness');
    } else {
      console.log('⚠️  PARTIAL: Agent responded but temporal awareness unclear');
    }
    console.log();
    
    // Fourth interaction: Multi-turn continuity
    console.log('Test 4: Conversation continuity');
    const result4 = await orchestrateSimple(
      "Can you summarize our conversation so far?",
      { skipLandscape: true }
    );
    const response4 = result4.responses[0].response;
    console.log('Response 4:', response4);
    
    const showsContinuity = response4.toLowerCase().includes('database') ||
                           response4.toLowerCase().includes('file') ||
                           response4.toLowerCase().includes('mentioned');
    if (showsContinuity) {
      console.log('✅ PASS: Agent maintains conversation continuity');
    } else {
      console.log('❌ FAIL: Agent lost conversation context');
    }
    console.log();
    
    console.log('═══ Test Complete ═══');
    console.log('\nSummary:');
    console.log('- Context memory:', remembersContext ? '✅' : '❌');
    console.log('- Temporal awareness:', showsTemporalAwareness ? '✅' : '⚠️');
    console.log('- Conversation continuity:', showsContinuity ? '✅' : '❌');
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testContextAwareness();
