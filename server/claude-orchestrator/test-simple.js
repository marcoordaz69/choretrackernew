#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { processCallCompletion } from './processors/callCompletionProcessor.js';
import { choreTrackerServer } from './mcp-servers/choreTracker.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_USER_ID = '5899f756-7e21-4ef2-a6f6-9b13e43efba5';

async function runTest() {
  console.log('\n[TEST] Creating test interaction...');

  const { data, error } = await supabase
    .from('interactions')
    .insert({
      user_id: TEST_USER_ID,
      call_type: 'motivational-wakeup',
      transcript: "Good morning Luna! I'm feeling a bit overwhelmed with my tasks today. I have that big presentation at work and I haven't finished preparing. Also need to pick up groceries and call mom back.",
      duration_seconds: 45
    })
    .select()
    .single();

  if (error) {
    console.error('[TEST] Error:', error);
    return;
  }

  console.log('[TEST] ✓ Interaction created:', data.id);
  console.log('[TEST] Directly invoking processor...\n');

  // Directly call the processor (bypassing Realtime for testing)
  try {
    const mcpServers = [choreTrackerServer];
    await processCallCompletion(data, mcpServers);
    console.log('\n[TEST] ✓ Processing complete');
  } catch (error) {
    console.error('\n[TEST] ✗ Processing failed:', error.message);
  }

  // Check for scheduled calls
  const { data: calls } = await supabase
    .from('scheduled_calls')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n[TEST] Recent scheduled calls:');
  if (calls && calls.length > 0) {
    calls.forEach(call => {
      console.log(`  - ${call.call_type} scheduled for ${call.scheduled_for}`);
      console.log(`    Reason: ${call.reason}`);
    });
  } else {
    console.log('  (none yet)');
  }

  // Check for insights
  const { data: user } = await supabase
    .from('users')
    .select('insights')
    .eq('id', TEST_USER_ID)
    .single();

  console.log('\n[TEST] User insights:');
  if (user?.insights) {
    console.log(JSON.stringify(user.insights, null, 2));
  } else {
    console.log('  (none yet)');
  }

  console.log('\n[TEST] Test complete.\n');
  process.exit(0);
}

runTest().catch(error => {
  console.error('[TEST] Fatal error:', error);
  process.exit(1);
});
