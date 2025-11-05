#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_USER_ID = '5899f756-7e21-4ef2-a6f6-9b13e43efba5';

console.log('Inserting test interaction...');

const { data, error } = await supabase
  .from('interactions')
  .insert({
    user_id: TEST_USER_ID,
    call_type: 'motivational-wakeup',
    transcript: "TEST: This is a diagnostic test interaction for Realtime verification.",
    duration_seconds: 10
  })
  .select()
  .single();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('✓ Inserted interaction:', data.id);
console.log('Check the diagnostic listener for the event!\n');
process.exit(0);
