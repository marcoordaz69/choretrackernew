import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { choreTrackerServer } from './mcp-servers/choreTracker.js';

async function* testPrompt() {
  yield {
    type: 'user',
    message: {
      role: 'user',
      content: 'Test message. Please use the update_user_insights tool to record that the user likes testing.'
    }
  };
}

console.log('Testing tool availability...\n');

for await (const message of query({
  prompt: testPrompt(),
  options: {
    mcpServers: [choreTrackerServer],
    systemPrompt: 'You must use the update_user_insights tool. The userId is "5899f756-7e21-4ef2-a6f6-9b13e43efba5".',
    maxTurns: 3,
    model: 'claude-sonnet-4-5'
  }
})) {
  console.log('Message type:', message.type);
  console.log('Message keys:', Object.keys(message));
  console.log('Message:', JSON.stringify(message, null, 2).substring(0, 500));
  console.log('---\n');
}

process.exit(0);
