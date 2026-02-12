import { 
  addInteraction, 
  getCurrentMemory, 
  getMemoryContextString,
  getMemoryStats,
  clearMemory 
} from './lib/memorySystem.js';

/**
 * Test the memory system implementation
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('Testing Memory System');
console.log('═══════════════════════════════════════════════════════════\n');

async function testBasicInteractionStorage() {
  console.log('\n📝 TEST 1: Store Basic Interactions');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    // Clear memory first
    await clearMemory();
    
    // Add 5 interactions
    for (let i = 1; i <= 5; i++) {
      const userRequest = {
        query: `Test query ${i}`,
        context: `Test context ${i}`
      };
      
      const aiResponse = {
        choice: 'response',
        response: `Test response ${i}`,
        questionsForUser: false,
        questions: [],
        missingContext: [],
        code: '',
        language: '',
        codeExplanation: '',
        terminalCommand: '',
        commandReasoning: '',
        requiresApproval: false,
        continue: false
      };
      
      await addInteraction(userRequest, aiResponse);
    }
    
    const stats = await getMemoryStats();
    console.log('✅ Stats:', JSON.stringify(stats, null, 2));
    console.log('✓ Total interactions processed:', stats.totalInteractionsProcessed);
    console.log('✓ Current interactions stored:', stats.currentInteractionsStored);
    
    return stats;
  } catch (error) {
    console.error('❌ Test 1 Failed:', error.message);
    throw error;
  }
}

async function testMemoryRetrieval() {
  console.log('\n🔍 TEST 2: Retrieve Memory Context');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const memory = await getCurrentMemory();
    console.log('✅ Memory retrieved');
    console.log('✓ Interactions:', memory.interactions.length);
    console.log('✓ Summaries:', memory.summaries.length);
    console.log('✓ Stats:', JSON.stringify(memory.stats, null, 2));
    
    // Get formatted context
    const contextString = await getMemoryContextString();
    console.log('✓ Context string length:', contextString.length);
    console.log('✓ Context preview:', contextString.substring(0, 200) + '...');
    
    return memory;
  } catch (error) {
    console.error('❌ Test 2 Failed:', error.message);
    throw error;
  }
}

async function testWindowSliding() {
  console.log('\n🔄 TEST 3: Window Sliding and Summarization');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    // Clear and add exactly 22 interactions to trigger summarization
    await clearMemory();
    
    console.log('Adding 22 interactions to trigger first summary...');
    
    for (let i = 1; i <= 22; i++) {
      const userRequest = {
        query: `Query ${i}: Testing window sliding`,
        context: `Context for interaction ${i}`
      };
      
      const aiResponse = {
        choice: i % 3 === 0 ? 'code' : 'response',
        response: i % 3 === 0 ? '' : `Response to query ${i}`,
        code: i % 3 === 0 ? `function test${i}() { return ${i}; }` : '',
        language: i % 3 === 0 ? 'javascript' : '',
        codeExplanation: i % 3 === 0 ? `Test function ${i}` : '',
        questionsForUser: false,
        questions: [],
        missingContext: [],
        terminalCommand: '',
        commandReasoning: '',
        requiresApproval: false,
        continue: false
      };
      
      await addInteraction(userRequest, aiResponse);
      
      if (i === 22) {
        // Give it a moment to complete summarization
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const stats = await getMemoryStats();
    const memory = await getCurrentMemory();
    
    console.log('✅ After 22 interactions:');
    console.log('✓ Total processed:', stats.totalInteractionsProcessed);
    console.log('✓ Current stored:', stats.currentInteractionsStored);
    console.log('✓ Summaries created:', stats.summariesStored);
    console.log('✓ Oldest summary coverage:', stats.oldestSummaryCoverage);
    console.log('✓ Newest summary coverage:', stats.newestSummaryCoverage);
    
    if (memory.summaries.length > 0) {
      console.log('\n📄 First Summary:');
      console.log(memory.summaries[0].text.substring(0, 300) + '...');
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Test 3 Failed:', error.message);
    throw error;
  }
}

async function testMultipleSummaries() {
  console.log('\n📚 TEST 4: Multiple Summaries (3 max)');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    // Continue adding interactions to create more summaries
    console.log('Adding more interactions to create additional summaries...');
    
    for (let i = 23; i <= 65; i++) {
      const userRequest = {
        query: `Query ${i}: Building up to 3 summaries`,
        context: `Context ${i}`
      };
      
      const aiResponse = {
        choice: 'response',
        response: `Response ${i}`,
        questionsForUser: false,
        questions: [],
        missingContext: [],
        code: '',
        language: '',
        codeExplanation: '',
        terminalCommand: '',
        commandReasoning: '',
        requiresApproval: false,
        continue: false
      };
      
      await addInteraction(userRequest, aiResponse);
      
      // Give time for summarization at each 21 mark
      if (i === 43 || i === 64) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const stats = await getMemoryStats();
    const memory = await getCurrentMemory();
    
    console.log('✅ After 65 interactions:');
    console.log('✓ Total processed:', stats.totalInteractionsProcessed);
    console.log('✓ Current stored:', stats.currentInteractionsStored);
    console.log('✓ Summaries stored:', stats.summariesStored);
    
    console.log('\n📊 Summary Coverage:');
    memory.summaries.forEach((summary, i) => {
      console.log(`  Summary ${i + 1}: Interactions ${summary.range.startId}-${summary.range.endId}`);
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Test 4 Failed:', error.message);
    throw error;
  }
}

async function testContextFormatting() {
  console.log('\n📋 TEST 5: Context Formatting for AI');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const contextString = await getMemoryContextString();
    const memory = await getCurrentMemory();
    
    console.log('✅ Context formatted');
    console.log('✓ Total characters:', contextString.length);
    console.log('✓ Includes summaries:', contextString.includes('CONVERSATION HISTORY'));
    console.log('✓ Includes recent interactions:', contextString.includes('RECENT INTERACTIONS'));
    
    console.log('\n📄 Context Preview:');
    console.log(contextString.substring(0, 500) + '...\n');
    
    return { contextString, memory };
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
  
  const tests = [
    testBasicInteractionStorage,
    testMemoryRetrieval,
    testWindowSliding,
    testMultipleSummaries,
    testContextFormatting
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
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
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
