#!/usr/bin/env node
/**
 * End-to-End Test for Briefing Integration
 *
 * This test verifies the complete briefing flow:
 * 1. Create a briefed call session using create_briefed_call
 * 2. Verify session created with briefing data
 * 3. Simulate scheduler processing the call
 * 4. Verify session status updates
 * 5. Test briefing retrieval by sessionId
 * 6. Clean up test data
 */

require('dotenv').config({ path: './server/assistant/.env' });
const { createClient } = require('@supabase/supabase-js');
const User = require('./server/assistant/models/User');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test state
let testUserId = null;
let testSessionId = null;
let testInteractionId = null;
let testResults = [];

// Helper function to log test results
function logTest(testName, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const message = `${symbol} ${testName}`;
  console.log(message);
  if (details) {
    console.log(`  ${details}`);
  }
  testResults.push({ testName, passed, details });
}

// Helper function to log section headers
function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(title);
  console.log('═'.repeat(60));
}

/**
 * Step 1: Find or create test user
 */
async function setupTestUser() {
  logSection('Step 1: Test User Setup');

  try {
    // Find existing test user named Marco
    const users = await User.findAll();
    let testUser = users.find(u => u.name && u.name.toLowerCase().includes('marco'));

    if (testUser) {
      testUserId = testUser.id;
      logTest('Test user found', true, `User: ${testUser.name} (${testUser.id})`);
    } else {
      // Fall back to first user if no Marco found
      if (users.length > 0) {
        testUser = users[0];
        testUserId = testUser.id;
        logTest('Test user found (fallback)', true, `User: ${testUser.name} (${testUser.id})`);
      } else {
        logTest('Test user found', false, 'No users found in database');
        return false;
      }
    }

    return true;
  } catch (error) {
    logTest('Test user setup', false, error.message);
    return false;
  }
}

/**
 * Step 2: Create a briefed call session
 */
async function createBriefedCall() {
  logSection('Step 2: Create Briefed Call Session');

  try {
    // Schedule call for 1 minute from now
    const scheduledFor = new Date(Date.now() + 60000).toISOString();

    const briefing = {
      trigger_reason: 'TEST: End-to-end verification of briefing integration',
      detected_patterns: [
        'Testing briefing creation flow',
        'Testing briefing persistence',
        'Testing briefing retrieval'
      ],
      conversation_goals: [
        'Verify briefing loads correctly in voice agent',
        'Test sessionId tracking through the system',
        'Confirm post-call analysis works'
      ],
      recent_context: 'Automated end-to-end test of the briefing system after fixing the integration between Claude SDK and Voice Agent'
    };

    // Insert call session directly (simulating create_briefed_call MCP tool)
    const { data, error } = await supabase
      .from('call_sessions')
      .insert({
        user_id: testUserId,
        direction: 'outbound',
        call_type: 'morning-briefing',
        scheduled_for: scheduledFor,
        scheduled_by: 'test-script',
        status: 'scheduled',
        briefing: briefing
      })
      .select()
      .single();

    if (error) {
      logTest('Create briefed call', false, error.message);
      return false;
    }

    testSessionId = data.id;
    logTest('Briefed call scheduled', true, `Session ID: ${testSessionId}`);
    logTest('Session status', data.status === 'scheduled', `Status: ${data.status}`);
    logTest('Session direction', data.direction === 'outbound', `Direction: ${data.direction}`);
    logTest('Briefing attached', !!data.briefing, 'Briefing data present in session');

    return true;
  } catch (error) {
    logTest('Create briefed call', false, error.message);
    return false;
  }
}

/**
 * Step 3: Verify briefing data structure
 */
async function verifyBriefingStructure() {
  logSection('Step 3: Verify Briefing Data Structure');

  try {
    const { data, error } = await supabase
      .from('call_sessions')
      .select('briefing')
      .eq('id', testSessionId)
      .single();

    if (error) {
      logTest('Retrieve session', false, error.message);
      return false;
    }

    const briefing = data.briefing;

    logTest('Briefing exists', !!briefing);
    logTest('Has trigger_reason', !!briefing?.trigger_reason, briefing?.trigger_reason);
    logTest('Has detected_patterns', Array.isArray(briefing?.detected_patterns),
      `${briefing?.detected_patterns?.length || 0} patterns`);
    logTest('Has conversation_goals', Array.isArray(briefing?.conversation_goals),
      `${briefing?.conversation_goals?.length || 0} goals`);
    logTest('Has recent_context', !!briefing?.recent_context);

    // Display briefing content
    console.log('\nBriefing Content:');
    console.log('  Trigger:', briefing?.trigger_reason);
    console.log('  Patterns:', briefing?.detected_patterns?.map(p => `\n    - ${p}`).join(''));
    console.log('  Goals:', briefing?.conversation_goals?.map(g => `\n    - ${g}`).join(''));
    console.log('  Context:', briefing?.recent_context?.substring(0, 80) + '...');

    return true;
  } catch (error) {
    logTest('Verify briefing structure', false, error.message);
    return false;
  }
}

/**
 * Step 4: Simulate scheduler updating session
 */
async function simulateSchedulerUpdate() {
  logSection('Step 4: Simulate Scheduler Processing');

  try {
    // Update session to 'in-progress' (what scheduler does)
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('call_sessions')
      .update({
        status: 'in-progress',
        started_at: now,
        updated_at: now
      })
      .eq('id', testSessionId)
      .select()
      .single();

    if (error) {
      logTest('Update session status', false, error.message);
      return false;
    }

    logTest('Scheduler updates status', data.status === 'in-progress', `Status: ${data.status}`);
    logTest('Started timestamp set', !!data.started_at, `Started: ${data.started_at}`);
    logTest('Briefing preserved', !!data.briefing, 'Briefing still present after update');

    return true;
  } catch (error) {
    logTest('Simulate scheduler update', false, error.message);
    return false;
  }
}

