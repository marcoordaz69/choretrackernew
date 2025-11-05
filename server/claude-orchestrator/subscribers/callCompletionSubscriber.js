import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Subscribe to new interaction records (call completions)
 * Triggers SDK agent analysis on each new call
 */
export function subscribeToCallCompletions(onCallComplete) {
  const channel = supabase
    .channel('interactions')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'interactions'
      },
      async (payload) => {
        console.log('\n[CALL COMPLETION] New interaction detected');
        console.log('User ID:', payload.new.user_id);
        console.log('Call Type:', payload.new.call_type);
        console.log('Interaction ID:', payload.new.id);

        try {
          await onCallComplete(payload.new);
        } catch (error) {
          console.error('[CALL COMPLETION] Handler error:', error);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✓ Subscribed to call completion events');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('✗ Subscription error');
      } else if (status === 'TIMED_OUT') {
        console.error('✗ Subscription timed out');
      }
    });

  return channel;
}

export default subscribeToCallCompletions;
