#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('Enabling Supabase Realtime for interactions table...');

const { data, error } = await supabase.rpc('exec_sql', {
  sql: 'ALTER TABLE interactions REPLICA IDENTITY FULL;'
});

if (error) {
  // Try direct SQL execution via admin API
  console.log('Trying direct SQL execution...');

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({
      query: 'ALTER TABLE interactions REPLICA IDENTITY FULL;'
    })
  });

  if (!response.ok) {
    console.error('Failed to execute SQL:', await response.text());
    console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
    console.log('ALTER TABLE interactions REPLICA IDENTITY FULL;');
    process.exit(1);
  }
}

console.log('✓ Realtime enabled for interactions table');
process.exit(0);
