#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('\n[DIAGNOSTIC] Testing Supabase Realtime subscription...\n');

const channel = supabase
  .channel('test-interactions')
  .on(
    'postgres_changes',
    {
      event: '*',  // Listen to all events
      schema: 'public',
      table: 'interactions'
    },
    (payload) => {
      console.log('\n[EVENT RECEIVED]');
      console.log('Event:', payload.eventType);
      console.log('Table:', payload.table);
      console.log('Schema:', payload.schema);
      console.log('Data:', JSON.stringify(payload.new || payload.old, null, 2));
      console.log('---\n');
    }
  )
  .subscribe((status, err) => {
    console.log('[SUBSCRIPTION STATUS]', status);
    if (err) {
      console.error('[SUBSCRIPTION ERROR]', err);
    }

    if (status === 'SUBSCRIBED') {
      console.log('✓ Successfully subscribed to interactions table');
      console.log('\nWaiting for events... (insert a row in another terminal)\n');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('✗ Channel error - Realtime may not be enabled');
      process.exit(1);
    } else if (status === 'TIMED_OUT') {
      console.error('✗ Connection timed out');
      process.exit(1);
    }
  });

// Keep alive
console.log('Press Ctrl+C to exit...\n');
