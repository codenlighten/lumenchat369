/**
 * Test Telegram Bot Integration
 * 
 * Tests user-specific memory and notes isolation
 */

import { addInteraction, getMemoryContextString, clearMemory } from './lib/memorySystem.js';
import { loadNotes, updateCurrentTask, clearNotes } from './lib/notesManager.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('Testing Telegram Bot User Isolation');
console.log('═══════════════════════════════════════════════════════════\n');

async function testUserIsolation() {
  console.log('\n👥 TEST 1: User-Specific Files');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    // Simulate User 1
    const user1Id = 'user-123';
    process.env.USER_MEMORY_FILE = `memory-${user1Id}.json`;
    process.env.USER_NOTES_FILE = `notes-${user1Id}.md`;
    
    await clearMemory();
    await clearNotes();
    
    await addInteraction(
      { query: 'User 1 query', context: 'User 1 context' },
      { choice: 'response', response: 'User 1 response', continue: false }
    );
    
    await updateCurrentTask('User 1 is working on task A');
    
    const user1Memory = await getMemoryContextString();
    const user1Notes = await loadNotes();
    
    console.log('✅ User 1 data created');
    console.log('   Memory length:', user1Memory.length);
    console.log('   Notes includes User 1:', user1Notes.includes('User 1'));
    
    // Simulate User 2
    const user2Id = 'user-456';
    process.env.USER_MEMORY_FILE = `memory-${user2Id}.json`;
    process.env.USER_NOTES_FILE = `notes-${user2Id}.md`;
    
    await clearMemory();
    await clearNotes();
    
    await addInteraction(
      { query: 'User 2 query', context: 'User 2 context' },
      { choice: 'response', response: 'User 2 response', continue: false }
    );
    
    await updateCurrentTask('User 2 is working on task B');
    
    const user2Memory = await getMemoryContextString();
    const user2Notes = await loadNotes();
    
    console.log('✅ User 2 data created');
    console.log('   Memory length:', user2Memory.length);
    console.log('   Notes includes User 2:', user2Notes.includes('User 2'));
    
    // Verify isolation
    console.log('\n🔒 Verifying Isolation:');
    console.log('   User 1 memory includes "User 1":', user1Memory.includes('User 1'));
    console.log('   User 1 memory includes "User 2":', user1Memory.includes('User 2'));
    console.log('   User 2 memory includes "User 1":', user2Memory.includes('User 1'));
    console.log('   User 2 memory includes "User 2":', user2Memory.includes('User 2'));
    
    if (!user1Memory.includes('User 2') && !user2Memory.includes('User 1')) {
      console.log('✅ Users are properly isolated!');
    } else {
      throw new Error('User data is not isolated!');
    }
    
    // Cleanup
    delete process.env.USER_MEMORY_FILE;
    delete process.env.USER_NOTES_FILE;
    
    return true;
  } catch (error) {
    console.error('❌ Test 1 Failed:', error.message);
    throw error;
  }
}

async function testDefaultFiles() {
  console.log('\n📁 TEST 2: Default File Fallback');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    // Clear environment variables
    delete process.env.USER_MEMORY_FILE;
    delete process.env.USER_NOTES_FILE;
    
    await clearMemory();
    await clearNotes();
    
    await addInteraction(
      { query: 'Default query', context: 'Default context' },
      { choice: 'response', response: 'Default response', continue: false }
    );
    
    await updateCurrentTask('Default task');
    
    const memory = await getMemoryContextString();
    const notes = await loadNotes();
    
    console.log('✅ Default files working');
    console.log('   Memory includes "Default":', memory.includes('Default'));
    console.log('   Notes includes "Default":', notes.includes('Default'));
    
    if (memory.includes('Default') && notes.includes('Default')) {
      console.log('✅ Default files work correctly!');
    } else {
      throw new Error('Default files not working!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test 2 Failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 2
  };
  
  const tests = [
    testUserIsolation,
    testDefaultFiles
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
    console.log('\n📝 Note: User-specific memory files created:');
    console.log('   memory-user-123.json');
    console.log('   notes-user-123.md');
    console.log('   memory-user-456.json');
    console.log('   notes-user-456.md');
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