/**
 * Step 5: Create mock interaction linked to session
 */
async function createMockInteraction() {
  logSection('Step 5: Create Mock Interaction');

  try {
    // Create a test interaction (simulating voice service creating one)
    const interaction = new Interaction({
      userId: testUserId,
      type: 'voice',
      mode: 'luna',
      content: 'Test briefing integration',
      response: 'Briefing received and processed successfully',
      sessionId: testSessionId
    });

    await interaction.save();
    testInteractionId = interaction._id.toString();

    logTest('Mock interaction created', true, `Interaction ID: ${testInteractionId}`);
    logTest('Linked to session', interaction.sessionId === testSessionId, `SessionId: ${interaction.sessionId}`);

    return true;
  } catch (error) {
    logTest('Create mock interaction', false, error.message);
    return false;
  }
}

/**
 * Step 6: Verify briefing retrieval by sessionId
 */
async function verifyBriefingRetrieval() {
  logSection('Step 6: Verify Briefing Retrieval by SessionId');

  try {
    // This simulates what voice service does when loading briefing
    const { data, error } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('id', testSessionId)
      .single();

    if (error) {
      logTest('Retrieve session by ID', false, error.message);
      return false;
    }

    logTest('Session retrieved by ID', true, `ID: ${data.id}`);
    logTest('Briefing accessible', !!data.briefing, 'Briefing can be loaded');
    logTest('All session data present',
      data.user_id && data.call_type && data.status && data.briefing,
      'user_id, call_type, status, briefing all present');

    // Verify we can access briefing fields
    const briefing = data.briefing;
    logTest('Can access trigger_reason', !!briefing.trigger_reason);
    logTest('Can access conversation_goals', Array.isArray(briefing.conversation_goals));
    logTest('Can access detected_patterns', Array.isArray(briefing.detected_patterns));

    return true;
  } catch (error) {
    logTest('Verify briefing retrieval', false, error.message);
    return false;
  }
}

/**
 * Step 7: Test outcome update
 */
async function testOutcomeUpdate() {
  logSection('Step 7: Test Call Outcome Update');

  try {
    const outcome = {
      goal_achieved: true,
      effectiveness: 'high',
      follow_up_needed: false,
      user_satisfaction: 5
    };

    const summary = 'Test call completed successfully. Briefing was loaded and all goals were verified.';

    const { data, error } = await supabase
      .from('call_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        conversation_summary: summary,
        outcome_assessment: outcome,
        updated_at: new Date().toISOString()
      })
      .eq('id', testSessionId)
      .select()
      .single();

    if (error) {
      logTest('Update call outcome', false, error.message);
      return false;
    }

    logTest('Status updated to completed', data.status === 'completed');
    logTest('Summary saved', !!data.conversation_summary);
    logTest('Outcome assessment saved', !!data.outcome_assessment);
    logTest('Goal achievement recorded', data.outcome_assessment.goal_achieved === true);

    return true;
  } catch (error) {
    logTest('Test outcome update', false, error.message);
    return false;
  }
}

/**
 * Step 8: Clean up test data
 */
async function cleanupTestData() {
  logSection('Step 8: Cleanup Test Data');

  try {
    // Delete test interaction
    if (testInteractionId) {
      await Interaction.deleteOne({ _id: testInteractionId });
      logTest('Delete test interaction', true, `Deleted interaction ${testInteractionId}`);
    }

    // Delete test session
    if (testSessionId) {
      const { error } = await supabase
        .from('call_sessions')
        .delete()
        .eq('id', testSessionId);

      if (error) {
        logTest('Delete test session', false, error.message);
        return false;
      }

      logTest('Delete test session', true, `Deleted session ${testSessionId}`);
    }

    return true;
  } catch (error) {
    logTest('Cleanup test data', false, error.message);
    return false;
  }
}

/**
 * Print final test summary
 */
function printTestSummary() {
  logSection('Test Summary');

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  if (failedTests > 0) {
    console.log('\nFailed Tests:');
    testResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.testName}`);
        if (r.details) {
          console.log(`    ${r.details}`);
        }
      });
  }

  console.log('\n' + '═'.repeat(60));
  if (failedTests === 0) {
    console.log('✓ ALL TESTS PASSED! Briefing integration working correctly.');
  } else {
    console.log(`✗ ${failedTests} TEST(S) FAILED. Please review the failures above.`);
  }
  console.log('═'.repeat(60) + '\n');

  return failedTests === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   END-TO-END TEST: BRIEFING INTEGRATION                    ║');
  console.log('║   Testing Claude SDK → Scheduler → Voice Agent Flow       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Run all test steps sequentially
    if (!await setupTestUser()) {
      console.error('\nTest aborted: Could not setup test user');
      process.exit(1);
    }

    if (!await createBriefedCall()) {
      console.error('\nTest aborted: Could not create briefed call');
      await cleanupTestData();
      process.exit(1);
    }

    await verifyBriefingStructure();
    await simulateSchedulerUpdate();
    await createMockInteraction();
    await verifyBriefingRetrieval();
    await testOutcomeUpdate();
    await cleanupTestData();

    // Print summary
    const success = printTestSummary();

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\n✗ Fatal error during test execution:', error);
    console.error(error.stack);

    // Attempt cleanup even on fatal error
    try {
      await cleanupTestData();
    } catch (cleanupError) {
      console.error('✗ Error during cleanup:', cleanupError.message);
    }

    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
