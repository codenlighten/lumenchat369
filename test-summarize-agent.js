import { queryOpenAI } from './lib/openaiWrapper.js';
import { summarizeAgentResponseSchema } from './schemas/summarizeAgent.js';

/**
 * Test file for openaiWrapper.js using summarizeAgent.js schema
 * 
 * Tests the ability to generate clear, detailed summaries with reasoning
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('Testing OpenAI Wrapper with Summarize Agent Schema');
console.log('═══════════════════════════════════════════════════════════\n');

async function testArticleSummary() {
  console.log('\n📰 TEST 1: Article Summary');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const article = `
    Artificial Intelligence (AI) has made significant strides in recent years, particularly in natural language processing.
    Large language models like GPT-4 have demonstrated remarkable abilities in understanding and generating human-like text.
    These models are trained on vast amounts of data and can perform tasks ranging from answering questions to writing code.
    However, they also face challenges such as hallucinations, bias, and high computational costs.
    Companies are now exploring ways to make these models more efficient and reliable for production use.
    `;
    
    const query = "Summarize the current state of AI and language models.";
    const result = await queryOpenAI(query, {
      schema: summarizeAgentResponseSchema,
      context: article
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Summary:', result.summary);
    console.log('✓ Reasoning:', result.reasoning);
    console.log('✓ Missing Context:', result.missingContext);
    
    return result;
  } catch (error) {
    console.error('❌ Test 1 Failed:', error.message);
    throw error;
  }
}

async function testCodeRepositorySummary() {
  console.log('\n💻 TEST 2: Code Repository Summary');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const repoInfo = `
    Repository: lumen-coder
    Files: openaiWrapper.js, orchestrator.js, memoryManager.js, terminalExecutor.js
    Purpose: AI-powered coding assistant that can generate code, execute terminal commands, and manage conversation context
    Key Features: OpenAI integration, schema-based responses, terminal execution, audit logging
    Technologies: Node.js, OpenAI API, JSON schemas
    `;
    
    const query = "Provide a summary of what this codebase does.";
    const result = await queryOpenAI(query, {
      schema: summarizeAgentResponseSchema,
      context: repoInfo
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Summary:', result.summary);
    console.log('✓ Reasoning:', result.reasoning);
    console.log('✓ Missing Context:', result.missingContext);
    
    return result;
  } catch (error) {
    console.error('❌ Test 2 Failed:', error.message);
    throw error;
  }
}

async function testMeetingNotesSummary() {
  console.log('\n📝 TEST 3: Meeting Notes Summary');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const meetingNotes = `
    Meeting Date: Feb 10, 2026
    Attendees: Greg, Sarah, Mike
    Topics:
    - Discussed Q1 roadmap for the project
    - Decided to prioritize bug fixes over new features
    - Sarah raised concerns about API performance
    - Mike suggested implementing caching layer
    - Action items: Greg to review database queries, Sarah to profile API endpoints
    - Next meeting scheduled for Feb 17
    `;
    
    const query = "Summarize the key points and action items from this meeting.";
    const result = await queryOpenAI(query, {
      schema: summarizeAgentResponseSchema,
      context: meetingNotes
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Summary:', result.summary);
    console.log('✓ Reasoning:', result.reasoning);
    console.log('✓ Missing Context:', result.missingContext);
    
    return result;
  } catch (error) {
    console.error('❌ Test 3 Failed:', error.message);
    throw error;
  }
}

async function testTechnicalDocumentSummary() {
  console.log('\n📚 TEST 4: Technical Documentation Summary');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const documentation = `
    JWT (JSON Web Tokens) are a compact, URL-safe means of representing claims between two parties.
    Structure: JWTs consist of three parts - Header, Payload, and Signature.
    The header contains metadata about the token type and signing algorithm.
    The payload contains the claims or data being transmitted.
    The signature is created by encoding the header and payload and signing it with a secret key.
    Benefits: Stateless authentication, scalability, cross-domain authentication.
    Security considerations: Use HTTPS, set expiration times, validate signatures, use strong secrets.
    `;
    
    const query = "Create an executive summary of JWT authentication.";
    const result = await queryOpenAI(query, {
      schema: summarizeAgentResponseSchema,
      context: documentation
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Summary:', result.summary);
    console.log('✓ Reasoning:', result.reasoning);
    console.log('✓ Missing Context:', result.missingContext);
    
    return result;
  } catch (error) {
    console.error('❌ Test 4 Failed:', error.message);
    throw error;
  }
}

async function testIncompleteInformation() {
  console.log('\n❓ TEST 5: Summary with Missing Information');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const incompleteInfo = `
    Project Status: In development
    Current Phase: Testing
    Team Size: Unknown
    Budget: Not specified
    Deadline: TBD
    `;
    
    const query = "Summarize the project status and timeline.";
    const result = await queryOpenAI(query, {
      schema: summarizeAgentResponseSchema,
      context: incompleteInfo
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Summary:', result.summary);
    console.log('✓ Reasoning:', result.reasoning);
    console.log('✓ Missing Context:', result.missingContext);
    
    return result;
  } catch (error) {
    console.error('❌ Test 5 Failed:', error.message);
    throw error;
  }
}

async function testResearchPaperSummary() {
  console.log('\n🔬 TEST 6: Research Paper Abstract Summary');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const abstract = `
    This study investigates the impact of microservices architecture on application scalability and maintainability.
    We conducted experiments with three different deployment patterns: monolithic, microservices, and serverless.
    Results show that microservices improved horizontal scalability by 300% but increased operational complexity.
    The trade-off between development velocity and operational overhead was significant.
    We recommend microservices for teams with strong DevOps capabilities and high scalability requirements.
    `;
    
    const query = "Summarize the research findings and recommendations.";
    const result = await queryOpenAI(query, {
      schema: summarizeAgentResponseSchema,
      context: abstract
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Summary:', result.summary);
    console.log('✓ Reasoning:', result.reasoning);
    console.log('✓ Missing Context:', result.missingContext);
    
    return result;
  } catch (error) {
    console.error('❌ Test 6 Failed:', error.message);
    throw error;
  }
}

async function testConversationSummary() {
  console.log('\n💬 TEST 7: Conversation Summary');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const conversation = `
    User: I need help setting up authentication in my app.
    Assistant: What type of authentication are you looking for?
    User: JWT-based authentication.
    Assistant: Are you using Express.js?
    User: Yes, with Node.js and MongoDB.
    Assistant: Great! I'll help you set up JWT authentication with Express, using jsonwebtoken library.
    User: Should I store the JWT in localStorage or cookies?
    Assistant: Cookies with httpOnly flag are more secure for web apps.
    `;
    
    const query = "Summarize this conversation about authentication setup.";
    const result = await queryOpenAI(query, {
      schema: summarizeAgentResponseSchema,
      context: conversation
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('✓ Summary:', result.summary);
    console.log('✓ Reasoning:', result.reasoning);
    console.log('✓ Missing Context:', result.missingContext);
    
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
    testArticleSummary,
    testCodeRepositorySummary,
    testMeetingNotesSummary,
    testTechnicalDocumentSummary,
    testIncompleteInformation,
    testResearchPaperSummary,
    testConversationSummary
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
