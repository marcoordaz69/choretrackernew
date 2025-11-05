import 'dotenv/config';

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
console.log('✓ Ready to start orchestration service');
