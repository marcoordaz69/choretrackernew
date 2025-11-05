#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_USER_ID = '5899f756-7e21-4ef2-a6f6-9b13e43efba5';

console.log('\n[REALTIME TEST] Inserting interaction to trigger Realtime subscription...\n');

const { data, error } = await supabase
  .from('interactions')
  .insert({
    user_id: TEST_USER_ID,
    call_type: 'wind-down-reflection',
    transcript: "Hey Luna, today was really productive! I finished my presentation and it went great. I also remembered to call mom and we had a nice chat. Feeling accomplished but a bit tired. Tomorrow I need to focus on that budget report.",
    duration_seconds: 60
  })
  .select()
  .single();

if (error) {
  console.error('[REALTIME TEST] Error:', error);
  process.exit(1);
}

console.log('[REALTIME TEST] ✓ Interaction created:', data.id);
console.log('[REALTIME TEST] ✓ Realtime should trigger orchestrator processing...');
console.log('[REALTIME TEST] Check the orchestrator logs (node index.js) for processing output\n');

// Wait a moment to see if processing happens
console.log('[REALTIME TEST] Waiting 20 seconds for processing...\n');
await new Promise(resolve => setTimeout(resolve, 20000));

// Check results
const { data: calls } = await supabase
  .from('scheduled_calls')
  .select('*')
  .eq('user_id', TEST_USER_ID)
  .order('created_at', { ascending: false })
  .limit(3);

console.log('\n[REALTIME TEST] Recent scheduled calls:');
if (calls && calls.length > 0) {
  calls.forEach(call => {
    console.log(`  - ${call.call_type} for ${call.scheduled_for}`);
    console.log(`    Reason: ${call.reason?.substring(0, 80)}...`);
  });
} else {
  console.log('  (none - check orchestrator logs for errors)');
}

const { data: user } = await supabase
  .from('users')
  .select('insights')
  .eq('id', TEST_USER_ID)
  .single();

console.log('\n[REALTIME TEST] User insights updated:');
if (user?.insights) {
  console.log(`  Goals: ${user.insights.goals?.length || 0}`);
  console.log(`  Patterns: ${user.insights.patterns?.length || 0}`);
  console.log(`  Last updated: ${user.insights.lastUpdated}`);
} else {
  console.log('  (none - check orchestrator logs for errors)');
}

console.log('\n[REALTIME TEST] Test complete.\n');
process.exit(0);
