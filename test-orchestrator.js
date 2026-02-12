/**
 * Test Agent Orchestrator
 * 
 * Tests the full orchestration system with:
 * - Simple queries
 * - Complex queries with landscape/plan
 * - Terminal commands
 * - Continue loops
 */

import { orchestrate, orchestrateSimple } from './lib/agentOrchestrator.js';
import { clearMemory } from './lib/memorySystem.js';
import { clearNotes } from './lib/notesManager.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('Testing Agent Orchestrator');
console.log('═══════════════════════════════════════════════════════════\n');

/**
 * Mock approval function (auto-approve for testing)
 */
async function mockApproval(command, reasoning) {
  console.log('\n[TEST] Auto-approving command:', command);
  return true;
}

/**
 * Thinking callback
 */
function onThinking(iteration) {
  console.log(`\n🤔 [TEST] Thinking... (iteration ${iteration})`);
}

/**
 * Response callback
 */
async function onResponse(response, iteration) {
  console.log(`\n📤 [TEST] Response received (iteration ${iteration})`);
  console.log('   Type:', response.choice);
  
  if (response.response) {
    console.log('   Response:', response.response.substring(0, 100));
  }
  if (response.code) {
    console.log('   Code language:', response.language);
  }
  if (response.terminalCommand) {
    console.log('   Command:', response.terminalCommand);
  }
  if (response.continue) {
    console.log('   ⚡ Continue flag is TRUE');
  }
}

async function testSimpleQuery() {
  console.log('\n📝 TEST 1: Simple Query');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const result = await orchestrateSimple('What is 2+2?', {
      askApproval: mockApproval,
      onThinking,
      onResponse
    });
    
    console.log('\n✅ Test 1 Complete');
    console.log('   Iterations:', result.iterations);
    console.log('   Used landscape:', !!result.landscape);
    console.log('   Used plan:', !!result.plan);
    
    return result;
  } catch (error) {
    console.error('❌ Test 1 Failed:', error.message);
    throw error;
  }
}

async function testCodeGeneration() {
  console.log('\n💻 TEST 2: Code Generation');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const result = await orchestrateSimple('Create a hello world function in JavaScript', {
      askApproval: mockApproval,
      onThinking,
      onResponse
    });
    
    console.log('\n✅ Test 2 Complete');
    console.log('   Iterations:', result.iterations);
    console.log('   Final response type:', result.responses[result.responses.length - 1].choice);
    
    return result;
  } catch (error) {
    console.error('❌ Test 2 Failed:', error.message);
    throw error;
  }
}

async function testComplexQuery() {
  console.log('\n🎯 TEST 3: Complex Query (with Landscape & Plan)');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const result = await orchestrate(
      'First check if package.json exists, then list all JavaScript files in the project',
      {
        askApproval: mockApproval,
        onThinking,
        onResponse
      }
    );
    
    console.log('\n✅ Test 3 Complete');
    console.log('   Iterations:', result.iterations);
    console.log('   Used landscape:', !!result.landscape);
    console.log('   Used plan:', !!result.plan);
    
    if (result.landscape) {
      console.log('   Priority:', result.landscape.priority);
      console.log('   Intent:', result.landscape.overallIntent);
    }
    
    if (result.plan) {
      console.log('   Plan steps:', result.plan.steps.length);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test 3 Failed:', error.message);
    throw error;
  }
}

async function testTerminalCommand() {
  console.log('\n⚡ TEST 4: Terminal Command Execution');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const result = await orchestrateSimple('Show me the current date and time', {
      askApproval: mockApproval,
      onThinking,
      onResponse
    });
    
    console.log('\n✅ Test 4 Complete');
    console.log('   Iterations:', result.iterations);
    
    const lastResponse = result.responses[result.responses.length - 1];
    if (lastResponse.terminalResult) {
      console.log('   Command executed:', lastResponse.terminalResult.executed);
      console.log('   Exit code:', lastResponse.terminalResult.exitCode);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test 4 Failed:', error.message);
    throw error;
  }
}

async function testMemoryIntegration() {
  console.log('\n💾 TEST 5: Memory Integration');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    // First query
    await orchestrateSimple('My favorite color is blue', {
      askApproval: mockApproval,
      onThinking,
      onResponse
    });
    
    // Second query that should reference memory
    const result = await orchestrateSimple('What is my favorite color?', {
      askApproval: mockApproval,
      onThinking,
      onResponse
    });
    
    console.log('\n✅ Test 5 Complete');
    console.log('   Should remember favorite color from previous interaction');
    
    return result;
  } catch (error) {
    console.error('❌ Test 5 Failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 5
  };
  
  // Clear memory and notes before testing
  console.log('🧹 Clearing memory and notes...');
  await clearMemory();
  await clearNotes();
  console.log('✅ Clean state\n');
  
  const tests = [
    testSimpleQuery,
    testCodeGeneration,
    testComplexQuery,
    testTerminalCommand,
    testMemoryIntegration
  ];
  
  for (const test of tests) {
    try {
      await test();
      results.passed++;
    } catch (error) {
      results.failed++;
      console.error('\n⚠️  Test encountered an error:', error.message);
      console.error(error.stack);
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed successfully!');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
  
  return results;
}

// Run tests
runAllTests()
  .then((results) => {
    process.exit(results.failed === 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Fatal error running tests:', error);
    process.exit(1);
  });
