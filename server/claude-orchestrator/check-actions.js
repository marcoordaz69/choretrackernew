import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data, error } = await supabase
  .from('sdk_actions')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('Error:', error);
} else {
  console.log('\nRecent SDK actions:');
  data.forEach(action => {
    console.log(`\n- ${action.action_type} at ${action.created_at}`);
    console.log(`  Tool: ${action.tool_name}`);
    console.log(`  Status: ${action.status}`);
    if (action.error_message) console.log(`  Error: ${action.error_message}`);
  });
  
  if (data.length === 0) {
    console.log('  (no actions logged)');
  }
}

process.exit(0);
