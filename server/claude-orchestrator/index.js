import 'dotenv/config';
import { choreTrackerServer } from './mcp-servers/choreTracker.js';
import { subscribeToCallCompletions } from './subscribers/callCompletionSubscriber.js';
import { processCallCompletion } from './processors/callCompletionProcessor.js';

console.log('Claude Orchestrator starting...');
console.log('Environment:', process.env.NODE_ENV);

// Verify environment variables
const required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('✓ Environment variables loaded');
console.log('✓ Chore Tracker MCP server loaded');

// Handler for call completions
async function handleCallCompletion(interaction) {
  try {
    await processCallCompletion(interaction, {
      'chore-tracker': choreTrackerServer
    });
  } catch (error) {
    console.error('[HANDLER] Processing failed:', error);
  }
}

// Subscribe to call completions
const channel = subscribeToCallCompletions(handleCallCompletion);

console.log('✓ Ready to process call completions');
console.log('\nWaiting for events...');

// Keep process alive
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await channel.unsubscribe();
  process.exit(0);
});
