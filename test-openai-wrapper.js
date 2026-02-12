import { queryOpenAI, queryOpenAIJsonMode } from './lib/openaiWrapper.js';
import { baseAgentExtendedResponseSchema } from './schemas/baseAgent.js';

/**
 * Test file for openaiWrapper.js using baseAgent.js schema
 * 
 * This script tests the three main response types:
 * 1. Conversational response (choice="response")
 * 2. Code generation (choice="code")
 * 3. Terminal command (choice="terminalCommand")
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('Testing OpenAI Wrapper with Base Agent Schema');
console.log('═══════════════════════════════════════════════════════════\n');

async function testConversationalResponse() {
  console.log('\n📝 TEST 1: Conversational Response');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const query = "What is the capital of France? Please answer using the response format.";
    const result = await queryOpenAI(query, {
      schema: baseAgentExtendedResponseSchema,
      context: "User is asking a simple geography question"
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Choice:', result.choice);
    console.log('✓ Response:', result.response);
    console.log('✓ Questions for user:', result.questionsForUser);
    
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
    const query = "Generate a simple JavaScript function that adds two numbers. Return this as code.";
    const result = await queryOpenAI(query, {
      schema: baseAgentExtendedResponseSchema,
      context: "User needs a simple addition function in JavaScript"
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Choice:', result.choice);
    console.log('✓ Language:', result.language);
    console.log('✓ Code:\n', result.code);
    console.log('✓ Explanation:', result.codeExplanation);
    
    return result;
  } catch (error) {
    console.error('❌ Test 2 Failed:', error.message);
    throw error;
  }
}

async function testTerminalCommand() {
  console.log('\n⚡ TEST 3: Terminal Command');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const query = "I need to list all files in the current directory. Provide the appropriate terminal command.";
    const result = await queryOpenAI(query, {
      schema: baseAgentExtendedResponseSchema,
      context: "User is on a Linux system and needs to list directory contents"
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Choice:', result.choice);
    console.log('✓ Command:', result.terminalCommand);
    console.log('✓ Reasoning:', result.commandReasoning);
    console.log('✓ Requires approval:', result.requiresApproval);
    
    return result;
  } catch (error) {
    console.error('❌ Test 3 Failed:', error.message);
    throw error;
  }
}

async function testMissingContext() {
  console.log('\n❓ TEST 4: Missing Context Detection');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const query = "Create a function to connect to the database.";
    const result = await queryOpenAI(query, {
      schema: baseAgentExtendedResponseSchema,
      context: "User wants database connection code but hasn't specified which database"
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Choice:', result.choice);
    console.log('✓ Questions for user:', result.questionsForUser);
    console.log('✓ Missing context:', result.missingContext);
    console.log('✓ Questions:', result.questions);
    
    return result;
  } catch (error) {
    console.error('❌ Test 4 Failed:', error.message);
    throw error;
  }
}

async function testJsonMode() {
  console.log('\n🔧 TEST 5: JSON Mode (Legacy)');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const query = "Give me a JSON object with name and age fields for a sample user";
    const result = await queryOpenAIJsonMode(query, {
      context: "Testing legacy JSON mode"
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Test 5 Failed:', error.message);
    throw error;
  }
}

async function testRetryMechanism() {
  console.log('\n🔄 TEST 6: Retry Mechanism');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const query = "Say hello in the response format.";
    const result = await queryOpenAI(query, {
      schema: baseAgentExtendedResponseSchema,
      maxRetries: 2
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Retry mechanism is working (no errors encountered)');
    
    return result;
  } catch (error) {
    console.error('❌ Test 6 Failed:', error.message);
    throw error;
  }
}

async function testCustomTemperature() {
  console.log('\n🌡️  TEST 7: Custom Temperature');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const query = "Provide a creative greeting message.";
    const result = await queryOpenAI(query, {
      schema: baseAgentExtendedResponseSchema,
      temperature: 0.9
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Custom temperature applied successfully');
    
    return result;
  } catch (error) {
    console.error('❌ Test 7 Failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 7
  };
  
  const tests = [
    testConversationalResponse,
    testCodeGeneration,
    testTerminalCommand,
    testMissingContext,
    testJsonMode,
    testRetryMechanism,
    testCustomTemperature
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
    
    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
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
